const SUPABASE_JS_CDN = 'https://esm.sh/@supabase/supabase-js@2';

let cachedClient = null;
let cachedCreateClient = null;

function getRuntimeEnv() {
    if (typeof window === 'undefined') return {};
    return window.__META_MODEL_ENV__ || {};
}

function normalizeSupabaseUrl(rawUrl) {
    const value = String(rawUrl || '').trim();
    if (!value) return '';
    try {
        const parsed = new URL(value);
        const protocol = String(parsed.protocol || '').toLowerCase();
        if (protocol !== 'https:' && protocol !== 'http:') return '';
        return parsed.origin;
    } catch (_error) {
        return '';
    }
}

export function getSupabasePublicConfig() {
    const env = getRuntimeEnv();
    const rawUrl = String(env.VITE_SUPABASE_URL || '').trim();
    const anonKey = String(env.VITE_SUPABASE_ANON_KEY || '').trim();
    const normalizedUrl = normalizeSupabaseUrl(rawUrl);
    return {
        rawUrl,
        url: normalizedUrl,
        anonKey
    };
}

export function isSupabaseConfigured() {
    const cfg = getSupabasePublicConfig();
    return Boolean(cfg.url && cfg.anonKey);
}

async function loadCreateClient() {
    if (cachedCreateClient) return cachedCreateClient;
    if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
        cachedCreateClient = window.supabase.createClient;
        return cachedCreateClient;
    }
    const mod = await import(SUPABASE_JS_CDN);
    if (!mod || typeof mod.createClient !== 'function') {
        throw new Error('SUPABASE_CLIENT_LOAD_FAILED');
    }
    cachedCreateClient = mod.createClient;
    return cachedCreateClient;
}

export async function getSupabaseClient() {
    if (cachedClient) return cachedClient;
    const cfg = getSupabasePublicConfig();
    if (!cfg.url || !cfg.anonKey) {
        throw new Error('SUPABASE_CONFIG_MISSING');
    }
    const createClient = await loadCreateClient();
    cachedClient = createClient(cfg.url, cfg.anonKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    });
    return cachedClient;
}

export function isAnonymousUser(user) {
    if (!user) return false;
    if (user.is_anonymous === true) return true;
    const provider = String(user.app_metadata?.provider || '').toLowerCase();
    return provider === 'anonymous';
}
