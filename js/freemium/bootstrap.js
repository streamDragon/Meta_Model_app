import {
    ensureSession,
    onAuthSessionChange,
    getAccessToken,
    signInWithEmailOtp,
    switchToGoogleSignIn
} from './auth-session.js';
import {
    refreshEntitlements,
    consumeSentence,
    getEntitlementsSnapshot,
    onEntitlementsChange
} from './entitlements-client.js';
import { createPaywallUi } from './paywall-ui.js';
import { AdsProvider } from './ads-provider.js';

const STATUS_BAR_ID = 'freemium-status-bar';
const ERROR_BANNER_ID = 'freemium-error-banner';
const AUTH_REQUIRED_SELECTORS = [
    '[data-auth-required-overlay]',
    '[data-auth-required]',
    '.auth-required-overlay',
    '#auth-required-overlay'
];

const freemiumState = {
    initialized: false,
    isBusy: false,
    refreshPromise: null,
    retryHandler: null,
    lastAuthUserId: '',
    lastAuthRefreshKey: '',
    authState: {
        status: 'loading',
        session: null,
        user: null,
        isGuest: true,
        email: ''
    },
    currentRole: 'guest',
    remaining: 0
};

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function mapRoleToHebrew(role) {
    const normalized = String(role || '').toLowerCase();
    if (normalized === 'pro') return 'פרו';
    if (normalized === 'free') return 'חינם';
    return 'אורח';
}

function meterText(entitlements) {
    if (!entitlements) return '...';
    if (entitlements.role === 'pro' || entitlements.unlimited) return 'ללא הגבלה';
    if (entitlements.role === 'free') {
        return `נותרו ${entitlements.free_total_remaining} מתוך ${entitlements.free_total_limit}`;
    }
    return `נותרו ${entitlements.guest_daily_remaining} מתוך ${entitlements.guest_daily_limit} היום`;
}

function resolveRemaining(entitlements) {
    if (!entitlements) return 0;
    if (entitlements.unlimited || entitlements.role === 'pro') return Number.POSITIVE_INFINITY;
    if (entitlements.role === 'free') return Math.max(0, Number(entitlements.free_total_remaining || 0));
    return Math.max(0, Number(entitlements.guest_daily_remaining || 0));
}

function resolveAuthLabel(authState = null) {
    const snapshot = authState || freemiumState.authState;
    if (String(snapshot?.status || '') !== 'authenticated') return 'אורח';
    const email = String(snapshot?.email || '').trim();
    return email || 'מחובר';
}

function shouldClosePaywallForAuth(entitlements) {
    const role = String(entitlements?.role || 'guest');
    const remaining = resolveRemaining(entitlements);
    return role !== 'guest' || remaining > 0;
}

function normalizeRefreshOptions(forceOrOptions = false) {
    if (typeof forceOrOptions === 'object' && forceOrOptions !== null) {
        return {
            force: Boolean(forceOrOptions.force),
            closeModalIfEligible: Boolean(forceOrOptions.closeModalIfEligible)
        };
    }
    return {
        force: Boolean(forceOrOptions),
        closeModalIfEligible: false
    };
}

function ensureStatusBar() {
    let bar = document.getElementById(STATUS_BAR_ID);
    if (bar) return bar;

    bar = document.createElement('div');
    bar.id = STATUS_BAR_ID;
    bar.className = 'freemium-status-bar';
    bar.innerHTML = `
        <div class="freemium-status-main">
            <span class="freemium-role-badge" data-freemium-role>אורח</span>
            <span class="freemium-meter" data-freemium-meter>...</span>
        </div>
        <div class="freemium-status-meta">
            <span class="freemium-auth-label" data-freemium-auth-label>אורח</span>
        </div>
        <div class="freemium-status-actions">
            <button type="button" class="freemium-link-btn" data-freemium-action-primary>התחבר</button>
        </div>
        <div class="freemium-guest-banner hidden" data-freemium-guest-banner>
            אהבת? התחבר בחינם וקבל עוד משפטים היום + שמירת התקדמות
        </div>
    `;

    document.body.appendChild(bar);
    return bar;
}

