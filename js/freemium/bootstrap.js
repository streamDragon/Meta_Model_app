import {
    ensureSession,
    onAuthSessionChange,
    getAccessToken,
    signInWithEmailOtp,
    switchToGoogleSignIn,
    signOutNonGuest,
    getAuthSnapshot
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
const GUEST_FREE_LIMIT = 10;
const FREE_PACK_TOTAL = 60;
const FREEMIUM_TEST_BYPASS = true;
const AUTH_REQUIRED_SELECTORS = [
    '[data-auth-required-overlay]',
    '[data-auth-required]',
    '.auth-required-overlay',
    '#auth-required-overlay'
];
const AUTH_HASH_KEYS = [
    'access_token',
    'refresh_token',
    'expires_at',
    'expires_in',
    'token_type',
    'id_token',
    'provider_token',
    'provider_refresh_token',
    'type'
];
const DEBUG_ROUTE_ID = 'debug';
const DEBUG_LOG_ID = 'freemium-debug-log';
const DEBUG_GUEST_USED_KEY = 'guest_used';

const freemiumState = {
    initialized: false,
    bootstrapPromise: null,
    isBusy: false,
    refreshPromise: null,
    pendingRefreshOptions: null,
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
    remaining: 0,
    lastDebugRequestId: '',
    debugBound: false
};

function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function createGuestUiEntitlements() {
    return {
        role: 'guest',
        plan: 'guest',
        ads_enabled: true,
        total_quota: GUEST_FREE_LIMIT,
        guest_daily_limit: GUEST_FREE_LIMIT,
        guest_daily_used_today: 0,
        guest_daily_remaining: GUEST_FREE_LIMIT,
        free_total_limit: FREE_PACK_TOTAL,
        free_total_used: 0,
        free_total_remaining: FREE_PACK_TOTAL,
        remaining: GUEST_FREE_LIMIT,
        daily_limit: GUEST_FREE_LIMIT,
        unlimited: false
    };
}

function isFreemiumTestingBypassEnabled() {
    return FREEMIUM_TEST_BYPASS === true;
}

function createTestingUiEntitlements() {
    return {
        role: 'pro',
        plan: 'pro',
        ads_enabled: false,
        total_quota: FREE_PACK_TOTAL,
        guest_daily_limit: GUEST_FREE_LIMIT,
        guest_daily_used_today: 0,
        guest_daily_remaining: GUEST_FREE_LIMIT,
        free_total_limit: FREE_PACK_TOTAL,
        free_total_used: 0,
        free_total_remaining: FREE_PACK_TOTAL,
        remaining: FREE_PACK_TOTAL,
        daily_limit: FREE_PACK_TOTAL,
        unlimited: true,
        testing_bypass: true
    };
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
    const total = Math.max(0, Number(entitlements.total_quota ?? entitlements.daily_limit ?? (entitlements.role === 'guest' ? GUEST_FREE_LIMIT : FREE_PACK_TOTAL)) || 0);
    const remainingValue = (entitlements.remaining ?? (entitlements.role === 'guest' ? entitlements.guest_daily_remaining : entitlements.free_total_remaining)) || 0;
    const remaining = Math.max(0, Number(remainingValue));
    return `נותרו ${remaining} מתוך ${total}`;
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
            closeModalIfEligible: Boolean(forceOrOptions.closeModalIfEligible),
            reason: String(forceOrOptions.reason || '').trim() || 'manual'
        };
    }
    return {
        force: Boolean(forceOrOptions),
        closeModalIfEligible: false,
        reason: 'manual'
    };
}

function mergeRefreshOptions(current, next) {
    if (!current) return Object.assign({}, next);
    return {
        force: Boolean(current.force || next.force),
        closeModalIfEligible: Boolean(current.closeModalIfEligible || next.closeModalIfEligible),
        reason: String(next.reason || current.reason || 'manual')
    };
}

function stripAuthHashTokens() {
    const hash = String(window.location.hash || '');
    if (!hash || hash === '#') return false;

    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const hasAuthArtifacts = AUTH_HASH_KEYS.some((key) => params.has(key));
    if (!hasAuthArtifacts) return false;

    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState({}, document.title, cleanUrl);
    return true;
}

