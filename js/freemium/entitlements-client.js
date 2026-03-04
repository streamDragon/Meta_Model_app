import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase-client.js';
import { ensureSession, getAuthSnapshot } from './auth-session.js';

const ENTITLEMENTS_CACHE_KEY = 'meta_freemium_entitlements_v1';
const ENTITLEMENTS_CACHE_TTL_MS = 45 * 1000;
const GUEST_FINGERPRINT_KEY = 'meta_guest_fingerprint_v1';
const SIGNED_OUT_USER_KEY = '__signed_out__';
const GUEST_FREE_LIMIT = 10;
const FREE_PACK_TOTAL = 60;

const entitlementsRuntime = {
    entitlements: null,
    userKey: '',
    updatedAt: 0,
    listeners: new Set(),
    refreshPromise: null,
    consumeInFlightByRequestId: new Map(),
    guestFingerprintPromise: null,
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

function normalizePlan(value) {
    const plan = String(value || '').trim().toLowerCase();
    if (plan === 'pro') return 'pro';
    if (plan === 'free') return 'free';
    return 'guest';
}

function defaultQuotaForPlan(plan) {
    if (plan === 'guest') return GUEST_FREE_LIMIT;
    if (plan === 'free') return FREE_PACK_TOTAL;
    return FREE_PACK_TOTAL;
}

function normalizeCount(value, fallback = 0) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return Math.max(0, Number(fallback) || 0);
    return Math.max(0, parsed);
}

function normalizeEntitlementsRow(row) {
    const data = row || {};
    const role = normalizePlan(data.role || data.plan);
    const unlimited = Boolean(data.unlimited || role === 'pro');

    const quotaCandidate = data.total_quota ?? data.daily_limit ?? data.free_total_limit ?? data.guest_daily_limit;
    const totalQuota = normalizeCount(quotaCandidate, defaultQuotaForPlan(role)) || defaultQuotaForPlan(role);

    let remainingCandidate = data.remaining;
    if (remainingCandidate == null) {
        remainingCandidate = role === 'free' ? data.free_total_remaining : data.guest_daily_remaining;
    }
    const remaining = Math.min(totalQuota, normalizeCount(remainingCandidate, totalQuota));

    const guestRemaining = role === 'guest' ? remaining : totalQuota;
    const freeRemaining = role === 'free' ? remaining : totalQuota;

    return {
        role,
        plan: role,
        ads_enabled: Boolean(data.ads_enabled ?? (role !== 'pro')),
        total_quota: totalQuota,
        remaining,
        guest_daily_limit: totalQuota,
        guest_daily_used_today: role === 'guest' ? Math.max(0, totalQuota - guestRemaining) : 0,
        guest_daily_remaining: guestRemaining,
        free_total_limit: totalQuota,
        free_total_used: role === 'free' ? Math.max(0, totalQuota - freeRemaining) : 0,
        free_total_remaining: freeRemaining,
        daily_limit: totalQuota,
        reset_at: '',
        unlimited
    };
}

function resolveRemaining(entitlements) {
    if (!entitlements) return 0;
    if (entitlements.unlimited || entitlements.role === 'pro') return -1;
    return Number(entitlements.remaining || 0);
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
        plan: 'guest',
        ads_enabled: true,
        total_quota: GUEST_FREE_LIMIT,
        remaining: GUEST_FREE_LIMIT,
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
    } catch (_error) {}
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
    } catch (_error) {
        return null;
    }
}