function ensureErrorBanner() {
    let banner = document.getElementById(ERROR_BANNER_ID);
    if (banner) return banner;

    banner = document.createElement('div');
    banner.id = ERROR_BANNER_ID;
    banner.className = 'freemium-error-banner hidden';
    banner.innerHTML = `
        <span class="freemium-error-banner__text" data-freemium-error-text></span>
        <button type="button" class="freemium-link-btn freemium-error-banner__retry" data-freemium-error-retry>Retry</button>
    `;
    banner.addEventListener('click', async (event) => {
        const retryBtn = event.target?.closest?.('[data-freemium-error-retry]');
        if (!retryBtn || !freemiumState.retryHandler) return;
        retryBtn.setAttribute('disabled', 'disabled');
        try {
            await freemiumState.retryHandler();
        } finally {
            retryBtn.removeAttribute('disabled');
        }
    });
    document.body.appendChild(banner);
    return banner;
}

function hideEntitlementsError() {
    const banner = document.getElementById(ERROR_BANNER_ID);
    if (!banner) return;
    banner.classList.add('hidden');
    freemiumState.retryHandler = null;
}

function showEntitlementsError(error, retryHandler = null) {
    const banner = ensureErrorBanner();
    const text = banner.querySelector('[data-freemium-error-text]');
    const message = String(error?.message || 'Unknown error');
    if (text) text.textContent = `Entitlements error: ${message}`;
    banner.classList.remove('hidden');
    if (paywallUi && typeof paywallUi.showToast === 'function') {
        paywallUi.showToast('Entitlements unavailable. Retry', 'warn');
    }
    freemiumState.retryHandler = async () => {
        if (typeof retryHandler === 'function') {
            await retryHandler();
            return;
        }
        await refreshAll({ force: true });
    };
}

function setGuestReadyState(isReady) {
    const ready = Boolean(isReady);
    document.documentElement.setAttribute('data-freemium-ready', ready ? '1' : '0');
    document.body.classList.toggle('freemium-ready', ready);
    document.body.classList.toggle('freemium-not-ready', !ready);
}

function unlockAuthRequiredUi() {
    AUTH_REQUIRED_SELECTORS.forEach((selector) => {
        document.querySelectorAll(selector).forEach((node) => {
            node.classList.add('hidden');
            node.setAttribute('aria-hidden', 'true');
        });
    });
    document.querySelectorAll('[data-auth-required-disabled]').forEach((node) => {
        if (node instanceof HTMLButtonElement || node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement) {
            node.disabled = false;
            return;
        }
        node.removeAttribute('disabled');
    });
    window.dispatchEvent(new CustomEvent('freemium:guest-ready', { detail: { ready: true } }));
}

function updateStatusBar(entitlements, authState = null) {
    const bar = ensureStatusBar();
    const roleEl = bar.querySelector('[data-freemium-role]');
    const meterEl = bar.querySelector('[data-freemium-meter]');
    const authLabelEl = bar.querySelector('[data-freemium-auth-label]');
    const actionBtn = bar.querySelector('[data-freemium-action-primary]');
    const guestBanner = bar.querySelector('[data-freemium-guest-banner]');

    const role = String(entitlements?.role || 'guest');
    const remaining = resolveRemaining(entitlements);
    freemiumState.currentRole = role;
    freemiumState.remaining = remaining;

    if (roleEl) roleEl.textContent = mapRoleToHebrew(role);
    if (meterEl) meterEl.textContent = meterText(entitlements);
    if (authLabelEl) authLabelEl.textContent = resolveAuthLabel(authState);
    if (guestBanner) guestBanner.classList.toggle('hidden', role !== 'guest');

    if (actionBtn) {
        if (role === 'pro') {
            actionBtn.textContent = 'ניהול מנוי';
            actionBtn.dataset.roleAction = 'portal';
        } else if (role === 'free') {
            actionBtn.textContent = 'שדרג';
            actionBtn.dataset.roleAction = 'upgrade';
        } else {
            actionBtn.textContent = 'התחבר';
            actionBtn.dataset.roleAction = 'signin';
        }
    }
}