function createQuotaRequestId(source = 'ui') {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return globalThis.crypto.randomUUID();
    }
    const segment = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
    return `${segment()}${segment()}-${segment()}-4${segment().slice(1)}-a${segment().slice(1)}-${segment()}${segment()}${segment()}`;
}

function isDebugModeEnabled() {
    const params = new URLSearchParams(window.location.search || '');
    return params.get('debug') === '1';
}

function getDebugRoot() {
    return document.getElementById(DEBUG_ROUTE_ID);
}

function readGuestUsedCounter() {
    const raw = String(localStorage.getItem(DEBUG_GUEST_USED_KEY) || '').trim();
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) return 0;
    return Math.floor(parsed);
}

function updateDebugSnapshot() {
    const root = getDebugRoot();
    if (!root) return;

    const auth = getAuthSnapshot();
    const ent = isFreemiumTestingBypassEnabled()
        ? createTestingUiEntitlements()
        : getEntitlementsSnapshot();
    const signedIn = String(auth?.status || '') === 'authenticated' ? 'yes' : 'no';
    const email = String(auth?.email || '').trim() || '-';
    const userId = String(auth?.user?.id || '').trim() || '-';

    const plan = String(ent?.plan || ent?.role || 'guest');
    const remaining = Number.isFinite(Number(ent?.remaining)) ? Number(ent?.remaining) : 0;
    const total = Number.isFinite(Number(ent?.total_quota)) ? Number(ent?.total_quota) : 0;

    const setText = (id, value) => {
        const node = document.getElementById(id);
        if (node) node.textContent = String(value);
    };

    setText('freemium-debug-signed-in', signedIn);
    setText('freemium-debug-email', email);
    setText('freemium-debug-user-id', userId);
    setText('freemium-debug-plan', plan);
    setText('freemium-debug-remaining', remaining);
    setText('freemium-debug-total', total);
    setText('freemium-debug-guest-used', readGuestUsedCounter());
}

function appendDebugLog(message) {
    const logNode = document.getElementById(DEBUG_LOG_ID);
    if (!logNode) return;
    const stamp = new Date().toISOString();
    const line = `[${stamp}] ${String(message || '').trim()}`;
    const current = String(logNode.textContent || '').trim();
    logNode.textContent = current ? `${current}\n${line}` : line;
    logNode.scrollTop = logNode.scrollHeight;
}

async function runDebugConsume(count = 1, requestId = '', source = 'debug') {
    const normalizedCount = Math.max(1, Math.min(100, Math.floor(Number(count) || 1)));
    const normalizedRequestId = String(requestId || '').trim() || createQuotaRequestId(source);
    if (isFreemiumTestingBypassEnabled()) {
        freemiumState.lastDebugRequestId = normalizedRequestId;
        appendDebugLog(`consume count=${normalizedCount} request_id=${normalizedRequestId} rpc=testing_bypass ok=true reason=testing_bypass remaining=unlimited`);
        updateDebugSnapshot();
        return {
            ok: true,
            reason: 'testing_bypass',
            rpc: 'testing_bypass',
            entitlements: createTestingUiEntitlements()
        };
    }
    const result = await consumeSentence({
        count: normalizedCount,
        requestId: normalizedRequestId,
        source
    });
    freemiumState.lastDebugRequestId = normalizedRequestId;
    const rpcName = String(result?.rpc || '').trim() || (String(result?.entitlements?.role || '') === 'guest' ? 'consume_guest_quota' : 'consume_quota');
    appendDebugLog(`consume count=${normalizedCount} request_id=${normalizedRequestId} rpc=${rpcName} ok=${Boolean(result?.ok)} reason=${String(result?.reason || '-')} remaining=${String(result?.entitlements?.remaining ?? '-')}`);
    await refreshAll({ force: true, reason: `debug_${source}` });
    updateDebugSnapshot();
    return result;
}

