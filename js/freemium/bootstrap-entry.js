import '../lib/supabase-client.js';
import './auth-session.js';
import './entitlements-client.js';
import { bootstrapAuth } from './bootstrap.js';

const readyPromise = bootstrapAuth('bootstrap_entry');

if (typeof window !== 'undefined') {
    window.MetaFreemiumReady = readyPromise;
}

export { readyPromise as freemiumReadyPromise };
