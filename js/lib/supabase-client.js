const SUPABASE_JS_CDN = 'https://esm.sh/@supabase/supabase-js@2';

let cachedClient = null;
let cachedCreateClient = null;
let configLogDone = false;

function getRuntimeEnv() {
    if (typeof window === 'undefined') return {};
    return window.__META_MODEL_ENV__ || {};
}

function decodeBase64Url(value) {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    if (!normalized) return '';
    const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
    try {
        if (typeof atob === 'function') {
            return decodeURIComponent(Array.prototype.map.call(atob(padded), (char) => (
                `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`
            )).join(''));
        }
    } catch (_error) {}
    return '';
}

function deriveSupabaseOriginFromAnonKey(anonKey) {
    const token = String(anonKey || '').trim();
    if (!token) return '';
    const parts = token.split('.');
    if (parts.length < 2) return '';

    try {
        const payloadRaw = decodeBase64Url(parts[1]);
        if (!payloadRaw) return '';
        const payload = JSON.parse(payloadRaw);
        const issuer = String(payload.iss || '').trim();
        if (!issuer) return '';
        const issuerUrl = new URL(issuer);
        const host = String(issuerUrl.hostname || '').trim().toLowerCase();
        if (!host || !host.includes('supabase.co')) return '';
        return `${issuerUrl.protocol}//${host}`;
    } catch (_error) {
        return '';
    }
}

function normalizeProjectHost(host) {
    const rawHost = String(host || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!rawHost) return '';
    if (rawHost.endsWith('.supabase.co')) return rawHost;
    if (rawHost.endsWith('.pc')) return `${rawHost.slice(0, -3)}.supabase.co`;
    if (/^[a-z0-9]{20}$/.test(rawHost)) return `${rawHost}.supabase.co`;
    return rawHost;
}

function normalizeSupabaseUrl(rawUrl, anonKey) {
    const directValue = String(rawUrl || '').trim();
    const fromValue = (() => {
        if (!directValue) return '';
        const hasScheme = /^[a-z][a-z0-9+\-.]*:\/\//i.test(directValue);
        const candidate = hasScheme ? directValue : `https://${directValue.replace(/^\/+/, '')}`;
        try {
            const parsed = new URL(candidate);
            const host = normalizeProjectHost(parsed.hostname);
            if (!host) return '';
            return `https://${host}`;
        } catch (_error) {
            if (/^[a-z0-9]{20}$/i.test(directValue)) {
                return `https://${directValue.toLowerCase()}.supabase.co`;
            }
            return '';
        }
    })();

    if (fromValue) return fromValue;
    return deriveSupabaseOriginFromAnonKey(anonKey);
}

function isDebugMode() {
    if (typeof window === 'undefined') return false;
    const host = String(window.location?.hostname || '').toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) return true;
    try {
        const search = new URLSearchParams(window.location?.search || '');
        if (search.get('debug_supabase') === '1') return true;
    } catch (_error) {}
    const env = getRuntimeEnv();
    return String(env.APP_VERSION || '').trim().toLowerCase() === 'dev';
}

function logConfig(cfg) {
    if (configLogDone || !isDebugMode()) return;
    configLogDone = true;
    const key = String(cfg?.anonKey || '');
    const keyPrefix = key ? key.slice(0, 16) : '';
    console.info('[Supabase] url=', cfg?.url || '', 'keyPrefix=', keyPrefix);
}

export function getSupabasePublicConfig() {
    const env = getRuntimeEnv();
    const rawUrl = String(env.VITE_SUPABASE_URL || '').trim();
    const anonKey = String(env.VITE_SUPABASE_ANON_KEY || '').trim();
    const normalizedUrl = normalizeSupabaseUrl(rawUrl, anonKey);
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
    logConfig(cfg);
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
