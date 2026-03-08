(function initMetaShellRegistry(global) {
    'use strict';

    if (!global) return;
    if (global.MetaShellRegistry && typeof global.MetaShellRegistry.getScreen === 'function') return;

    function freezeDeep(value) {
        if (!value || typeof value !== 'object') return value;
        Object.values(value).forEach((item) => freezeDeep(item));
        return Object.freeze(value);
    }

    const registry = freezeDeep({
        home: {
            id: 'home',
            adapter: 'home',
            panels: ['menu', 'about', 'help']
        },
        'practice-question': {
            id: 'practice-question',
            adapter: 'generic',
            containerSelector: '.practice-container',
            workspaceSelector: '.practice-intro-card',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['> h2', '> .subtitle', '.practice-filters', '.practice-section-header', '.question-drill-stats', '#question-drill-summary'],
            panels: [
                { id: 'guide', type: 'guide', action: 'היגיון', title: 'איך עובדים במסך הזה', size: 'lg', sourceRoot: 'section' },
                { id: 'stats', type: 'selectors', action: 'נתונים', title: 'נתוני סשן', size: 'md', selectors: ['#question-drill-session-note', '.question-drill-stats', '#question-drill-summary'] }
            ]
        },
        'practice-radar': {
            id: 'practice-radar',
            adapter: 'generic',
            containerSelector: '.practice-container',
            workspaceSelector: '.practice-intro-card',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['> h2', '> .subtitle', '.practice-section-header', '#rapid-help-btn', '#rapid-explain-btn', '#rapid-help-panel', '#rapid-ai-feedback'],
            panels: [
                { id: 'guide', type: 'guide', action: 'היגיון', title: 'איך עובדים במסך הזה', size: 'lg', sourceRoot: 'section' },
                { id: 'round-help', type: 'selectors', action: 'עזרה לסבב', title: 'עזרה לסבב הנוכחי', size: 'md', selectors: ['#rapid-help-panel'] },
                { id: 'performance', type: 'selectors', action: 'משוב מצטבר', title: 'משוב מצטבר', size: 'md', selectors: ['#rapid-ai-feedback', '#rapid-feedback'] },
                { id: 'explain', type: 'selectors', action: 'מה עושים כאן', title: 'מה עושים כאן', size: 'md', selectors: ['#rapid-explain-modal .rapid-explain-dialog'] }
            ]
        },
        'practice-triples-radar': {
            id: 'practice-triples-radar',
            adapter: 'generic',
            containerSelector: '.practice-container',
            workspaceSelector: '.practice-intro-card',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['> h2', '> .subtitle', '.practice-section-header', '.triples-radar-concept', '.triples-radar-breen-figure', '.triples-radar-reference-actions'],
            panels: [
                { id: 'guide', type: 'guide', action: 'היגיון', title: 'איך עובדים במסך הזה', size: 'lg', sourceRoot: 'section' },
                { id: 'breen-map', type: 'selectors', action: 'טבלת ברין', title: 'טבלת ברין והעקרונות', size: 'lg', selectors: ['.triples-radar-concept', '.triples-radar-breen-figure', '.triples-radar-reference-actions'] }
            ]
        },
        'practice-wizard': {
            id: 'practice-wizard',
            adapter: 'generic',
            containerSelector: '.practice-container',
            workspaceSelector: '.practice-intro-card',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['> h2', '> .subtitle', '.practice-section-header'],
            panels: [
                { id: 'guide', type: 'guide', action: 'היגיון', title: 'איך עובדים במסך הזה', size: 'lg', sourceRoot: 'section' },
                { id: 'method', type: 'selectors', action: 'שיטת עבודה', title: 'שיטת העבודה', size: 'md', selectors: ['.practice-section-header'] }
            ]
        },
        'practice-verb-unzip': {
            id: 'practice-verb-unzip',
            adapter: 'verb-unzip',
            panels: ['settings', 'help', 'stats']
        },
        'scenario-trainer': {
            id: 'scenario-trainer',
            adapter: 'scenario',
            panels: ['setup', 'history', 'blueprint', 'settings']
        },
        'comic-engine': {
            id: 'comic-engine',
            adapter: 'generic',
            containerSelector: '#comic-engine',
            workspaceSelector: '.comic-engine-shell',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['.ceflow-shell-copy'],
            panels: [
                { id: 'guide', type: 'guide', action: 'היגיון', title: 'איך עובדים במסך הזה', size: 'lg', sourceRoot: 'section' },
                { id: 'setup', type: 'selectors', action: 'מבוא', title: 'מה המסך הזה מתרגל', size: 'md', selectors: ['.ceflow-shell-copy'] }
            ]
        },
        categories: {
            id: 'categories',
            adapter: 'generic',
            containerSelector: '#categories',
            workspaceSelector: '#categories-container',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['.categories-theory-intro'],
            panels: [
                { id: 'guide', type: 'guide', action: 'היגיון', title: 'איך עובדים במסך הזה', size: 'lg', sourceRoot: 'section' },
                { id: 'intro', type: 'selectors', action: 'מבוא', title: 'מבוא למילון', size: 'md', selectors: ['.categories-theory-intro'] }
            ]
        },
        blueprint: {
            id: 'blueprint',
            adapter: 'generic',
            containerSelector: '.blueprint-container',
            workspaceSelector: '.card',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['> h2', '> p', '#export-json-btn'],
            panels: [
                { id: 'guide', type: 'guide', action: 'היגיון', title: 'איך עובדים במסך הזה', size: 'lg', sourceRoot: 'section' },
                { id: 'export', type: 'buttons', action: 'ייצוא', title: 'ייצוא המהלך', size: 'sm', description: 'ייצוא נשמר כפעולת משנה כדי לא להעמיס על סביבת העבודה.', buttons: [{ label: 'ייצא JSON', handler: 'exportBlueprint', style: 'primary' }] }
            ]
        },
        prismlab: {
            id: 'prismlab',
            adapter: 'generic',
            containerSelector: '.prism-container',
            workspaceSelector: '.card',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['> h2', '> p', '#prism-deep-guide'],
            panels: [
                { id: 'guide', type: 'guide', action: 'היגיון', title: 'איך עובדים במסך הזה', size: 'lg', sourceRoot: 'section' },
                { id: 'deep-guide', type: 'selectors', action: 'עומק', title: 'שכבת עומק', size: 'lg', selectors: ['#prism-deep-guide'] },
                { id: 'export', type: 'buttons', action: 'ייצוא', title: 'ייצוא הסשן', size: 'sm', description: 'הייצוא זמין גם מתוך תוצאות המעבדה, וכאן נשאר כפעולת משנה.', buttons: [{ label: 'ייצא סשן', handler: 'exportPrismSession', style: 'primary' }] }
            ]
        },
        about: {
            id: 'about',
            adapter: 'generic',
            containerSelector: '#about',
            workspaceSelector: '.card',
            sectionHideSelectors: ['.screen-read-guide'],
            hideSelectors: ['.about-shell-intro'],
            panels: [
                { id: 'about-intro', type: 'selectors', action: 'רקע', title: 'על המוצר', size: 'md', selectors: ['.about-shell-intro'] }
            ]
        }
    });

    function getScreen(screenId) {
        return registry[String(screenId || '').trim()] || null;
    }

    function getAll() {
        return registry;
    }

    global.MetaShellRegistry = Object.freeze({
        getScreen,
        getAll
    });
})(typeof window !== 'undefined' ? window : globalThis);
