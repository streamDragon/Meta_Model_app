import {
    ensureSession,
    onAuthSessionChange,
    getAccessToken,
    upgradeAnonymousWithEmailPassword,
    linkGoogleIdentity,
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

const freemiumState = {
    initialized: false,
    isBusy: false
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

function updateStatusBar(entitlements) {
    const bar = ensureStatusBar();
    const roleEl = bar.querySelector('[data-freemium-role]');
    const meterEl = bar.querySelector('[data-freemium-meter]');
    const actionBtn = bar.querySelector('[data-freemium-action-primary]');
    const guestBanner = bar.querySelector('[data-freemium-guest-banner]');

    const role = String(entitlements?.role || 'guest');
    if (roleEl) roleEl.textContent = mapRoleToHebrew(role);
    if (meterEl) meterEl.textContent = meterText(entitlements);
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
    onEmailUpgrade: async (email, password) => {
        await upgradeAnonymousWithEmailPassword(email, password);
        await refreshEntitlements({ force: true });
    },
    onGoogleLink: async () => {
        await linkGoogleIdentity();
    },
    onSwitchToExisting: async () => {
        await switchToGoogleSignIn();
    },
    onCheckoutPlan: async (plan) => {
        await createCheckout(plan);
    }
});

async function refreshAll(force = false) {
    await ensureSession();
    const entitlements = await refreshEntitlements({ force });
    updateStatusBar(entitlements);
    AdsProvider.init(entitlements);
    return entitlements;
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
            updateStatusBar(result.entitlements);
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
        bindStatusBarActions();
        bindModalAdsSync();
        exposeApi();

        onAuthSessionChange(() => {
            refreshAll(true).catch(() => {});
        });

        onEntitlementsChange((entitlements) => {
            if (!entitlements) return;
            updateStatusBar(entitlements);
            AdsProvider.init(entitlements);
        });

        handleStripeReturn();
        await refreshAll(true);
    } catch (error) {
        console.warn('[freemium] init failed', error);
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
