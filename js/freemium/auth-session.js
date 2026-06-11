import { getPublicSiteUrl, getSupabaseClient, isAnonymousUser, isSupabaseConfigured } from '../lib/supabase-client.js';

const authRuntime = {
    listenerBound: false,
    ensurePromise: null,
    oauthInFlight: false,
    otpInFlight: false,
    lastSnapshotKey: '',
    lastAuthLogKey: '',
    state: {
        status: 'loading',
        ready: false,
        session: null,
        user: null,
        roleHint: 'guest',
        isGuest: true,
        email: '',
        lastEvent: '',
        lastEventAt: 0,
        error: ''
    },
    listeners: new Set()
};

function emitAuthState() {
    const snapshot = getAuthSnapshot();
    authRuntime.listeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch (error) {
            console.warn('[freemium] auth listener failed', error);
        }
    });
}

function setAuthState(next) {
    authRuntime.state = Object.assign({}, authRuntime.state, next || {});
    emitAuthState();
}

function normalizeGuestFlag(user) {
    return isAnonymousUser(user);
}

function normalizeRoleHint(user) {
    return normalizeGuestFlag(user) ? 'guest' : 'free';
}

function normalizeAuthStatus(user, isGuest) {
    if (!user) return 'signed_out';
    if (isGuest) return 'guest';
    return 'authenticated';
}

function buildSessionSnapshotKey(session, eventName, errorText = '') {
    const user = session?.user || null;
    return [
        String(eventName || ''),
        String(errorText || ''),
        String(user?.id || ''),
        String(user?.email || ''),
        String(session?.access_token || ''),
        String(session?.expires_at || '')
    ].join('|');
}

function logAuthSnapshot(user, isGuest) {
    const userId = String(user?.id || '').trim();
    const email = String(user?.email || '').trim().toLowerCase();
    const identity = email || userId || 'none';
    const logKey = `${identity}|${isGuest ? '1' : '0'}`;
    if (logKey === authRuntime.lastAuthLogKey) return;
    authRuntime.lastAuthLogKey = logKey;
    console.info(`[auth] session user=${identity} isGuest=${isGuest}`);
}

function applySessionSnapshot(session, errorText = '', eventName = 'SESSION_SYNC') {
    const snapshotKey = buildSessionSnapshotKey(session, eventName, errorText);
    if (snapshotKey === authRuntime.lastSnapshotKey) return;
    authRuntime.lastSnapshotKey = snapshotKey;

    const user = session?.user || null;
    const isGuest = normalizeGuestFlag(user);
    const email = String(user?.email || '').trim().toLowerCase();
    setAuthState({
        status: normalizeAuthStatus(user, isGuest),
        ready: true,
        session,
        user,
        roleHint: normalizeRoleHint(user),
        isGuest,
        email,
        lastEvent: String(eventName || ''),
        lastEventAt: Date.now(),
        error: errorText || ''
    });
    logAuthSnapshot(user, isGuest);
}

function toCodeError(error, fallbackCode) {
    const err = error || {};
    const message = String(err.message || err.error_description || fallbackCode || 'AUTH_ERROR');
    const normalizedMessage = message.toLowerCase();
    let derivedCode = String(err.code || fallbackCode || 'AUTH_ERROR');

    if (normalizedMessage.includes('manual') && normalizedMessage.includes('link')) {
        derivedCode = 'MANUAL_LINKING_DISABLED';
    } else if (normalizedMessage.includes('already') || normalizedMessage.includes('linked')) {
        derivedCode = 'IDENTITY_ALREADY_EXISTS';
    } else if (
        normalizedMessage.includes('provider is not enabled') ||
        normalizedMessage.includes('unsupported provider') ||
        normalizedMessage.includes('provider disabled')
    ) {
        derivedCode = 'GOOGLE_PROVIDER_DISABLED';
    } else if (normalizedMessage.includes('redirect') && normalizedMessage.includes('not allowed')) {
        derivedCode = 'INVALID_REDIRECT_URL';
    } else if (normalizedMessage.includes('public_site_url') || normalizedMessage.includes('public site url')) {
        derivedCode = 'PUBLIC_SITE_URL_INVALID';
    }

    return {
        code: derivedCode,
        message,
        raw: err
    };
}

function buildGoogleCallbackRedirectUrl() {
    const publicSiteUrl = getPublicSiteUrl();
    if (!publicSiteUrl) {
        throw toCodeError({ message: 'PUBLIC_SITE_URL_INVALID' }, 'PUBLIC_SITE_URL_INVALID');
    }
    return `${publicSiteUrl}/auth/callback`;
}