function isCacheForCurrentUser(userKey) {
    const currentAuthUserKey = resolveAuthUserKey();
    if (!currentAuthUserKey) return true;

    const normalizedUserKey = String(userKey || '');
    if (currentAuthUserKey === SIGNED_OUT_USER_KEY) {
        return normalizedUserKey === SIGNED_OUT_USER_KEY || normalizedUserKey.startsWith('guest:');
    }

    return normalizedUserKey === currentAuthUserKey;
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

function normalizeRefreshOptions(optionsOrReason = {}) {
    if (typeof optionsOrReason === 'string') {
        return {
            force: true,
            reason: String(optionsOrReason || '').trim() || 'manual'
        };
    }
    if (typeof optionsOrReason === 'boolean') {
        return {
            force: Boolean(optionsOrReason),
            reason: 'manual'
        };
    }
    if (typeof optionsOrReason === 'object' && optionsOrReason !== null) {
        return {
            force: Boolean(optionsOrReason.force),
            reason: String(optionsOrReason.reason || 'manual').trim() || 'manual'
        };
    }
    return {
        force: false,
        reason: 'manual'
    };
}

function normalizeConsumeOptions(countOrOptions = 1) {
    if (typeof countOrOptions === 'object' && countOrOptions !== null) {
        return {
            count: Math.max(1, Number(countOrOptions.count ?? countOrOptions.cost ?? 1) || 1),
            requestId: String(countOrOptions.requestId || '').trim(),
            source: String(countOrOptions.source || 'sentence').trim() || 'sentence'
        };
    }
    return {
        count: Math.max(1, Number(countOrOptions) || 1),
        requestId: '',
        source: 'sentence'
    };
}

function createConsumeRequestId(source = 'sentence') {
    const prefix = String(source || 'sentence').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'sentence';
    if (typeof globalThis.crypto?.randomUUID === 'function') {
        return `${prefix}:${globalThis.crypto.randomUUID()}`;
    }
    return `${prefix}:${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toRpcRow(data) {
    if (Array.isArray(data)) return data[0] || {};
    return data || {};
}

function isMissingRpc(error, functionName) {
    const message = String(error?.message || '').toLowerCase();
    const normalizedFn = String(functionName || '').toLowerCase();
    if (!message) return false;
    return (
        message.includes('could not find the function') ||
        (message.includes('does not exist') && message.includes(normalizedFn))
    );
}

function normalizeConsumeReason(reason, role = 'guest') {
    const normalizedReason = String(reason || '').trim().toLowerCase();
    if (!normalizedReason) return '';
    if (normalizedReason === 'quota_exhausted' || normalizedReason === 'quota_exceeded') {
        return normalizePlan(role) === 'guest' ? 'guest_quota' : 'free_quota';
    }
    if (normalizedReason === 'not_authenticated') return 'not_authenticated';
    if (normalizedReason === 'idempotent_replay') return 'idempotent_replay';
    return normalizedReason;
}

function parseLegacyQuotaError(error) {
    const message = String(error?.message || '').toUpperCase();
    if (message.includes('QUOTA_EXCEEDED_GUEST')) return 'guest_quota';
    if (message.includes('QUOTA_EXCEEDED_FREE')) return 'free_quota';
    return '';
}

function getGuestFingerprintCache() {
    try {
        const cached = String(localStorage.getItem(GUEST_FINGERPRINT_KEY) || '').trim();
        return cached;
    } catch (_error) {
        return '';
    }
}

function setGuestFingerprintCache(value) {
    const normalized = String(value || '').trim();
    if (!normalized) return;
    try {
        localStorage.setItem(GUEST_FINGERPRINT_KEY, normalized);
    } catch (_error) {}
}

function fallbackHash(value) {
    const input = String(value || '');
    let hash = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        hash ^= input.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return Math.abs(hash >>> 0).toString(16).padStart(8, '0');
}

async function sha256Hex(value) {
    const input = String(value || '');
    if (!globalThis.crypto?.subtle || typeof TextEncoder === 'undefined') {
        return fallbackHash(input);
    }
    const bytes = new TextEncoder().encode(input);
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function buildGuestFingerprint() {
    const nav = typeof navigator === 'undefined' ? {} : navigator;
    const scr = typeof screen === 'undefined' ? {} : screen;
    const tz = (() => {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch (_error) {
            return '';
        }
    })();

    const parts = [
        String(nav.userAgent || ''),
        String(nav.language || ''),
        Array.isArray(nav.languages) ? nav.languages.join(',') : '',
        String(nav.platform || ''),
        String(nav.hardwareConcurrency || ''),
        String(nav.deviceMemory || ''),
        `${Number(scr.width) || 0}x${Number(scr.height) || 0}x${Number(scr.colorDepth) || 0}`,
        String(tz || ''),
        String((new Date()).getTimezoneOffset())
    ];

    const raw = parts.join('|');
    return sha256Hex(raw);
}

async function getGuestFingerprint() {
    const cached = getGuestFingerprintCache();
    if (cached) return cached;

    if (entitlementsRuntime.guestFingerprintPromise) {
        return entitlementsRuntime.guestFingerprintPromise;
    }

    entitlementsRuntime.guestFingerprintPromise = (async () => {
        const next = await buildGuestFingerprint();
        setGuestFingerprintCache(next);
        return next;
    })();

    try {
        return await entitlementsRuntime.guestFingerprintPromise;
    } finally {
        entitlementsRuntime.guestFingerprintPromise = null;
    }
}

function toEntitlementsFromAuthRpc(row = {}) {
    return normalizeEntitlementsRow({
        role: row.role || row.plan,
        plan: row.plan || row.role,
        ads_enabled: row.ads_enabled,
        total_quota: row.total_quota ?? row.daily_limit,
        remaining: row.remaining,
        unlimited: Boolean(row.unlimited || normalizePlan(row.plan || row.role) === 'pro')
    });
}

function toEntitlementsFromGuestRpc(row = {}) {
    return normalizeEntitlementsRow({
        role: 'guest',
        plan: 'guest',
        ads_enabled: true,
        total_quota: row.total_quota,
        remaining: row.remaining,
        unlimited: false
    });
}

async function fetchLegacyEntitlements(supabase) {
    const { error: ensureError } = await supabase.rpc('ensure_profile');
    if (ensureError) {
        throw new Error(ensureError.message || 'ENSURE_PROFILE_FAILED');
    }
    const { data, error } = await supabase.rpc('get_entitlements');
    if (error) {
        throw new Error(error.message || 'ENTITLEMENTS_FETCH_FAILED');
    }
    return toRpcRow(data);
}

async function fetchAuthenticatedEntitlements(supabase) {
    const { data, error } = await supabase.rpc('get_entitlements_state');
    if (!error) {
        return toRpcRow(data);
    }

    if (isMissingRpc(error, 'get_entitlements_state')) {
        return fetchLegacyEntitlements(supabase);
    }

    throw new Error(error.message || 'ENTITLEMENTS_FETCH_FAILED');
}

async function fetchGuestEntitlements(supabase, guestFingerprint) {
    const { data, error } = await supabase.rpc('get_guest_entitlements_state', {
        p_guest_fingerprint: guestFingerprint
    });

    if (error) {
        throw new Error(error.message || 'GUEST_ENTITLEMENTS_FETCH_FAILED');
    }

    return toRpcRow(data);
}

async function runLegacyConsumeSentence(supabase, session, count = 1, requestId = '') {
    const pCount = Math.max(1, Number(count) || 1);
    const { data, error } = await supabase.rpc('consume_sentence', { p_count: pCount });
    if (error) {
        const reason = parseLegacyQuotaError(error);
        if (reason) {
            const entitlements = await refreshEntitlements({ force: true, reason: 'legacy_quota_refresh' })
                .catch(() => getEntitlementsSnapshot());
            return {
                ok: false,
                reason,
                entitlements,
                requestId,
                rpc: 'consume_sentence'
            };
        }
        throw new Error(error.message || 'CONSUME_SENTENCE_FAILED');
    }

    const row = toRpcRow(data);
    const sessionUserKey = resolveSessionUserKey(session) || resolveAuthUserKey();
    const entitlements = applyEntitlements(row, { userKey: sessionUserKey });
    return {
        ok: true,
        reason: 'consumed',
        entitlements,
        consumed_count: Number(row?.consumed_count || pCount),
        requestId,
        rpc: 'consume_sentence'
    };
}

async function runGuestConsume(supabase, parsed, requestId) {
    const guestFingerprint = await getGuestFingerprint();

    const { data, error } = await supabase.rpc('consume_guest_quota', {
        p_guest_fingerprint: guestFingerprint,
        p_request_id: requestId,
        p_cost: parsed.count
    });

    if (error) {
        throw new Error(error.message || 'CONSUME_GUEST_QUOTA_FAILED');
    }

    const row = toRpcRow(data);
    const entitlements = applyEntitlements(toEntitlementsFromGuestRpc(row), { userKey: `guest:${guestFingerprint}` });
    const reason = normalizeConsumeReason(row.reason, 'guest');
    const allowed = row.allowed === true || reason === 'idempotent_replay';

    if (!allowed) {
        return {
            ok: false,
            reason: reason || 'guest_quota',
            entitlements,
            requestId,
            rpc: 'consume_guest_quota'
        };
    }

    return {
        ok: true,
        reason: reason || 'consumed',
        entitlements,
        requestId,
        remaining: normalizeCount(row.remaining, entitlements.remaining),
        rpc: 'consume_guest_quota'
    };
}

async function runAuthenticatedConsume(supabase, session, parsed, requestId) {
    const { data, error } = await supabase.rpc('consume_quota', {
        p_request_id: requestId,
        p_cost: parsed.count
    });

    if (error && isMissingRpc(error, 'consume_quota')) {
        return runLegacyConsumeSentence(supabase, session, parsed.count, requestId);
    }

    if (error) {
        throw new Error(error.message || 'CONSUME_QUOTA_FAILED');
    }

    const row = toRpcRow(data);
    const role = normalizePlan(row.role || row.plan || 'free');
    const sessionUserKey = resolveSessionUserKey(session) || resolveAuthUserKey();
    const entitlements = applyEntitlements(toEntitlementsFromAuthRpc(row), { userKey: sessionUserKey });
    const reason = normalizeConsumeReason(row.reason, role);
    const allowed = row.allowed === true || reason === 'idempotent_replay';

    if (!allowed) {
        return {
            ok: false,
            reason: reason || 'free_quota',
            entitlements,
            requestId,
            rpc: 'consume_quota'
        };
    }

    return {
        ok: true,
        reason: reason || 'consumed',
        entitlements,
        requestId,
        remaining: normalizeCount(row.remaining, entitlements.remaining),
        rpc: 'consume_quota'
    };
}

async function runConsumeSentence(options = {}) {
    const parsed = normalizeConsumeOptions(options);
    const requestId = parsed.requestId || createConsumeRequestId(parsed.source);

    if (!isSupabaseConfigured()) {
        return {
            ok: true,
            reason: 'supabase_disabled',
            entitlements: createGuestFallbackEntitlements(),
            requestId,
            rpc: 'none'
        };
    }

    const session = await ensureSession();
    const supabase = await getSupabaseClient();

    if (!session?.user) {
        return runGuestConsume(supabase, parsed, requestId);
    }

    return runAuthenticatedConsume(supabase, session, parsed, requestId);
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

export async function refreshEntitlements(optionsOrReason = {}) {
    const options = normalizeRefreshOptions(optionsOrReason);
    const authUserKey = resolveAuthUserKey();

    if (authUserKey && entitlementsRuntime.userKey && authUserKey !== entitlementsRuntime.userKey) {
        entitlementsRuntime.entitlements = null;
        entitlementsRuntime.userKey = '';
        entitlementsRuntime.updatedAt = 0;
    }

    const hasFreshMemory = entitlementsRuntime.entitlements &&
        isCacheForCurrentUser(entitlementsRuntime.userKey) &&
        (Date.now() - entitlementsRuntime.updatedAt) <= ENTITLEMENTS_CACHE_TTL_MS;

    if (!options.force && hasFreshMemory) {
        return getEntitlementsSnapshot();
    }

    if (entitlementsRuntime.refreshPromise) return entitlementsRuntime.refreshPromise;

    entitlementsRuntime.refreshPromise = (async () => {
        if (!isSupabaseConfigured()) {
            return applyEntitlements(createGuestFallbackEntitlements(), {
                userKey: resolveAuthUserKey() || SIGNED_OUT_USER_KEY
            });
        }

        const session = await ensureSession();
        const supabase = await getSupabaseClient();

        if (!session?.user) {
            const guestFingerprint = await getGuestFingerprint();
            const guestRow = await fetchGuestEntitlements(supabase, guestFingerprint);
            return applyEntitlements(toEntitlementsFromGuestRpc(guestRow), {
                userKey: `guest:${guestFingerprint}`
            });
        }

        const sessionUserKey = resolveSessionUserKey(session);
        const entitlementsRow = await fetchAuthenticatedEntitlements(supabase);
        return applyEntitlements(toEntitlementsFromAuthRpc(entitlementsRow), { userKey: sessionUserKey });
    })();

    try {
        return await entitlementsRuntime.refreshPromise;
    } finally {
        entitlementsRuntime.refreshPromise = null;
    }
}

export async function consumeSentence(countOrOptions = 1) {
    const options = normalizeConsumeOptions(countOrOptions);
    const requestId = options.requestId || createConsumeRequestId(options.source);

    if (entitlementsRuntime.consumeInFlightByRequestId.has(requestId)) {
        return entitlementsRuntime.consumeInFlightByRequestId.get(requestId);
    }

    const inFlight = runConsumeSentence(Object.assign({}, options, { requestId }));
    entitlementsRuntime.consumeInFlightByRequestId.set(requestId, inFlight);

    try {
        return await inFlight;
    } finally {
        entitlementsRuntime.consumeInFlightByRequestId.delete(requestId);
    }
}
