import { getSupabaseClient, isAnonymousUser, isSupabaseConfigured } from '../lib/supabase-client.js';

const authRuntime = {
    listenerBound: false,
    syncing: false,
    state: {
        ready: false,
        session: null,
        user: null,
        roleHint: 'guest',
        isGuest: true,
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

function applySessionSnapshot(session, errorText = '') {
    const user = session?.user || null;
    const isGuest = normalizeGuestFlag(user);
    setAuthState({
        ready: true,
        session,
        user,
        roleHint: normalizeRoleHint(user),
        isGuest,
        error: errorText || ''
    });
}

function toCodeError(error, fallbackCode) {
    const err = error || {};
    const message = String(err.message || err.error_description || fallbackCode || 'AUTH_ERROR');
    return {
        code: String(err.code || fallbackCode || 'AUTH_ERROR'),
        message,
        raw: err
    };
}

async function bindAuthListener() {
    if (authRuntime.listenerBound || !isSupabaseConfigured()) return;
    const supabase = await getSupabaseClient();
    supabase.auth.onAuthStateChange((_event, session) => {
        applySessionSnapshot(session, '');
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
            ready: true,
            session: null,
            user: null,
            roleHint: 'guest',
            isGuest: true,
            error: 'SUPABASE_CONFIG_MISSING'
        });
        return null;
    }

    if (authRuntime.syncing) return authRuntime.state.session;
    authRuntime.syncing = true;
    try {
        await bindAuthListener();
        const supabase = await getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data?.session) {
            applySessionSnapshot(data.session, '');
            return data.session;
        }

        const anonRes = await supabase.auth.signInAnonymously();
        if (anonRes.error) throw anonRes.error;
        applySessionSnapshot(anonRes.data?.session || null, '');
        return anonRes.data?.session || null;
    } catch (error) {
        const normalized = toCodeError(error, 'AUTH_SESSION_INIT_FAILED');
        setAuthState({
            ready: true,
            error: normalized.message
        });
        throw normalized;
    } finally {
        authRuntime.syncing = false;
    }
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
    applySessionSnapshot(nextSession, '');
    return getAuthSnapshot();
}

export async function linkGoogleIdentity() {
    const session = await ensureSession();
    const user = session?.user || null;
    if (!user) throw toCodeError({ message: 'NO_ACTIVE_USER' }, 'NO_ACTIVE_USER');

    const supabase = await getSupabaseClient();
    const redirectTo = new URL(window.location.href);
    redirectTo.searchParams.set('auth_link', 'google');

    const { data, error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
            redirectTo: redirectTo.toString()
        }
    });
    if (error) {
        const message = String(error.message || '').toLowerCase();
        if (message.includes('already') || message.includes('linked')) {
            throw toCodeError(error, 'IDENTITY_ALREADY_EXISTS');
        }
        throw toCodeError(error, 'GOOGLE_LINK_FAILED');
    }
    return data || {};
}

export async function switchToGoogleSignIn() {
    if (!isSupabaseConfigured()) {
        throw toCodeError({ message: 'SUPABASE_CONFIG_MISSING' }, 'SUPABASE_CONFIG_MISSING');
    }
    const supabase = await getSupabaseClient();
    await supabase.auth.signOut({ scope: 'local' });
    const redirectTo = new URL(window.location.href);
    redirectTo.searchParams.set('auth_switch', 'google');
    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectTo.toString() }
    });
    if (error) throw toCodeError(error, 'GOOGLE_SIGNIN_FAILED');
}

export async function signOutNonGuest() {
    const session = await ensureSession();
    if (normalizeGuestFlag(session?.user)) {
        throw toCodeError({ message: 'GUEST_SIGNOUT_DISABLED' }, 'GUEST_SIGNOUT_DISABLED');
    }
    const supabase = await getSupabaseClient();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw toCodeError(error, 'SIGNOUT_FAILED');
    applySessionSnapshot(null, '');
}

