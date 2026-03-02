const ADS_SCRIPT_ID = 'freemium-adsense-script';
const ADS_CONTAINER_ID = 'freemium-ad-banner';

const TRAINING_TAB_KEYS = new Set([
    'practice-question',
    'practice-radar',
    'practice-triples-radar',
    'practice-wizard',
    'practice-verb-unzip',
    'scenario-trainer',
    'comic-engine'
]);

function isExcludedRoute() {
    const path = String(window.location.pathname || '').toLowerCase();
    const search = new URLSearchParams(window.location.search || '');

    if (search.get('paywall') === '1') return true;
    if (path.includes('/login') || path.includes('/register') || path.includes('/paywall')) return true;
    return Boolean(document.body?.classList?.contains('freemium-modal-open'));
}

function isTrainingScreen() {
    const path = String(window.location.pathname || '').toLowerCase();
    if (/_trainer\.html$/i.test(path)) return true;

    const isHomeLike = path === '/' || path.endsWith('/index.html');
    if (!isHomeLike) return false;

    const tabParam = new URLSearchParams(window.location.search || '').get('tab');
    if (tabParam && TRAINING_TAB_KEYS.has(String(tabParam).toLowerCase())) return true;

    return false;
}

function getAdClientId() {
    const env = window.__META_MODEL_ENV__ || {};
    return String(env.VITE_ADSENSE_CLIENT_ID || '').trim();
}

function removeAdBanner() {
    const existing = document.getElementById(ADS_CONTAINER_ID);
    if (existing) existing.remove();
}

function removeAdScript() {
    const script = document.getElementById(ADS_SCRIPT_ID);
    if (script) script.remove();
}

function ensureAdScript(clientId) {
    if (!clientId) return false;
    if (document.getElementById(ADS_SCRIPT_ID)) return true;

    const script = document.createElement('script');
    script.id = ADS_SCRIPT_ID;
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
    return true;
}

function ensureAdBanner(clientId) {
    if (!clientId) return;
    if (document.getElementById(ADS_CONTAINER_ID)) return;

    const container = document.createElement('aside');
    container.id = ADS_CONTAINER_ID;
    container.className = 'freemium-ad-banner';
    container.setAttribute('aria-label', 'מודעה');
    container.innerHTML = `
        <ins class="adsbygoogle"
             style="display:block"
             data-ad-client="${clientId}"
             data-ad-slot="1234567890"
             data-ad-format="auto"
             data-full-width-responsive="true"></ins>
    `;

    document.body.appendChild(container);
    try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (_error) {}
}

export const AdsProvider = {
    init(entitlements = null) {
        const adsEnabled = Boolean(entitlements?.ads_enabled);
        if (!adsEnabled || isExcludedRoute() || !isTrainingScreen()) {
            removeAdBanner();
            return;
        }

        const clientId = getAdClientId();
        if (!clientId) {
            removeAdBanner();
            return;
        }

        ensureAdScript(clientId);
        ensureAdBanner(clientId);
    },

    disable() {
        removeAdBanner();
        removeAdScript();
    }
};
