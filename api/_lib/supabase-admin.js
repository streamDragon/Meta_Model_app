const { createClient } = require('@supabase/supabase-js');

function env(name, fallback = '') {
    return String(process.env[name] || fallback || '').trim();
}

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY');

let serviceClient = null;
let anonClient = null;

function assertServerConfig() {
    if (!SUPABASE_URL) throw new Error('SUPABASE_URL_MISSING');
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY_MISSING');
    if (!SUPABASE_ANON_KEY) throw new Error('SUPABASE_ANON_KEY_MISSING');
}

function getSupabaseAdminClient() {
    assertServerConfig();
    if (serviceClient) return serviceClient;
    serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
    return serviceClient;
}

function getSupabaseAnonClient() {
    assertServerConfig();
    if (anonClient) return anonClient;
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
    return anonClient;
}

function readBearerToken(req) {
    const header = String(req.headers.authorization || req.headers.Authorization || '').trim();
    if (!header.toLowerCase().startsWith('bearer ')) return '';
    return header.slice(7).trim();
}

async function verifyAccessToken(req) {
    const token = readBearerToken(req);
    if (!token) {
        const err = new Error('UNAUTHORIZED');
        err.statusCode = 401;
        throw err;
    }

    const anon = getSupabaseAnonClient();
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data?.user?.id) {
        const err = new Error('INVALID_TOKEN');
        err.statusCode = 401;
        throw err;
    }
    return { user: data.user, token };
}

module.exports = {
    getSupabaseAdminClient,
    verifyAccessToken
};