function getAuthUrlParams() {
    if (typeof window === 'undefined') return new URLSearchParams();
    const merged = new URLSearchParams(window.location.search || '');
    const hash = String(window.location.hash || '');
    if (hash.startsWith('#')) {
        const hashParams = new URLSearchParams(hash.slice(1));
        hashParams.forEach((value, key) => {
            if (!merged.has(key)) merged.set(key, value);
        });
    }
    return merged;
}

function buildStableRedirectUrl(extraParams = {}) {
    if (typeof window === 'undefined') return '';
    const current = new URL(window.location.href);
    const redirect = new URL(`${current.origin}${current.pathname}`);
    const keepParams = ['tab'];
    keepParams.forEach((key) => {
        if (current.searchParams.has(key)) {
            redirect.searchParams.set(key, current.searchParams.get(key));
        }
    });
    Object.entries(extraParams || {}).forEach(([key, value]) => {
        if (value == null || value === '') return;
        redirect.searchParams.set(String(key), String(value));
    });
    return redirect.toString();
}

function hasAuthCallbackParams() {
    const params = getAuthUrlParams();
    return (
        params.has('code') ||
        params.has('access_token') ||
        params.has('refresh_token') ||
        params.has('error') ||
        params.has('error_code')
    );
}

function readAuthCallbackError() {
    const params = getAuthUrlParams();
    const message = String(params.get('error_description') || params.get('error') || '').trim();
    const code = String(params.get('error_code') || '').trim();
    if (!message && !code) return null;
    return {
        code: code || 'AUTH_CALLBACK_FAILED',
        message: message || code || 'AUTH_CALLBACK_FAILED'
    };
}

async function waitForCallbackSession(supabase, retries = 14, waitMs = 220) {
    for (let i = 0; i < retries; i += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session) return data.session;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    return null;
}

async function bindAuthListener() {
    if (authRuntime.listenerBound || !isSupabaseConfigured()) return;
    const supabase = await getSupabaseClient();
    supabase.auth.onAuthStateChange((event, session) => {
        const eventName = String(event || 'AUTH_STATE_CHANGE');
        applySessionSnapshot(session, '', eventName);
    });
    authRuntime.listenerBound = true;
}

export function getAuthSnapshot() {
    return Object.assign({}, authRuntime.state);
}

export function onAuthSessionChange(listener) {
    if (typeof listener !== 'function') return () => {};
    authRuntime.listeners.add(listener);
    listener(getAuthSnapshot());
    return () => authRuntime.listeners.delete(listener);
}

export async function ensureSession() {
    if (!isSupabaseConfigured()) {
        setAuthState({
            status: 'disabled',
            ready: true,
            session: null,
            user: null,
            roleHint: 'guest',
            isGuest: true,
            email: '',
            lastEvent: 'CONFIG_MISSING',
            lastEventAt: Date.now(),
            error: 'SUPABASE_CONFIG_MISSING'
        });
        return null;
    }

    if (authRuntime.ensurePromise) return authRuntime.ensurePromise;

    authRuntime.ensurePromise = (async () => {
        try {
            await bindAuthListener();
            const supabase = await getSupabaseClient();
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;

            if (data?.session) {
                applySessionSnapshot(data.session, '', 'INITIAL_SESSION');
                return data.session;
            }
            if (authRuntime.oauthInFlight) {
                applySessionSnapshot(null, '', 'OAUTH_IN_FLIGHT');
                return null;
            }
            applySessionSnapshot(null, '', 'NO_SESSION');
            return null;
        } catch (error) {
            const normalized = toCodeError(error, 'AUTH_SESSION_INIT_FAILED');
            setAuthState({
                status: authRuntime.state.status || 'loading',
                ready: true,
                lastEvent: 'ERROR',
                lastEventAt: Date.now(),
                error: normalized.message
            });
            throw normalized;
        } finally {
            authRuntime.ensurePromise = null;
        }
    })();

    return authRuntime.ensurePromise;
}

export async function getAccessToken() {
    const session = authRuntime.state.session || (await ensureSession());
    return String(session?.access_token || '').trim();
}

