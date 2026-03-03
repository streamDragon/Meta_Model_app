import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase-client.js';
import { ensureSession, getAuthSnapshot } from './auth-session.js';

const ENTITLEMENTS_CACHE_KEY = 'meta_freemium_entitlements_v1';
const ENTITLEMENTS_CACHE_TTL_MS = 45 * 1000;
const SIGNED_OUT_USER_KEY = '__signed_out__';

const entitlementsRuntime = {
    entitlements: null,
    userKey: '',
    updatedAt: 0,
    listeners: new Set(),
    refreshPromise: null,
    consumePromise: null,
    lastLogKey: ''
};

function emitEntitlements() {
    const snapshot = getEntitlementsSnapshot();
    entitlementsRuntime.listeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch (error) {
            console.warn('[freemium] entitlements listener failed', error);
        }
    });
}

function normalizeEntitlementsRow(row) {
    const data = row || {};
    const role = String(data.role || 'guest');
    return {
        role,
        ads_enabled: Boolean(data.ads_enabled),
        guest_daily_limit: Number(data.guest_daily_limit || 10),
        guest_daily_used_today: Number(data.guest_daily_used_today || 0),
        guest_daily_remaining: Number(data.guest_daily_remaining || 0),
        free_total_limit: Number(data.free_total_limit || 80),
        free_total_used: Number(data.free_total_used || 0),
        free_total_remaining: Number(data.free_total_remaining || 0),
        unlimited: Boolean(data.unlimited || role === 'pro')
    };
}

function resolveRemaining(entitlements) {
    if (!entitlements) return 0;
    if (entitlements.unlimited || entitlements.role === 'pro') return -1;
    if (entitlements.role === 'free') return Number(entitlements.free_total_remaining || 0);
    return Number(entitlements.guest_daily_remaining || 0);
}

function resolveSessionUserKey(session) {
    return String(session?.user?.id || '').trim();
}

function resolveAuthUserKey() {
    const authSnapshot = getAuthSnapshot();
    if (!authSnapshot?.ready) return '';
    const userKey = String(authSnapshot?.user?.id || '').trim();
    return userKey || SIGNED_OUT_USER_KEY;
}

function createGuestFallbackEntitlements() {
    return normalizeEntitlementsRow({
        role: 'guest',
        ads_enabled: true,
        guest_daily_limit: 10,
        guest_daily_used_today: 0,
        guest_daily_remaining: 10,
        free_total_limit: 80,
        free_total_used: 0,
        free_total_remaining: 80,
        unlimited: false
    });
}

function logEntitlements(entitlements, userKey = '') {
    const role = String(entitlements?.role || 'guest');
    const remaining = resolveRemaining(entitlements);
    const logKey = `${String(userKey || '')}|${role}|${remaining}`;
    if (logKey === entitlementsRuntime.lastLogKey) return;
    entitlementsRuntime.lastLogKey = logKey;
    console.info(`[entitlements] role=${role} remaining=${remaining}`);
}

function persistEntitlementsCache(entitlements, userKey = '') {
    try {
        localStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify({
            entitlements,
            userKey: String(userKey || ''),
            updatedAt: Date.now()
        }));
    } catch (error) {}
}

