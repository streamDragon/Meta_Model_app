const BAD_URL_DEBUG_FLAG = 'debug_bad_urls';
const WRAPPER_MARK = '__metaBadUrlWrapper';

function isDevHost() {
    const host = String(window.location?.hostname || '').toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local');
}

function isEnabled() {
    try {
        const params = new URLSearchParams(window.location?.search || '');
        if (params.get(BAD_URL_DEBUG_FLAG) === '1') return true;
    } catch (_error) {}
    return isDevHost();
}

function toUrlString(input) {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    if (input && typeof input.url === 'string') return input.url;
    return '';
}

if (typeof window !== 'undefined' && typeof window.fetch === 'function' && isEnabled()) {
    const baseFetch = window.fetch.bind(window);
    if (!baseFetch[WRAPPER_MARK]) {
        const wrappedFetch = async function wrappedFetch(input, init) {
            const url = toUrlString(input);
            if (url && (url.includes('.pc') || url.includes('/auth/v1/signup'))) {
                console.error('[BAD_URL]', url, new Error().stack);
            }
            return baseFetch(input, init);
        };
        Object.defineProperty(wrappedFetch, WRAPPER_MARK, {
            value: true,
            configurable: false,
            enumerable: false,
            writable: false
        });
        window.fetch = wrappedFetch;
    }
}