export async function upgradeAnonymousWithEmailPassword(email, password) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    if (!cleanEmail || !cleanPassword) {
        throw toCodeError({ message: 'EMAIL_OR_PASSWORD_MISSING' }, 'EMAIL_OR_PASSWORD_MISSING');
    }

    const session = await ensureSession();
    const user = session?.user || null;
    if (!user) {
        throw toCodeError({ message: 'NO_ACTIVE_USER' }, 'NO_ACTIVE_USER');
    }
    if (!normalizeGuestFlag(user)) {
        return getAuthSnapshot();
    }

    const supabase = await getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
        email: cleanEmail,
        password: cleanPassword
    });
    if (error) {
        const message = String(error.message || '').toLowerCase();
        if (message.includes('already') || message.includes('exists')) {
            throw toCodeError(error, 'IDENTITY_ALREADY_EXISTS');
        }
        throw toCodeError(error, 'EMAIL_UPGRADE_FAILED');
    }

    const nextSession = data?.session || (await supabase.auth.getSession()).data?.session || null;
    applySessionSnapshot(nextSession, '', 'USER_UPGRADED');
    return getAuthSnapshot();
}

export async function linkGoogleIdentity() {
    const session = await ensureSession();
    const user = session?.user || null;
    if (!user) throw toCodeError({ message: 'NO_ACTIVE_USER' }, 'NO_ACTIVE_USER');

    const supabase = await getSupabaseClient();
    const redirectTo = buildGoogleCallbackRedirectUrl();

    if (typeof supabase.auth?.linkIdentity !== 'function') {
        throw toCodeError({ message: 'LINK_IDENTITY_UNSUPPORTED' }, 'LINK_IDENTITY_UNSUPPORTED');
    }

    const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
            redirectTo,
            queryParams: { prompt: 'select_account' },
            skipBrowserRedirect: true
        }
    });
    if (error) {
        throw toCodeError(error, 'GOOGLE_LINK_FAILED');
    }

    const targetUrl = String(data?.url || '').trim();
    if (!targetUrl) {
        throw toCodeError({ message: 'GOOGLE_REDIRECT_URL_MISSING' }, 'GOOGLE_REDIRECT_URL_MISSING');
    }
    window.location.assign(targetUrl);
    return data || {};
}

export async function switchToGoogleSignIn() {
    if (!isSupabaseConfigured()) {
        throw toCodeError({ message: 'SUPABASE_CONFIG_MISSING' }, 'SUPABASE_CONFIG_MISSING');
    }
    if (authRuntime.oauthInFlight) return;
    authRuntime.oauthInFlight = true;
    try {
        const session = await ensureSession();
        const user = session?.user || null;
        const supabase = await getSupabaseClient();

        if (normalizeGuestFlag(user)) {
            const { error: signOutError } = await supabase.auth.signOut();
            if (signOutError) throw toCodeError(signOutError, 'SIGNOUT_FAILED');
            console.info('[auth] signed out guest');
        }

        const redirectTo = buildGoogleCallbackRedirectUrl();
        console.info('[auth] starting google oauth');
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo,
                queryParams: { prompt: 'select_account' }
            }
        });
        if (error) throw toCodeError(error, 'GOOGLE_SIGNIN_FAILED');
    } finally {
        authRuntime.oauthInFlight = false;
    }
}

export async function signOutNonGuest() {
    const session = await ensureSession();
    if (normalizeGuestFlag(session?.user)) {
        throw toCodeError({ message: 'GUEST_SIGNOUT_DISABLED' }, 'GUEST_SIGNOUT_DISABLED');
    }
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw toCodeError(error, 'SIGNOUT_FAILED');
    applySessionSnapshot(null, '', 'SIGNED_OUT');
}

export async function signInWithEmailOtp(email) {
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail) {
        throw toCodeError({ message: 'EMAIL_MISSING' }, 'EMAIL_MISSING');
    }
    if (!isSupabaseConfigured()) {
        throw toCodeError({ message: 'SUPABASE_CONFIG_MISSING' }, 'SUPABASE_CONFIG_MISSING');
    }
    if (authRuntime.otpInFlight) return { sent: false };
    authRuntime.otpInFlight = true;
    try {
        const supabase = await getSupabaseClient();
        const redirectTo = buildStableRedirectUrl({ auth_switch: 'email' });
        const { error } = await supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
                emailRedirectTo: redirectTo
            }
        });
        if (error) throw toCodeError(error, 'EMAIL_OTP_FAILED');
        return { sent: true };
    } finally {
        authRuntime.otpInFlight = false;
    }
}