function readEntitlementsCache() {
    try {
        const raw = localStorage.getItem(ENTITLEMENTS_CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        if ((Date.now() - Number(parsed.updatedAt || 0)) > ENTITLEMENTS_CACHE_TTL_MS) return null;
        return {
            entitlements: normalizeEntitlementsRow(parsed.entitlements || {}),
            userKey: String(parsed.userKey || '').trim()
        };
    } catch (error) {
        return null;
    }
}

function isCacheForCurrentUser(userKey) {
    const currentAuthUserKey = resolveAuthUserKey();
    if (!currentAuthUserKey) return true;
    return String(userKey || '') === currentAuthUserKey;
}

function applyEntitlements(entitlements, options = {}) {
    const userKey = String(options.userKey || '').trim();
    entitlementsRuntime.entitlements = normalizeEntitlementsRow(entitlements || {});
    entitlementsRuntime.userKey = userKey;
    entitlementsRuntime.updatedAt = Date.now();
    persistEntitlementsCache(entitlementsRuntime.entitlements, userKey);
    logEntitlements(entitlementsRuntime.entitlements, userKey);
    emitEntitlements();
    return entitlementsRuntime.entitlements;
}

export function getEntitlementsSnapshot() {
    if (entitlementsRuntime.entitlements && isCacheForCurrentUser(entitlementsRuntime.userKey)) {
        return Object.assign({}, entitlementsRuntime.entitlements);
    }

    const cachedEntry = readEntitlementsCache();
    if (!cachedEntry) return null;
    if (!isCacheForCurrentUser(cachedEntry.userKey)) return null;
    return Object.assign({}, cachedEntry.entitlements);
}

export function onEntitlementsChange(listener) {
    if (typeof listener !== 'function') return () => {};
    entitlementsRuntime.listeners.add(listener);
    listener(getEntitlementsSnapshot());
    return () => entitlementsRuntime.listeners.delete(listener);
}

export async function refreshEntitlements(options = {}) {
    const force = Boolean(options.force);
    const authUserKey = resolveAuthUserKey();

    if (authUserKey && entitlementsRuntime.userKey && authUserKey !== entitlementsRuntime.userKey) {
        entitlementsRuntime.entitlements = null;
        entitlementsRuntime.userKey = '';
        entitlementsRuntime.updatedAt = 0;
    }

    const hasFreshMemory = entitlementsRuntime.entitlements &&
        isCacheForCurrentUser(entitlementsRuntime.userKey) &&
        (Date.now() - entitlementsRuntime.updatedAt) <= ENTITLEMENTS_CACHE_TTL_MS;
    if (!force && hasFreshMemory) {
        return getEntitlementsSnapshot();
    }

    if (entitlementsRuntime.refreshPromise) return entitlementsRuntime.refreshPromise;

    entitlementsRuntime.refreshPromise = (async () => {
        if (!isSupabaseConfigured()) {
            return applyEntitlements(createGuestFallbackEntitlements(), { userKey: resolveAuthUserKey() || SIGNED_OUT_USER_KEY });
        }
        const session = await ensureSession();
        const sessionUserKey = resolveSessionUserKey(session);
        if (!session?.user) {
            return applyEntitlements(createGuestFallbackEntitlements(), { userKey: resolveAuthUserKey() || SIGNED_OUT_USER_KEY });
        }

        const supabase = await getSupabaseClient();

        const { error: ensureError } = await supabase.rpc('ensure_profile');
        if (ensureError) {
            throw new Error(ensureError.message || 'ENSURE_PROFILE_FAILED');
        }
        const { data, error } = await supabase.rpc('get_entitlements');
        if (error) {
            throw new Error(error.message || 'ENTITLEMENTS_FETCH_FAILED');
        }
        const row = Array.isArray(data) ? data[0] : data;
        return applyEntitlements(row || {}, { userKey: sessionUserKey });
    })();

    try {
        return await entitlementsRuntime.refreshPromise;
    } finally {
        entitlementsRuntime.refreshPromise = null;
    }
}

function parseQuotaError(error) {
    const message = String(error?.message || '').toUpperCase();
    if (message.includes('QUOTA_EXCEEDED_GUEST')) return 'guest_quota';
    if (message.includes('QUOTA_EXCEEDED_FREE')) return 'free_quota';
    return '';
}

async function runConsumeSentence(count = 1) {
    if (!isSupabaseConfigured()) {
        return { ok: true, entitlements: null };
    }
    const session = await ensureSession();
    const supabase = await getSupabaseClient();
    const pCount = Math.max(1, Number(count) || 1);

    const { data, error } = await supabase.rpc('consume_sentence', { p_count: pCount });
    if (error) {
        const reason = parseQuotaError(error);
        if (reason) {
            const entitlements = await refreshEntitlements({ force: true }).catch(() => getEntitlementsSnapshot());
            return { ok: false, reason, entitlements };
        }
        throw new Error(error.message || 'CONSUME_SENTENCE_FAILED');
    }

    const row = Array.isArray(data) ? data[0] : data;
    const sessionUserKey = resolveSessionUserKey(session) || resolveAuthUserKey();
    const entitlements = applyEntitlements(row || {}, { userKey: sessionUserKey });
    return {
        ok: true,
        entitlements,
        consumed_count: Number(row?.consumed_count || pCount)
    };
}

export async function consumeSentence(count = 1) {
    if (entitlementsRuntime.consumePromise) return entitlementsRuntime.consumePromise;

    entitlementsRuntime.consumePromise = runConsumeSentence(count);
    try {
        return await entitlementsRuntime.consumePromise;
    } finally {
        entitlementsRuntime.consumePromise = null;
    }
}