function setupDebugPanel() {
    if (freemiumState.debugBound) return;
    const root = getDebugRoot();
    if (!root || !isDebugModeEnabled()) return;
    freemiumState.debugBound = true;

    root.addEventListener('click', async (event) => {
        const actionNode = event.target?.closest?.('[data-freemium-debug-action]');
        if (!actionNode) return;
        const action = String(actionNode.getAttribute('data-freemium-debug-action') || '').trim();

        try {
            if (action === 'consume-one') {
                await runDebugConsume(1, '', 'debug-single');
                return;
            }

            if (action === 'replay-last') {
                const requestId = String(freemiumState.lastDebugRequestId || '').trim();
                if (!requestId) {
                    appendDebugLog('replay skipped: no last request_id');
                    return;
                }
                await runDebugConsume(1, requestId, 'debug-replay');
                return;
            }

            if (action === 'consume-five-parallel') {
                const requestIds = Array.from({ length: 5 }, () => createQuotaRequestId('debug-parallel'));
                freemiumState.lastDebugRequestId = requestIds[requestIds.length - 1];
                const results = await Promise.all(requestIds.map((requestId) => consumeSentence({
                    count: 1,
                    requestId,
                    source: 'debug-parallel'
                })));
                const allowedCount = results.filter((item) => item?.ok).length;
                const reasons = results.map((item) => String(item?.reason || '-')).join(', ');
                const rpcNames = Array.from(new Set(results.map((item) => String(item?.rpc || '').trim()).filter(Boolean))).join('|') || 'consume_quota';
                appendDebugLog(`consume parallel count=5 rpc=${rpcNames} allowed=${allowedCount}/5 reasons=[${reasons}] request_ids=${requestIds.join(',')}`);
                await refreshAll({ force: true, reason: 'debug_parallel' });
                updateDebugSnapshot();
                return;
            }

            if (action === 'sign-out') {
                await signOutNonGuest();
                appendDebugLog('sign_out ok');
                await refreshAll({ force: true, reason: 'debug_sign_out' });
                updateDebugSnapshot();
                return;
            }

            if (action === 'reset-guest-used') {
                localStorage.setItem(DEBUG_GUEST_USED_KEY, '0');
                appendDebugLog('localStorage guest_used reset to 0');
                updateDebugSnapshot();
            }
        } catch (error) {
            appendDebugLog(`action=${action} error=${String(error?.message || error || 'unknown_error')}`);
            updateDebugSnapshot();
        }
    });

    updateDebugSnapshot();
    appendDebugLog('debug panel initialized');
}

