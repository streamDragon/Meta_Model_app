(function initMetaUiFlags(global) {
    'use strict';

    if (!global) return;
    if (global.MetaUiFlags && typeof global.MetaUiFlags.resolveUiMode === 'function') return;

    const VALID_UI_MODES = Object.freeze(['legacy', 'shell']);
    const DEV_OVERRIDE_KEY = 'meta_ui_mode_override_v1';
    const OVERLAY_PANELS_DEFAULT = Object.freeze(['settings', 'help', 'history', 'stats']);

    const SCREEN_UI_REGISTRY = Object.freeze({
        home: Object.freeze({
            id: 'home',
            path: '?tab=home',
            title: 'Home Hub',
            defaultUiMode: 'shell',
            aliases: Object.freeze(['hub', 'menu']),
            overlayPanels: Object.freeze(['menu', 'help', 'about']),
            notes: 'Compact hub; full menu/help/about open in overlay'
        }),
        'practice-question': Object.freeze({
            id: 'practice-question',
            path: '?tab=practice-question',
            title: 'Questions',
            defaultUiMode: 'legacy',
            overlayPanels: OVERLAY_PANELS_DEFAULT
        }),
        'practice-radar': Object.freeze({
            id: 'practice-radar',
            path: '?tab=practice-radar',
            title: 'Meta Radar',
            defaultUiMode: 'legacy',
            overlayPanels: OVERLAY_PANELS_DEFAULT
        }),
        'practice-triples-radar': Object.freeze({
            id: 'practice-triples-radar',
            path: '?tab=practice-triples-radar',
            title: 'Triples Radar',
            defaultUiMode: 'legacy',
            overlayPanels: OVERLAY_PANELS_DEFAULT
        }),
        'practice-wizard': Object.freeze({
            id: 'practice-wizard',
            path: '?tab=practice-wizard',
            title: 'Bridge / SQHCEL',
            defaultUiMode: 'legacy',
            aliases: Object.freeze(['bridge']),
            overlayPanels: OVERLAY_PANELS_DEFAULT
        }),
        'practice-verb-unzip': Object.freeze({
            id: 'practice-verb-unzip',
            path: '?tab=practice-verb-unzip',
            title: 'Unspecified Verb / פועל לא מפורט',
            defaultUiMode: 'shell',
            aliases: Object.freeze(['unspecified-verb', 'unzip']),
            overlayPanels: Object.freeze(['settings', 'help', 'history', 'stats', 'import-export']),
            notes: 'Initial shell migration target'
        }),
        'scenario-trainer': Object.freeze({
            id: 'scenario-trainer',
            path: '?tab=scenario-trainer',
            title: 'Scenes / Execution',
            defaultUiMode: 'shell',
            aliases: Object.freeze(['scenes', 'execution']),
            overlayPanels: Object.freeze([
                'setup',
                'settings',
                'history',
                'decomposition',
                'action-map',
                'blueprint',
                'diagnostics'
            ])
        }),
        'comic-engine': Object.freeze({
            id: 'comic-engine',
            path: '?tab=comic-engine',
            title: 'Comic Engine',
            defaultUiMode: 'legacy',
            overlayPanels: OVERLAY_PANELS_DEFAULT
        }),
        categories: Object.freeze({
            id: 'categories',
            path: '?tab=categories',
            title: 'Categories',
            defaultUiMode: 'legacy',
            overlayPanels: OVERLAY_PANELS_DEFAULT
        }),
        blueprint: Object.freeze({
            id: 'blueprint',
            path: '?tab=blueprint',
            title: 'Blueprint Builder',
            defaultUiMode: 'legacy',
            overlayPanels: Object.freeze(['help', 'history', 'schema', 'import-export'])
        }),
        prismlab: Object.freeze({
            id: 'prismlab',
            path: '?tab=prismlab',
            title: 'Prism Lab',
            defaultUiMode: 'legacy',
            aliases: Object.freeze(['prism-research']),
            overlayPanels: OVERLAY_PANELS_DEFAULT
        }),
        about: Object.freeze({
            id: 'about',
            path: '?tab=about',
            title: 'About / Guide',
            defaultUiMode: 'legacy',
            overlayPanels: Object.freeze(['about'])
        })
    });

    function normalizeUiMode(input) {
        const value = String(input || '').trim().toLowerCase();
        return VALID_UI_MODES.includes(value) ? value : '';
    }

    function parseSearch(search) {
        try {
            return new URLSearchParams(typeof search === 'string' ? search : (global.location && global.location.search) || '');
        } catch (_error) {
            return new URLSearchParams('');
        }
    }

    function readUiModeQuery(search) {
        const params = parseSearch(search);
        return normalizeUiMode(params.get('ui'));
    }

    function readDevOverride(screenId) {
        try {
            const raw = localStorage.getItem(DEV_OVERRIDE_KEY);
            if (!raw) return '';

            const parsed = JSON.parse(raw);
            if (typeof parsed === 'string') {
                return normalizeUiMode(parsed);
            }

            if (parsed && typeof parsed === 'object') {
                const byScreen = normalizeUiMode(parsed[screenId]);
                if (byScreen) return byScreen;
                return normalizeUiMode(parsed['*']);
            }

            return '';
        } catch (_error) {
            return '';
        }
    }

    function getScreenConfig(screenId) {
        const id = String(screenId || '').trim();
        return SCREEN_UI_REGISTRY[id] || null;
    }

    function resolveUiMode(screenId, locationSearch) {
        const screen = getScreenConfig(screenId);
        const fromRegistry = normalizeUiMode(screen && screen.defaultUiMode) || 'legacy';
        const fromQuery = readUiModeQuery(locationSearch);
        if (fromQuery) return fromQuery;

        const fromDev = readDevOverride(screenId);
        if (fromDev) return fromDev;

        return fromRegistry;
    }

    function isShellMode(screenId, locationSearch) {
        return resolveUiMode(screenId, locationSearch) === 'shell';
    }

    function buildScreenUrl(screenId, mode, href) {
        const normalizedMode = normalizeUiMode(mode) || 'legacy';
        const screen = getScreenConfig(screenId);
        let nextUrl;
        try {
            nextUrl = new URL(href || global.location.href);
        } catch (_error) {
            nextUrl = new URL(global.location.href);
        }

        if (screen && screen.id) {
            nextUrl.searchParams.set('tab', screen.id);
        }
        nextUrl.searchParams.set('ui', normalizedMode);
        return nextUrl.toString();
    }

    function setDevUiMode(mode, screenId) {
        const normalizedMode = normalizeUiMode(mode);
        const key = String(screenId || '*').trim() || '*';
        if (!normalizedMode) {
            try {
                const raw = localStorage.getItem(DEV_OVERRIDE_KEY);
                if (!raw) return;
                const parsed = JSON.parse(raw);
                if (parsed && typeof parsed === 'object') {
                    delete parsed[key];
                    if (!Object.keys(parsed).length) {
                        localStorage.removeItem(DEV_OVERRIDE_KEY);
                    } else {
                        localStorage.setItem(DEV_OVERRIDE_KEY, JSON.stringify(parsed));
                    }
                } else {
                    localStorage.removeItem(DEV_OVERRIDE_KEY);
                }
            } catch (_error) {
                // noop
            }
            return;
        }

        try {
            const raw = localStorage.getItem(DEV_OVERRIDE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            const next = (parsed && typeof parsed === 'object') ? parsed : {};
            next[key] = normalizedMode;
            localStorage.setItem(DEV_OVERRIDE_KEY, JSON.stringify(next));
        } catch (_error) {
            // noop
        }
    }

    global.MetaUiFlags = Object.freeze({
        VALID_UI_MODES,
        DEV_OVERRIDE_KEY,
        SCREEN_UI_REGISTRY,
        normalizeUiMode,
        readUiModeQuery,
        getScreenConfig,
        resolveUiMode,
        isShellMode,
        buildScreenUrl,
        setDevUiMode
    });
})(typeof window !== 'undefined' ? window : globalThis);
