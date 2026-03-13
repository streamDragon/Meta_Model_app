(function attachMetaGamification(global) {
    'use strict';

    if (!global || global.MetaGamification) return;

    var STORAGE_KEY = 'meta_gamification_v1';
    var ROOT_ID = 'meta-gamification-root';
    var LEVEL_THRESHOLDS = Object.freeze([
        0, 40, 95, 165, 250,
        350, 465, 595, 740, 900,
        1075, 1265, 1470, 1690, 1925,
        2175, 2440, 2720, 3015, 3325
    ]);
    var FEATURE_ORDER = Object.freeze([
        'sentenceMap',
        'practiceQuestion',
        'practiceRadar',
        'triplesRadar',
        'feelingLanguageBridge',
        'blueprint',
        'prismLab',
        'comicEngine',
        'toolCenter',
        'legacy'
    ]);
    var FEATURE_META = Object.freeze({
        sentenceMap: Object.freeze({
            label: '\u05de\u05e4\u05ea \u05d4\u05de\u05e9\u05e4\u05d8',
            icon: '\ud83d\uddfa\ufe0f'
        }),
        practiceQuestion: Object.freeze({
            label: '\u05ea\u05e8\u05d2\u05d5\u05dc \u05d6\u05d9\u05d4\u05d5\u05d9',
            icon: '\ud83c\udfaf'
        }),
        practiceRadar: Object.freeze({
            label: '\u05de\u05db\u05f4\u05dd \u05de\u05d8\u05d4-\u05de\u05d5\u05d3\u05dc',
            icon: '\ud83d\udce1'
        }),
        triplesRadar: Object.freeze({
            label: '\u05de\u05db\u05f4\u05dd \u05e9\u05dc\u05e9\u05d5\u05ea',
            icon: '\ud83e\udde0'
        }),
        feelingLanguageBridge: Object.freeze({
            label: '\u05d2\u05e9\u05e8 \u05ea\u05d7\u05d5\u05e9\u05d4-\u05e9\u05e4\u05d4',
            icon: '\ud83c\udf09'
        }),
        blueprint: Object.freeze({
            label: '\u05d1\u05d5\u05e0\u05d4 \u05de\u05d4\u05dc\u05da',
            icon: '\ud83e\udded'
        }),
        prismLab: Object.freeze({
            label: '\u05de\u05e2\u05d1\u05d3\u05ea \u05e4\u05e8\u05d9\u05d6\u05de\u05d5\u05ea',
            icon: '\ud83d\udd2e'
        }),
        comicEngine: Object.freeze({
            label: '\u05d1\u05de\u05ea \u05e7\u05d5\u05de\u05d9\u05e7\u05e1',
            icon: '\ud83c\udfad'
        }),
        toolCenter: Object.freeze({
            label: '\u05de\u05e8\u05db\u05d6 \u05db\u05dc\u05d9\u05dd',
            icon: '\ud83e\uddf0'
        }),
        legacy: Object.freeze({
            label: '\u05db\u05dc\u05dc\u05d9',
            icon: '\u2728'
        })
    });

    var state = loadState();
    var refs = {
        host: null,
        shell: null,
        button: null,
        streak: null,
        stars: null,
        level: null,
        panel: null,
        total: null,
        breakdown: null,
        flyup: null
    };

    function normalizeFeatureName(featureName) {
        var raw = String(featureName || '').trim().toLowerCase();
        if (!raw) return 'legacy';
        if (raw === 'sentence-map' || raw === 'sentence_map' || raw === 'sentencemap') return 'sentenceMap';
        if (raw === 'practice-question' || raw === 'practicequestion' || raw === 'question-drill') return 'practiceQuestion';
        if (raw === 'practice-radar' || raw === 'practiceradar' || raw === 'rapid-radar' || raw === 'agreement-radar') return 'practiceRadar';
        if (raw === 'practice-triples-radar' || raw === 'triples-radar' || raw === 'triplesradar') return 'triplesRadar';
        if (raw === 'practice-wizard' || raw === 'feeling-language-bridge' || raw === 'feelinglanguagebridge') return 'feelingLanguageBridge';
        if (raw === 'blueprint') return 'blueprint';
        if (raw === 'prismlab' || raw === 'prism-lab' || raw === 'prismlabtherapist') return 'prismLab';
        if (raw === 'comic-engine' || raw === 'comicengine' || raw === 'ceflow') return 'comicEngine';
        if (raw === 'practice-verb-unzip' || raw === 'toolcenter' || raw === 'tool-center') return 'toolCenter';
        return raw.replace(/[^a-z0-9_-]/g, '') || 'legacy';
    }

    function normalizeState(raw) {
        var safe = raw && typeof raw === 'object' ? raw : {};
        var stars = safe.starsPerFeature && typeof safe.starsPerFeature === 'object' ? safe.starsPerFeature : {};
        var normalizedStars = {};

        Object.keys(stars).forEach(function eachFeature(key) {
            var normalizedKey = normalizeFeatureName(key);
            var amount = Math.max(0, Math.floor(Number(stars[key]) || 0));
            if (!amount) return;
            normalizedStars[normalizedKey] = (normalizedStars[normalizedKey] || 0) + amount;
        });

        return {
            xp: Math.max(0, Math.floor(Number(safe.xp) || 0)),
            streak: Math.max(0, Math.floor(Number(safe.streak) || 0)),
            lastActiveDate: typeof safe.lastActiveDate === 'string' ? safe.lastActiveDate : '',
            starsPerFeature: normalizedStars
        };
    }

    function loadState() {
        try {
            return normalizeState(JSON.parse(global.localStorage.getItem(STORAGE_KEY) || '{}'));
        } catch (_error) {
            return normalizeState({});
        }
    }

    function saveState() {
        try {
            global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (_error) {
            // ignore storage failures
        }
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getDateKey(date) {
        var current = date instanceof Date ? date : new Date();
        var year = current.getFullYear();
        var month = String(current.getMonth() + 1).padStart(2, '0');
        var day = String(current.getDate()).padStart(2, '0');
        return year + '-' + month + '-' + day;
    }

    function parseDateKey(value) {
        if (typeof value !== 'string') return null;
        var parts = value.split('-').map(Number);
        if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) return null;
        return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function getDayDiff(fromKey, toKey) {
        var from = parseDateKey(fromKey);
        var to = parseDateKey(toKey);
        if (!from || !to) return 0;
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        return Math.floor((to.getTime() - from.getTime()) / 86400000);
    }

    function getLevelForXp(xp) {
        var safeXp = Math.max(0, Math.floor(Number(xp) || 0));
        for (var index = LEVEL_THRESHOLDS.length - 1; index >= 0; index -= 1) {
            if (safeXp >= LEVEL_THRESHOLDS[index]) return index + 1;
        }
        return 1;
    }

    function getNextThreshold(level) {
        if (level >= LEVEL_THRESHOLDS.length) {
            return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
        }
        return LEVEL_THRESHOLDS[Math.max(0, level)] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
    }

    function getFeatureMeta(featureKey) {
        return FEATURE_META[featureKey] || FEATURE_META.legacy;
    }

    function getTotalStars() {
        return Object.keys(state.starsPerFeature).reduce(function sum(total, key) {
            return total + Math.max(0, Math.floor(Number(state.starsPerFeature[key]) || 0));
        }, 0);
    }

    function getBreakdownEntries() {
        var keys = FEATURE_ORDER.slice();
        Object.keys(state.starsPerFeature).forEach(function appendUnknownKey(key) {
            if (keys.indexOf(key) === -1) keys.push(key);
        });

        return keys.map(function mapEntry(key) {
            var meta = getFeatureMeta(key);
            return {
                key: key,
                label: meta.label,
                icon: meta.icon,
                stars: Math.max(0, Math.floor(Number(state.starsPerFeature[key]) || 0))
            };
        });
    }

    function getLevel() {
        return getLevelForXp(state.xp);
    }

    function getSummary() {
        var level = getLevel();
        return {
            xp: state.xp,
            streak: state.streak,
            lastActiveDate: state.lastActiveDate,
            starsPerFeature: Object.assign({}, state.starsPerFeature),
            totalStars: getTotalStars(),
            level: level,
            nextLevelXp: getNextThreshold(level),
            levelProgressXp: level >= LEVEL_THRESHOLDS.length ? 0 : Math.max(0, getNextThreshold(level) - state.xp)
        };
    }

    function ensureHost() {
        var host = document.getElementById(ROOT_ID);
        if (host) return host;
        if (!document.body) return null;
        host = document.createElement('div');
        host.id = ROOT_ID;
        host.setAttribute('aria-live', 'polite');
        document.body.appendChild(host);
        return host;
    }

    function setExpanded(expanded) {
        if (!refs.shell || !refs.button) return;
        refs.shell.classList.toggle('is-expanded', !!expanded);
        refs.button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        if (refs.panel) {
            refs.panel.hidden = !expanded;
        }
        if (refs.breakdown) {
            refs.breakdown.hidden = !expanded;
        }
    }

    function renderBreakdown() {
        if (!refs.breakdown) return;
        refs.breakdown.innerHTML = getBreakdownEntries().map(function renderEntry(entry) {
            return [
                '<article class="meta-gamification-feature" data-feature="' + escapeHtml(entry.key) + '">',
                '  <span class="meta-gamification-feature__icon" aria-hidden="true">' + entry.icon + '</span>',
                '  <strong>' + escapeHtml(entry.label) + '</strong>',
                '  <span>\u2b50 ' + entry.stars + '</span>',
                '</article>'
            ].join('');
        }).join('');
    }

    function updateUi() {
        var summary = getSummary();
        if (refs.streak) refs.streak.textContent = String(summary.streak);
        if (refs.stars) refs.stars.textContent = String(summary.totalStars);
        if (refs.level) refs.level.textContent = '\u05e8\u05de\u05d4 ' + summary.level;
        if (refs.total) {
            refs.total.textContent = '\u05e8\u05de\u05d4 ' + summary.level + ' \u00b7 ' + summary.xp + ' \u05e0\u05d9\u05f4\u05e7 \u00b7 ' + summary.totalStars + ' \u05db\u05d5\u05db\u05d1\u05d9\u05dd';
        }
        renderBreakdown();
    }

    function pulseShell() {
        if (!refs.shell) return;
        refs.shell.classList.remove('is-pulsing');
        void refs.shell.offsetWidth;
        refs.shell.classList.add('is-pulsing');
        global.setTimeout(function clearPulse() {
            if (refs.shell) refs.shell.classList.remove('is-pulsing');
        }, 520);
    }

    function showFlyup(amount) {
        if (!refs.flyup) return;
        refs.flyup.textContent = '+' + amount + ' XP';
        refs.flyup.classList.remove('is-visible');
        void refs.flyup.offsetWidth;
        refs.flyup.classList.add('is-visible');
        global.setTimeout(function clearFlyup() {
            if (refs.flyup) refs.flyup.classList.remove('is-visible');
        }, 900);
    }

    function ensureMounted() {
        if (refs.shell && refs.shell.isConnected) return;
        var host = ensureHost();
        if (!host) return;

        host.innerHTML = [
            '<section class="meta-gamification-pill" data-meta-gamification="true">',
            '  <button type="button" class="meta-gamification-pill__button" aria-expanded="false" aria-label="\u05e4\u05ea\u05d9\u05d7\u05ea \u05e1\u05d9\u05db\u05d5\u05dd \u05d4\u05d2\u05d9\u05d9\u05de\u05d9\u05e4\u05d9\u05e7\u05e6\u05d9\u05d4">',
            '    <span class="meta-gamification-pill__metric"><span aria-hidden="true">\ud83d\udd25</span><strong data-meta-streak>0</strong><small>\u05e8\u05e6\u05e3</small></span>',
            '    <span class="meta-gamification-pill__metric"><span aria-hidden="true">\u2b50</span><strong data-meta-stars>0</strong><small>\u05db\u05d5\u05db\u05d1\u05d9\u05dd</small></span>',
            '    <span class="meta-gamification-pill__level" data-meta-level>\u05e8\u05de\u05d4 1</span>',
            '  </button>',
            '  <span class="meta-gamification-pill__flyup" data-meta-flyup aria-hidden="true"></span>',
            '  <div class="meta-gamification-panel" hidden>',
            '    <div class="meta-gamification-panel__head">',
            '      <strong>\u05e1\u05d9\u05db\u05d5\u05dd \u05d0\u05d9\u05e9\u05d9</strong>',
            '      <span data-meta-total>\u05e8\u05de\u05d4 1 \u00b7 0 \u05e0\u05d9\u05f4\u05e7 \u00b7 0 \u05db\u05d5\u05db\u05d1\u05d9\u05dd</span>',
            '    </div>',
            '    <div class="meta-gamification-breakdown" data-meta-breakdown hidden></div>',
            '  </div>',
            '</section>'
        ].join('');

        refs.host = host;
        refs.shell = host.querySelector('.meta-gamification-pill');
        refs.button = host.querySelector('.meta-gamification-pill__button');
        refs.streak = host.querySelector('[data-meta-streak]');
        refs.stars = host.querySelector('[data-meta-stars]');
        refs.level = host.querySelector('[data-meta-level]');
        refs.panel = host.querySelector('.meta-gamification-panel');
        refs.total = host.querySelector('[data-meta-total]');
        refs.breakdown = host.querySelector('[data-meta-breakdown]');
        refs.flyup = host.querySelector('[data-meta-flyup]');

        if (refs.button) {
            refs.button.addEventListener('click', function togglePanel() {
                setExpanded(!refs.shell.classList.contains('is-expanded'));
            });
        }

        document.addEventListener('click', function collapseOnOutsideClick(event) {
            if (!refs.shell || !refs.shell.classList.contains('is-expanded')) return;
            if (refs.shell.contains(event.target)) return;
            setExpanded(false);
        });

        updateUi();
    }

    function checkStreak() {
        var today = getDateKey(new Date());
        if (state.lastActiveDate === today) {
            if (!state.streak) {
                state.streak = 1;
                saveState();
                updateUi();
            }
            return state.streak;
        }

        if (!state.lastActiveDate) {
            state.streak = 1;
        } else {
            state.streak = getDayDiff(state.lastActiveDate, today) === 1
                ? Math.max(1, state.streak + 1)
                : 1;
        }

        state.lastActiveDate = today;
        saveState();
        updateUi();
        return state.streak;
    }

    function addStars(amount, featureName) {
        var delta = Math.max(0, Math.floor(Number(amount) || 0));
        if (!delta) return getSummary();
        var featureKey = normalizeFeatureName(featureName);
        state.starsPerFeature[featureKey] = Math.max(0, Math.floor(Number(state.starsPerFeature[featureKey]) || 0)) + delta;
        saveState();
        updateUi();
        return getSummary();
    }

    function addXP(amount, featureName) {
        var delta = Math.max(0, Math.floor(Number(amount) || 0));
        if (!delta) return getSummary();

        ensureMounted();
        checkStreak();
        state.xp += delta;
        saveState();
        updateUi();

        global.dispatchEvent(new global.CustomEvent('meta-xp-gained', {
            detail: {
                amount: delta,
                total: state.xp,
                feature: normalizeFeatureName(featureName)
            }
        }));

        pulseShell();
        showFlyup(delta);
        return getSummary();
    }

    function init() {
        ensureMounted();
        checkStreak();
        updateUi();
    }

    global.addEventListener('storage', function handleStorage(event) {
        if (!event || event.key !== STORAGE_KEY) return;
        state = loadState();
        ensureMounted();
        updateUi();
    });

    document.addEventListener('visibilitychange', function handleVisibility() {
        if (document.hidden) return;
        checkStreak();
    });

    var api = {
        addXP: addXP,
        addStars: addStars,
        checkStreak: checkStreak,
        getLevel: getLevel,
        getSummary: getSummary
    };
    Object.defineProperty(api, 'level', {
        enumerable: true,
        get: getLevel
    });

    global.MetaGamification = api;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})(window);