function ensureStatusBar() {
    if (isFreemiumTestingBypassEnabled()) return null;

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
            התחבר עם Google כדי לשמור התקדמות ולקבל חבילת תרגול חינמית של 60 משפטים
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
        await refreshAll({ force: true, reason: 'retry' });
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
    if (isFreemiumTestingBypassEnabled()) {
        const row = createTestingUiEntitlements();
        freemiumState.currentRole = String(row.role || 'pro');
        freemiumState.remaining = Number.POSITIVE_INFINITY;
        const existingBar = document.getElementById(STATUS_BAR_ID);
        if (existingBar) existingBar.remove();
        const existingBanner = document.getElementById(ERROR_BANNER_ID);
        if (existingBanner) existingBanner.classList.add('hidden');
        document.documentElement.setAttribute('data-freemium-test-bypass', '1');
        document.body.classList.add('freemium-test-bypass');
        return row;
    }

    const bar = ensureStatusBar();
    const roleEl = bar.querySelector('[data-freemium-role]');
    const meterEl = bar.querySelector('[data-freemium-meter]');
    const authLabelEl = bar.querySelector('[data-freemium-auth-label]');
    const actionBtn = bar.querySelector('[data-freemium-action-primary]');
    const guestBanner = bar.querySelector('[data-freemium-guest-banner]');

    const row = entitlements || createGuestUiEntitlements();
    const role = String(row?.role || 'guest');
    const remaining = resolveRemaining(row);
    freemiumState.currentRole = role;
    freemiumState.remaining = remaining;

    if (roleEl) roleEl.textContent = mapRoleToHebrew(role);
    if (meterEl) meterEl.textContent = meterText(row);
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
    if (isFreemiumTestingBypassEnabled()) return;

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
    if (isFreemiumTestingBypassEnabled()) return;

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

async function runRefresh(options = {}) {
    if (isFreemiumTestingBypassEnabled()) {
        const entitlements = updateStatusBar(createTestingUiEntitlements(), freemiumState.authState);
        hideEntitlementsError();
        paywallUi.closeModal();
        AdsProvider.disable();
        setGuestReadyState(true);
        unlockAuthRequiredUi();
        updateDebugSnapshot();
        return entitlements;
    }

    await ensureSession();
    const entitlements = await refreshEntitlements({
        force: Boolean(options.force),
        reason: String(options.reason || 'manual')
    });

    hideEntitlementsError();
    updateStatusBar(entitlements, freemiumState.authState);
    if (options.closeModalIfEligible && shouldClosePaywallForAuth(entitlements)) {
        paywallUi.closeModal();
    }

    AdsProvider.init(entitlements);
    setGuestReadyState(true);
    unlockAuthRequiredUi();

    return entitlements;
}

async function refreshAll(forceOrOptions = false) {
    const options = normalizeRefreshOptions(forceOrOptions);
    freemiumState.pendingRefreshOptions = mergeRefreshOptions(freemiumState.pendingRefreshOptions, options);

    if (freemiumState.refreshPromise) {
        return freemiumState.refreshPromise;
    }

    freemiumState.refreshPromise = (async () => {
        let lastEntitlements = isFreemiumTestingBypassEnabled()
            ? createTestingUiEntitlements()
            : (getEntitlementsSnapshot() || createGuestUiEntitlements());
        while (freemiumState.pendingRefreshOptions) {
            const nextRefresh = freemiumState.pendingRefreshOptions;
            freemiumState.pendingRefreshOptions = null;
            lastEntitlements = await runRefresh(nextRefresh);
        }
        return lastEntitlements;
    })();

    try {
        return await freemiumState.refreshPromise;
    } catch (error) {
        showEntitlementsError(error, async () => {
            await refreshAll({ force: true, reason: 'retry_after_error' });
        });
        return isFreemiumTestingBypassEnabled()
            ? createTestingUiEntitlements()
            : (getEntitlementsSnapshot() || createGuestUiEntitlements());
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
    if (!bar) return;
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
    if (isFreemiumTestingBypassEnabled()) {
        updateStatusBar(createTestingUiEntitlements(), freemiumState.authState);
        AdsProvider.disable();
        return true;
    }

    if (freemiumState.isBusy) return false;

    const count = Math.max(1, Math.min(100, Math.floor(Number(options.count) || 1)));
    const source = String(options.source || 'app').trim() || 'app';
    const requestId = String(options.requestId || '').trim() || createQuotaRequestId(source);

    freemiumState.isBusy = true;
    try {
        let result = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
                result = await consumeSentence({ count, source, requestId });
                break;
            } catch (error) {
                if (attempt === 0) {
                    continue;
                }
                throw error;
            }
        }

        if (!result) return false;

        if (result.ok) {
            updateStatusBar(result.entitlements, freemiumState.authState);
            AdsProvider.init(result.entitlements);
            return true;
        }

        const reason = String(result.reason || '').toLowerCase();
        if (reason === 'not_authenticated') {
            paywallUi.openGuestAuthModal();
            return false;
        }

        if (reason === 'guest_quota') {
            paywallUi.openGuestQuotaEndedModal();
            return false;
        }

        if (reason === 'free_quota') {
            paywallUi.openFreeQuotaEndedModal();
            return false;
        }

        return false;
    } catch (error) {
        console.warn('[freemium] consumeSentence failed', error);
        paywallUi.showToast('שגיאה זמנית בצריכת מכסה. נסו שוב.', 'warn');
        return false;
    } finally {
        freemiumState.isBusy = false;
    }
}

function exposeApi() {
    window.MetaFreemium = {
        refreshEntitlements: async (force = true) => refreshAll({ force: Boolean(force), reason: 'api_refresh' }),
        bootstrapAuth: async (reason = 'api_bootstrap') => bootstrapAuth(reason),
        getEntitlements: () => isFreemiumTestingBypassEnabled()
            ? createTestingUiEntitlements()
            : getEntitlementsSnapshot(),
        getAuthSnapshot: () => getAuthSnapshot(),
        consumeSentenceOrPrompt,
        debugConsume: async (options = {}) => {
            const count = Math.max(1, Math.min(100, Math.floor(Number(options?.count || 1) || 1)));
            const requestId = String(options?.requestId || '').trim();
            const source = String(options?.source || 'debug-api').trim() || 'debug-api';
            return runDebugConsume(count, requestId, source);
        },
        getLastDebugRequestId: () => String(freemiumState.lastDebugRequestId || ''),
        openGuestLoginModal: () => {
            if (isFreemiumTestingBypassEnabled()) return false;
            paywallUi.openGuestAuthModal();
            return true;
        },
        openUpgradeModal: () => {
            if (isFreemiumTestingBypassEnabled()) return false;
            paywallUi.openFreeQuotaEndedModal();
            return true;
        },
        showLockedPreview: (items = []) => paywallUi.openLockedPreviewModal(items),
        showToast: (text, tone = 'info') => paywallUi.showToast(String(text || ''), tone),
        openPortal: async () => {
            if (isFreemiumTestingBypassEnabled()) return false;
            return openPortal();
        },
        signOut: async () => signOutNonGuest()
    };
}

