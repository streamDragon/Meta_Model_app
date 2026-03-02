import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase-client.js';
import { ensureSession } from './auth-session.js';

const ENTITLEMENTS_CACHE_KEY = 'meta_freemium_entitlements_v1';
const ENTITLEMENTS_CACHE_TTL_MS = 45 * 1000;

const entitlementsRuntime = {
    entitlements: null,
    updatedAt: 0,
    listeners: new Set()
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

function persistEntitlementsCache(entitlements) {
    try {
        localStorage.setItem(ENTITLEMENTS_CACHE_KEY, JSON.stringify({
            entitlements,
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
        return normalizeEntitlementsRow(parsed.entitlements || {});
    } catch (error) {
        return null;
    }
}

function applyEntitlements(entitlements) {
    entitlementsRuntime.entitlements = normalizeEntitlementsRow(entitlements || {});
    entitlementsRuntime.updatedAt = Date.now();
    persistEntitlementsCache(entitlementsRuntime.entitlements);
    emitEntitlements();
    return entitlementsRuntime.entitlements;
}

export function getEntitlementsSnapshot() {
    const cached = entitlementsRuntime.entitlements || readEntitlementsCache();
    if (!cached) return null;
    return Object.assign({}, cached);
}

export function onEntitlementsChange(listener) {
    if (typeof listener !== 'function') return () => {};
    entitlementsRuntime.listeners.add(listener);
    listener(getEntitlementsSnapshot());
    return () => entitlementsRuntime.listeners.delete(listener);
}

export async function refreshEntitlements(options = {}) {
    const force = Boolean(options.force);
    const hasFreshMemory = entitlementsRuntime.entitlements && (Date.now() - entitlementsRuntime.updatedAt) <= ENTITLEMENTS_CACHE_TTL_MS;
    if (!force && hasFreshMemory) {
        return getEntitlementsSnapshot();
    }

    if (!isSupabaseConfigured()) return null;
    await ensureSession();
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
    return applyEntitlements(row || {});
}

function parseQuotaError(error) {
    const message = String(error?.message || '').toUpperCase();
    if (message.includes('QUOTA_EXCEEDED_GUEST')) return 'guest_quota';
    if (message.includes('QUOTA_EXCEEDED_FREE')) return 'free_quota';
    return '';
}

export async function consumeSentence(count = 1) {
    if (!isSupabaseConfigured()) {
        return { ok: true, entitlements: null };
    }
    await ensureSession();
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
    const entitlements = applyEntitlements(row || {});
    return {
        ok: true,
        entitlements,
        consumed_count: Number(row?.consumed_count || pCount)
    };
}
