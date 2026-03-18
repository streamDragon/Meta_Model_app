(function attachMetaModelNavMap(global) {
    if (!global || global.MetaModelNavMap) return;

    var NAV_MAP = Object.freeze({
        home: Object.freeze({ type: 'tab', tab: 'home', path: '/' }),
        sentenceMap: Object.freeze({ type: 'tab', tab: 'sentence-map', path: '/feature/sentence-map' }),
        about: Object.freeze({ type: 'tab', tab: 'about', path: '/feature/about' }),
        categories: Object.freeze({ type: 'tab', tab: 'categories', path: '/feature/categories' }),
        prismLab: Object.freeze({ type: 'tab', tab: 'prismlab', path: '/feature/prismlab' }),
        blueprint: Object.freeze({ type: 'tab', tab: 'blueprint', path: '/feature/blueprint' }),
        comicEngine: Object.freeze({ type: 'tab', tab: 'comic-engine', path: '/feature/comic-engine' }),
        scenarioTrainer: Object.freeze({ type: 'page', path: '/scenario_trainer.html' }),
        scenes: Object.freeze({ type: 'page', path: '/scenario_trainer.html' }),
        practiceQuestion: Object.freeze({ type: 'tab', tab: 'practice-question', path: '/feature/practice-question' }),
        practiceRadar: Object.freeze({ type: 'tab', tab: 'practice-radar', path: '/feature/practice-radar' }),
        practiceTriplesRadar: Object.freeze({ type: 'tab', tab: 'practice-triples-radar', path: '/feature/practice-triples-radar' }),
        practiceWizard: Object.freeze({ type: 'tab', tab: 'practice-wizard', path: '/feature/practice-wizard' }),
        practiceVerbUnzip: Object.freeze({ type: 'tab', tab: 'practice-verb-unzip', path: '/feature/practice-verb-unzip' }),
        classicClassic: Object.freeze({ type: 'page', path: '/classic_classic_trainer.html' }),
        classic2: Object.freeze({ type: 'page', path: '/classic2_trainer.html' }),
        iceberg: Object.freeze({ type: 'page', path: '/iceberg_templates_trainer.html' }),
        prismResearch: Object.freeze({ type: 'page', path: '/prism_research_trainer.html' }),
        prismLabStandalone: Object.freeze({ type: 'page', path: '/prism_lab_trainer.html' }),
        contextRadar: Object.freeze({ type: 'page', path: '/lab/context-radar/' }),
        livingTriples: Object.freeze({ type: 'page', path: '/living_triples_trainer.html' }),
        verbUnzipStandalone: Object.freeze({ type: 'page', path: '/verb_unzip_trainer.html' }),
        sentenceMorpher: Object.freeze({ type: 'page', path: '/sentence_morpher_trainer.html' })
    });

    var PATH_TO_KEY = (function buildPathMap() {
        var map = Object.create(null);
        Object.keys(NAV_MAP).forEach(function (key) {
            var entry = NAV_MAP[key];
            if (!entry || !entry.path) return;
            var normalizedPath = normalizePath(entry.path);
            if (!normalizedPath) return;
            if (!map[normalizedPath]) map[normalizedPath] = key;
        });
        return map;
    })();

    function normalizePath(value) {
        var raw = String(value || '').trim();
        if (!raw) return '';
        try {
            var url = new URL(raw, global.location && global.location.href ? global.location.href : 'https://example.invalid/');
            return (url.pathname || '/').replace(/\/{2,}/g, '/');
        } catch (_error) {
            var withoutQuery = raw.split('#')[0].split('?')[0];
            if (!withoutQuery) return '';
            return withoutQuery.charAt(0) === '/' ? withoutQuery : '/' + withoutQuery.replace(/^\.?\//, '');
        }
    }

    function getMetaModelNavEntry(key) {
        return NAV_MAP[String(key || '').trim()] || null;
    }

    function getMetaModelNavPathByKey(key) {
        var entry = getMetaModelNavEntry(key);
        return entry ? String(entry.path || '').trim() : '';
    }

    function getMetaModelNavHref(key, options) {
        var opts = options && typeof options === 'object' ? options : {};
        var entry = getMetaModelNavEntry(key);
        if (!entry) return '';
        var path = String(entry.path || '').trim();
        if (!path) return '';
        if (opts.versioned === false) return path;
        var withAssetVersion = typeof global.__withAssetVersion === 'function' ? global.__withAssetVersion : function (p) { return p; };
        return withAssetVersion(path);
    }

    function getMetaModelNavKeyByPath(value) {
        var normalized = normalizePath(value);
        return normalized ? (PATH_TO_KEY[normalized] || '') : '';
    }

    function navigateByNavKey(key, options) {
        var opts = options && typeof options === 'object' ? options : {};
        var entry = getMetaModelNavEntry(key);
        if (!entry) return false;

        if (entry.type === 'tab' && typeof global.navigateTo === 'function' && opts.forcePage !== true) {
            try {
                global.navigateTo(entry.tab, { featureEntry: opts.featureEntry || 'welcome' });
                return true;
            } catch (_error) {
                // fall through to full-page navigation
            }
        }

        var href = getMetaModelNavHref(key, { versioned: opts.versioned !== false });
        if (!href) return false;
        global.location.href = href;
        return true;
    }

    global.MetaModelNavMap = NAV_MAP;
    global.getMetaModelNavEntry = getMetaModelNavEntry;
    global.getMetaModelNavPathByKey = getMetaModelNavPathByKey;
    global.getMetaModelNavHref = getMetaModelNavHref;
    global.getMetaModelNavKeyByPath = getMetaModelNavKeyByPath;
    global.navigateByNavKey = navigateByNavKey;
})(window);