function bindModalAdsSync() {
    if (isFreemiumTestingBypassEnabled()) {
        AdsProvider.disable();
        return;
    }
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
        exposeApi();
        setupDebugPanel();

        if (isFreemiumTestingBypassEnabled()) {
            updateStatusBar(createTestingUiEntitlements(), freemiumState.authState);
            hideEntitlementsError();
            paywallUi.closeModal();
            AdsProvider.disable();
            setGuestReadyState(true);
            unlockAuthRequiredUi();
            updateDebugSnapshot();
            return;
        }

        bindStatusBarActions();
        bindModalAdsSync();
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
            updateDebugSnapshot();

            const nextUserId = String(snapshot?.user?.id || '');
            const authEvent = String(snapshot?.lastEvent || '');
            const refreshKey = `${authEvent}|${nextUserId}|${Number(snapshot?.lastEventAt || 0)}`;
            if (refreshKey === freemiumState.lastAuthRefreshKey) return;
            freemiumState.lastAuthRefreshKey = refreshKey;

            const userChanged = nextUserId !== freemiumState.lastAuthUserId;
            freemiumState.lastAuthUserId = nextUserId;

            const isSignInLike = authEvent === 'SIGNED_IN' || authEvent === 'TOKEN_REFRESHED';
            const isSignedOut = authEvent === 'SIGNED_OUT';

            if (isSignInLike) {
                stripAuthHashTokens();
            }

            if (isSignedOut) {
                paywallUi.closeModal();
                updateStatusBar(createGuestUiEntitlements(), freemiumState.authState);
                setGuestReadyState(false);
            }

            const shouldRefresh = userChanged || isSignInLike || isSignedOut;
            if (!shouldRefresh) return;

            const closeModalIfEligible = isSignInLike || userChanged;
            refreshAll({
                force: true,
                closeModalIfEligible,
                reason: authEvent || 'auth_state_change'
            }).catch((error) => {
                showEntitlementsError(error);
            });
        });

        onEntitlementsChange((entitlements) => {
            if (!entitlements) return;
            updateStatusBar(entitlements, freemiumState.authState);
            AdsProvider.init(entitlements);
            updateDebugSnapshot();
        });

        handleStripeReturn();
    } catch (error) {
        console.warn('[freemium] init failed', error);
        showEntitlementsError(error, async () => {
            await refreshAll({ force: true, reason: 'init_retry' });
        });
        const bar = ensureStatusBar();
        const meter = bar?.querySelector('[data-freemium-meter]');
        if (meter) {
            meter.innerHTML = `<span class="freemium-error">${escapeHtml(error?.message || 'לא זמין')}</span>`;
        }
    }
}

export async function bootstrapAuth(reason = 'bootstrap') {
    if (freemiumState.bootstrapPromise) return freemiumState.bootstrapPromise;

    freemiumState.bootstrapPromise = (async () => {
        await initializeFreemium();
        await refreshAll({ force: true, reason: String(reason || 'bootstrap') });
        return isFreemiumTestingBypassEnabled()
            ? createTestingUiEntitlements()
            : (getEntitlementsSnapshot() || createGuestUiEntitlements());
    })();

    try {
        return await freemiumState.bootstrapPromise;
    } catch (error) {
        freemiumState.bootstrapPromise = null;
        throw error;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        bootstrapAuth('dom_ready').catch((error) => {
            console.warn('[freemium] bootstrap failed', error);
        });
    }, { once: true });
} else {
    bootstrapAuth('immediate').catch((error) => {
        console.warn('[freemium] bootstrap failed', error);
    });
}
