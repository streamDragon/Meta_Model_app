import { getPublicSiteUrl, getSupabaseClient, isSupabaseConfigured } from '../lib/supabase-client.js';
import { refreshEntitlements } from './entitlements-client.js';

const callbackState = {
    busy: false
};

function findNode(selector) {
    return document.querySelector(selector);
}

function setStatus(text, tone = 'info') {
    const status = findNode('[data-auth-callback-status]');
    if (!status) return;
    status.textContent = String(text || '');
    status.dataset.tone = String(tone || 'info');
}

function setRetryVisible(isVisible) {
    const retryBtn = findNode('[data-auth-callback-retry]');
    if (!retryBtn) return;
    retryBtn.classList.toggle('hidden', !isVisible);
    retryBtn.disabled = false;
}

function readCallbackErrorMessage() {
    const merged = new URLSearchParams(window.location.search || '');
    const hash = String(window.location.hash || '');
    if (hash.startsWith('#')) {
        const hashParams = new URLSearchParams(hash.slice(1));
        hashParams.forEach((value, key) => {
            if (!merged.has(key)) merged.set(key, value);
        });
    }
    return String(merged.get('error_description') || merged.get('error') || '').trim();
}

function buildHomeUrl() {
    const publicSiteUrl = getPublicSiteUrl();
    if (publicSiteUrl) {
        return `${publicSiteUrl}/`;
    }
    return new URL('../../index.html', window.location.href).toString();
}

async function waitForSession(supabase, retries = 18, waitMs = 220) {
    for (let i = 0; i < retries; i += 1) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data?.session) return data.session;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
    }
    return null;
}

function showFailure(message) {
    setStatus(message || 'לא הצלחנו להשלים את ההתחברות ל-Google. נסו שוב.', 'error');
    setRetryVisible(true);
}

async function handleAuthCallback() {
    if (callbackState.busy) return;
    callbackState.busy = true;
    setRetryVisible(false);
    setStatus('מאמתים התחברות מול Google...', 'info');

    try {
        if (!isSupabaseConfigured()) {
            showFailure('התחברות Google לא זמינה כרגע במערכת.');
            return;
        }

        const callbackError = readCallbackErrorMessage();
        if (callbackError) {
            showFailure(`התחברות Google נכשלה: ${callbackError}`);
            return;
        }

        const supabase = await getSupabaseClient();
        const session = await waitForSession(supabase);
        if (!session) {
            showFailure('לא התקבלה התחברות תקינה. לחצו Retry כדי לנסות שוב.');
            return;
        }

        console.info('[auth] callback session ok');
        await refreshEntitlements({ force: true }).catch(() => null);
        window.location.replace(buildHomeUrl());
    } catch (_error) {
        showFailure('התחברות Google נכשלה. לחצו Retry כדי לנסות שוב.');
    } finally {
        callbackState.busy = false;
    }
}

const retryBtn = findNode('[data-auth-callback-retry]');
retryBtn?.addEventListener('click', async () => {
    retryBtn.disabled = true;
    try {
        await handleAuthCallback();
    } finally {
        retryBtn.disabled = false;
    }
});

handleAuthCallback();