async function fetchJson(url, options = {}) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        const err = new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
        err.status = response.status;
        throw err;
    }
    return payload;
}

async function createCheckout(plan) {
    const token = await getAccessToken();
    if (!token) throw new Error('NO_TOKEN');

    const payload = await fetchJson('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: plan === 'yearly' ? 'yearly' : 'monthly' })
    });

    if (!payload?.url) throw new Error('CHECKOUT_URL_MISSING');
    window.location.assign(payload.url);
}

async function openPortal() {
    const token = await getAccessToken();
    if (!token) throw new Error('NO_TOKEN');

    const payload = await fetchJson('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });

    if (!payload?.url) throw new Error('PORTAL_URL_MISSING');
    window.location.assign(payload.url);
}

const paywallUi = createPaywallUi({
    onEmailUpgrade: async (email) => {
        await signInWithEmailOtp(email);
    },
    onGoogleSignIn: async () => {
        await switchToGoogleSignIn();
    },
    onCheckoutPlan: async (plan) => {
        await createCheckout(plan);
    }
});

async function refreshAll(forceOrOptions = false) {
    const options = normalizeRefreshOptions(forceOrOptions);
    const force = options.force;
    if (freemiumState.refreshPromise) return freemiumState.refreshPromise;

    freemiumState.refreshPromise = (async () => {
        const session = await ensureSession();
        const entitlements = await refreshEntitlements({ force });
        hideEntitlementsError();
        updateStatusBar(entitlements, freemiumState.authState);
        if (options.closeModalIfEligible && shouldClosePaywallForAuth(entitlements)) {
            paywallUi.closeModal();
        }
        AdsProvider.init(entitlements);
        if (session?.user) {
            setGuestReadyState(true);
            unlockAuthRequiredUi();
        } else {
            setGuestReadyState(false);
        }
        return entitlements;
    })();

    try {
        return await freemiumState.refreshPromise;
    } catch (error) {
        showEntitlementsError(error, async () => {
            await refreshAll({ force: true });
        });
        return getEntitlementsSnapshot();
    } finally {
        freemiumState.refreshPromise = null;
    }
}

function handleStripeReturn() {
    const url = new URL(window.location.href);
    const stripeState = String(url.searchParams.get('stripe') || '').trim().toLowerCase();
    if (!stripeState) return;

    if (stripeState === 'success') {
        paywallUi.showProWelcomeToast();
    }

    url.searchParams.delete('stripe');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, document.title, url.toString());
}

function bindStatusBarActions() {
    const bar = ensureStatusBar();
    bar.addEventListener('click', async (event) => {
        const btn = event.target?.closest?.('[data-freemium-action-primary]');
        if (!btn) return;

        const action = String(btn.dataset.roleAction || '');
        if (action === 'signin') {
            paywallUi.openGuestAuthModal();
            return;
        }

        if (action === 'upgrade') {
            paywallUi.openFreeQuotaEndedModal();
            return;
        }

        if (action === 'portal') {
            try {
                await openPortal();
            } catch (_error) {
                paywallUi.showToast('לא הצלחנו לפתוח את ניהול המנוי כרגע.', 'warn');
            }
        }
    });
}

async function consumeSentenceOrPrompt(options = {}) {
    if (freemiumState.isBusy) return false;
    freemiumState.isBusy = true;
    try {
        const result = await consumeSentence(Number(options.count) || 1);
        if (result.ok) {
            updateStatusBar(result.entitlements, freemiumState.authState);
            AdsProvider.init(result.entitlements);
            return true;
        }

        if (result.reason === 'guest_quota') {
            paywallUi.openGuestQuotaEndedModal();
            return false;
        }

        if (result.reason === 'free_quota') {
            paywallUi.openFreeQuotaEndedModal();
            return false;
        }

        return false;
    } catch (error) {
        console.warn('[freemium] consumeSentence failed', error);
        return true;
    } finally {
        freemiumState.isBusy = false;
    }
}

function exposeApi() {
    window.MetaFreemium = {
        refreshEntitlements: async (force = true) => refreshAll(Boolean(force)),
        getEntitlements: () => getEntitlementsSnapshot(),
        consumeSentenceOrPrompt,
        openGuestLoginModal: () => paywallUi.openGuestAuthModal(),
        openUpgradeModal: () => paywallUi.openFreeQuotaEndedModal(),
        showLockedPreview: (items = []) => paywallUi.openLockedPreviewModal(items),
        showToast: (text, tone = 'info') => paywallUi.showToast(String(text || ''), tone),
        openPortal
    };
}

function bindModalAdsSync() {
    window.addEventListener('freemium:modal-state', (event) => {
        const isOpen = Boolean(event?.detail?.open);
        if (isOpen) {
            AdsProvider.disable();
            return;
        }
        AdsProvider.init(getEntitlementsSnapshot());
    });
}

async function initializeFreemium() {
    if (freemiumState.initialized) return;
    freemiumState.initialized = true;

    try {
        setGuestReadyState(false);
        bindStatusBarActions();
        bindModalAdsSync();
        exposeApi();
        ensureStatusBar();
        ensureErrorBanner();

        onAuthSessionChange((snapshot) => {
            if (!snapshot?.ready) return;

            freemiumState.authState = {
                status: String(snapshot.status || ''),
                session: snapshot.session || null,
                user: snapshot.user || null,
                isGuest: Boolean(snapshot.isGuest),
                email: String(snapshot.email || '').trim()
            };
            updateStatusBar(getEntitlementsSnapshot(), freemiumState.authState);

            const nextUserId = String(snapshot?.user?.id || '');
            const authEvent = String(snapshot?.lastEvent || '');
            const refreshKey = `${authEvent}|${nextUserId}|${Number(snapshot?.lastEventAt || 0)}`;
            if (refreshKey === freemiumState.lastAuthRefreshKey) return;
            freemiumState.lastAuthRefreshKey = refreshKey;

            const userChanged = nextUserId !== freemiumState.lastAuthUserId;
            freemiumState.lastAuthUserId = nextUserId;
            const shouldForceRefresh = userChanged || authEvent === 'SIGNED_IN' || authEvent === 'TOKEN_REFRESHED' || authEvent === 'SIGNED_OUT';
            if (!shouldForceRefresh) return;

            const closeModalIfEligible = authEvent === 'SIGNED_IN' || authEvent === 'TOKEN_REFRESHED' || userChanged;
            if (closeModalIfEligible) {
                paywallUi.closeModal();
            }

            refreshAll({ force: true, closeModalIfEligible }).catch((error) => {
                showEntitlementsError(error);
            });
        });

        onEntitlementsChange((entitlements) => {
            if (!entitlements) return;
            updateStatusBar(entitlements, freemiumState.authState);
            AdsProvider.init(entitlements);
        });

        handleStripeReturn();
        await refreshAll({ force: true });
    } catch (error) {
        console.warn('[freemium] init failed', error);
        showEntitlementsError(error, async () => {
            await refreshAll({ force: true });
        });
        const bar = ensureStatusBar();
        const meter = bar.querySelector('[data-freemium-meter]');
        if (meter) {
            meter.innerHTML = `<span class="freemium-error">${escapeHtml(error?.message || 'לא זמין')}</span>`;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initializeFreemium();
    }, { once: true });
} else {
    initializeFreemium();
}
