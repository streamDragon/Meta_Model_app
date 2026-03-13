(function attachMetaGamification(global, document) {
    'use strict';

    if (!global || !document || global.MetaGamification) return;

    var STORAGE_KEY = 'meta_gamification_v1';
    var ROOT_ID = 'meta-gamification-root';
    var LEVEL_THRESHOLDS = Object.freeze([0, 50, 150, 300, 500, 800, 1200, 1800, 2500, 3500, 5000]);
    var FEATURE_ORDER = Object.freeze([
        'sentenceMap',
        'practiceQuestion',
        'triplesRadar',
        'practiceRadar',
        'feelingLanguageBridge',
        'blueprint',
        'prismLab',
        'comicEngine',
        'toolCenter',
        'legacy'
    ]);
    var FEATURE_META = Object.freeze({
        sentenceMap: Object.freeze({
            label: 'מפת המשפט',
            icon: '🗺️',
            unlockLevel: 1
        }),
        practiceQuestion: Object.freeze({
            label: 'תרגול זיהוי',
            icon: '🧩',
            unlockLevel: 1
        }),
        triplesRadar: Object.freeze({
            label: 'מכ״ם שלשות',
            icon: '📡',
            unlockLevel: 2
        }),
        practiceRadar: Object.freeze({
            label: 'מכ״ם מטה-מודל',
            icon: '🎯',
            unlockLevel: 5
        }),
        feelingLanguageBridge: Object.freeze({
            label: 'גשר תחושה-שפה',
            icon: '🌉',
            unlockLevel: 1
        }),
        blueprint: Object.freeze({
            label: 'בונה מהלך',
            icon: '🧭',
            unlockLevel: 1
        }),
        prismLab: Object.freeze({
            label: 'מעבדת פריזמות',
            icon: '🔬',
            unlockLevel: 1
        }),
        comicEngine: Object.freeze({
            label: 'במת קומיקס',
            icon: '🎭',
            unlockLevel: 1
        }),
        toolCenter: Object.freeze({
            label: 'מרכז כלים',
            icon: '🧰',
            unlockLevel: 1
        }),
        legacy: Object.freeze({
            label: 'כללי',
            icon: '✨',
            unlockLevel: 1
        })
    });
    var LEVEL_TITLES = Object.freeze({
        1: 'צעד ראשון',
        2: 'מתחיל סקרן',
        3: 'מזהה דפוסים',
        4: 'חוקר שפה',
        5: 'מאתגר מחשבות',
        6: 'פורץ גבולות',
        7: 'מאסטר מטא-מודל',
        8: 'גורו השפה',
        9: 'מגלה אמיתות',
        10: 'ברמה אחרת לגמרי'
    });

    var state = loadState();
    var refs = {
        host: null,
        shell: null,
        button: null,
        streak: null,
        stars: null,
        levelLabel: null,
        levelNumber: null,
        total: null,
        progressFill: null,
        breakdown: null,
        panel: null,
        flyup: null,
        starIcon: null
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
            bestStreak: Math.max(0, Math.floor(Number(safe.bestStreak) || 0)),
            streakFreezes: Math.max(0, Math.floor(Number(safe.streakFreezes) || 0)),
            lastActiveDate: typeof safe.lastActiveDate === 'string' ? safe.lastActiveDate : '',
            lastCelebratedLevel: Math.max(1, Math.floor(Number(safe.lastCelebratedLevel) || 1)),
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
        return String(value == null ? '' : value)
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

    function getLevelTitle(level) {
        return LEVEL_TITLES[Math.max(1, Math.floor(Number(level) || 1))] || 'מומחה';
    }

    function getFeatureMeta(featureKey) {
        return FEATURE_META[featureKey] || FEATURE_META.legacy;
    }

    function getUnlockedFeaturesForLevel(level) {
        var currentLevel = Math.max(1, Math.floor(Number(level) || 1));
        return Object.keys(FEATURE_META).filter(function filterUnlocked(featureKey) {
            return Math.max(1, Math.floor(Number(getFeatureMeta(featureKey).unlockLevel) || 1)) <= currentLevel;
        });
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
                unlockLevel: meta.unlockLevel || 1,
                stars: Math.max(0, Math.floor(Number(state.starsPerFeature[key]) || 0))
            };
        });
    }

    function getXPProgress() {
        var level = getLevelForXp(state.xp);
        var currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
        var nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
        var span = Math.max(1, nextThreshold - currentThreshold);
        var progress = level >= LEVEL_THRESHOLDS.length
            ? 1
            : Math.max(0, Math.min(1, (state.xp - currentThreshold) / span));
        return {
            level: level,
            currentThreshold: currentThreshold,
            nextThreshold: nextThreshold,
            progress: progress,
            progressPct: Math.round(progress * 100)
        };
    }

    function getSummary() {
        var xpProgress = getXPProgress();
        return {
            xp: state.xp,
            streak: state.streak,
            bestStreak: Math.max(state.bestStreak, state.streak),
            streakFreezes: state.streakFreezes,
            lastActiveDate: state.lastActiveDate,
            lastPracticeDate: state.lastActiveDate,
            starsPerFeature: Object.assign({}, state.starsPerFeature),
            totalStars: getTotalStars(),
            level: xpProgress.level,
            levelTitle: getLevelTitle(xpProgress.level),
            currentLevelXp: xpProgress.currentThreshold,
            nextLevelXp: xpProgress.nextThreshold,
            xpProgress: xpProgress.progress,
            xpProgressPct: xpProgress.progressPct,
            xpToNextLevel: Math.max(0, xpProgress.nextThreshold - state.xp),
            unlockedFeatures: getUnlockedFeaturesForLevel(xpProgress.level)
        };
    }

    function dispatchSafe(eventName, detail) {
        try {
            global.dispatchEvent(new global.CustomEvent(eventName, { detail: detail }));
        } catch (_error) {
            // ignore dispatch failures
        }
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
        if (refs.panel) refs.panel.hidden = !expanded;
        if (refs.breakdown) refs.breakdown.hidden = !expanded;
    }

    function renderBreakdown(summary) {
        if (!refs.breakdown) return;
        var currentSummary = summary || getSummary();
        refs.breakdown.innerHTML = getBreakdownEntries().map(function renderEntry(entry) {
            var unlocked = currentSummary.level >= Math.max(1, Number(entry.unlockLevel) || 1);
            return [
                '<article class="meta-gamification-feature' + (unlocked ? '' : ' is-locked') + '" data-feature="' + escapeHtml(entry.key) + '">',
                '  <span class="meta-gamification-feature__icon" aria-hidden="true">' + entry.icon + '</span>',
                '  <div class="meta-gamification-feature__copy">',
                '    <strong>' + escapeHtml(entry.label) + '</strong>',
                '    <small>' + (unlocked ? ('⭐ ' + entry.stars) : ('נפתח ברמה ' + entry.unlockLevel)) + '</small>',
                '  </div>',
                '</article>'
            ].join('');
        }).join('');
    }

    function animateInteger(node, fromValue, toValue) {
        if (!node) return;
        var from = Math.max(0, Math.floor(Number(fromValue) || 0));
        var to = Math.max(0, Math.floor(Number(toValue) || 0));
        if (from === to) {
            node.textContent = String(to);
            return;
        }

        var start = Date.now();
        var duration = Math.min(640, 140 + Math.abs(to - from) * 28);

        function tick() {
            var elapsed = Date.now() - start;
            var progress = Math.min(1, elapsed / duration);
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = from + Math.round((to - from) * eased);
            node.textContent = String(current);
            if (progress < 1) {
                global.requestAnimationFrame(tick);
            } else {
                node.textContent = String(to);
            }
        }

        global.requestAnimationFrame(tick);
    }

    function updateUi(previousSummary) {
        var summary = getSummary();
        var previous = previousSummary || summary;

        if (refs.streak) animateInteger(refs.streak, previous.streak, summary.streak);
        if (refs.stars) animateInteger(refs.stars, previous.totalStars, summary.totalStars);
        if (refs.levelNumber) refs.levelNumber.textContent = String(summary.level);
        if (refs.levelLabel) refs.levelLabel.textContent = 'רמה ' + summary.level;
        if (refs.total) {
            refs.total.textContent = summary.levelTitle + ' · ' + summary.xp + ' ני״ק · ' + summary.totalStars + ' כוכבים';
        }
        if (refs.progressFill) {
            refs.progressFill.style.width = summary.xpProgressPct + '%';
        }
        renderBreakdown(summary);
    }

    function pulseShell() {
        if (!refs.shell) return;
        refs.shell.classList.remove('is-pulsing');
        void refs.shell.offsetWidth;
        refs.shell.classList.add('is-pulsing');
        global.setTimeout(function clearPulse() {
            if (refs.shell) refs.shell.classList.remove('is-pulsing');
        }, 560);
    }

    function showFlyup(amount) {
        if (!refs.flyup) return;
        refs.flyup.textContent = '+' + amount + ' XP';
        refs.flyup.classList.remove('is-visible');
        void refs.flyup.offsetWidth;
        refs.flyup.classList.add('is-visible');
        global.setTimeout(function clearFlyup() {
            if (refs.flyup) refs.flyup.classList.remove('is-visible');
        }, 980);
    }

    function popStarIcon() {
        if (!refs.starIcon) return;
        refs.starIcon.classList.remove('is-popping');
        void refs.starIcon.offsetWidth;
        refs.starIcon.classList.add('is-popping');
        global.setTimeout(function clearPop() {
            if (refs.starIcon) refs.starIcon.classList.remove('is-popping');
        }, 420);
    }

    function ensureMounted() {
        if (refs.shell && refs.shell.isConnected) return;
        var host = ensureHost();
        if (!host) return;

        host.innerHTML = [
            '<section class="meta-gamification-pill" data-meta-gamification="true">',
            '  <button type="button" class="meta-gamification-pill__button" aria-expanded="false" aria-label="פתיחת סיכום ההתקדמות">',
            '    <span class="meta-gamification-pill__metric"><span aria-hidden="true">🔥</span><strong data-meta-streak>0</strong><small>רצף</small></span>',
            '    <span class="meta-gamification-pill__metric"><span aria-hidden="true" class="meta-gamification-pill__star" data-meta-star-icon>⭐</span><strong data-meta-stars>0</strong><small>כוכבים</small></span>',
            '    <span class="meta-gamification-pill__level"><small>רמה</small><strong data-meta-level-number>1</strong></span>',
            '  </button>',
            '  <span class="meta-gamification-pill__flyup" data-meta-flyup aria-hidden="true"></span>',
            '  <div class="meta-gamification-panel" hidden>',
            '    <div class="meta-gamification-panel__head">',
            '      <div>',
            '        <strong data-meta-level>רמה 1</strong>',
            '        <span data-meta-total>צעד ראשון · 0 ני״ק · 0 כוכבים</span>',
            '      </div>',
            '    </div>',
            '    <div class="meta-gamification-panel__progress" aria-hidden="true"><span data-meta-progress-fill style="width:0%;"></span></div>',
            '    <div class="meta-gamification-breakdown" data-meta-breakdown hidden></div>',
            '  </div>',
            '</section>'
        ].join('');

        refs.host = host;
        refs.shell = host.querySelector('.meta-gamification-pill');
        refs.button = host.querySelector('.meta-gamification-pill__button');
        refs.streak = host.querySelector('[data-meta-streak]');
        refs.stars = host.querySelector('[data-meta-stars]');
        refs.levelLabel = host.querySelector('[data-meta-level]');
        refs.levelNumber = host.querySelector('[data-meta-level-number]');
        refs.total = host.querySelector('[data-meta-total]');
        refs.progressFill = host.querySelector('[data-meta-progress-fill]');
        refs.breakdown = host.querySelector('[data-meta-breakdown]');
        refs.panel = host.querySelector('.meta-gamification-panel');
        refs.flyup = host.querySelector('[data-meta-flyup]');
        refs.starIcon = host.querySelector('[data-meta-star-icon]');

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
        var previous = state.streak;
        var changed = false;
        var usedFreeze = false;
        var wasReset = false;

        if (state.lastActiveDate === today) {
            if (state.streak < 1) {
                state.streak = 1;
                changed = true;
            }
        } else if (!state.lastActiveDate) {
            state.streak = 1;
            changed = true;
        } else {
            var dayDiff = getDayDiff(state.lastActiveDate, today);
            if (dayDiff === 1) {
                state.streak = Math.max(1, state.streak + 1);
                changed = true;
            } else if (dayDiff > 1 && state.streakFreezes > 0) {
                state.streakFreezes -= 1;
                state.streak = Math.max(1, state.streak + 1);
                usedFreeze = true;
                changed = true;
            } else {
                wasReset = state.streak > 0;
                if (state.streak > state.bestStreak) {
                    state.bestStreak = state.streak;
                }
                state.streak = 1;
                changed = true;
            }
        }

        state.lastActiveDate = today;
        state.bestStreak = Math.max(state.bestStreak, state.streak);
        saveState();
        updateUi();

        if (changed) {
            dispatchSafe('meta-streak-updated', {
                streak: state.streak,
                previous: previous,
                usedFreeze: usedFreeze,
                reset: wasReset,
                firstTime: !previous
            });
        }

        return state.streak;
    }

    function addStars(amount, featureName) {
        var delta = Math.max(0, Math.floor(Number(amount) || 0));
        if (!delta) return getSummary();

        ensureMounted();
        var before = getSummary();
        var featureKey = normalizeFeatureName(featureName);
        state.starsPerFeature[featureKey] = Math.max(0, Math.floor(Number(state.starsPerFeature[featureKey]) || 0)) + delta;
        saveState();
        updateUi(before);
        popStarIcon();
        dispatchSafe('meta-stars-gained', {
            amount: delta,
            feature: featureKey,
            previousTotal: before.totalStars,
            total: getSummary().totalStars
        });
        return getSummary();
    }

    function addXP(amount, featureName) {
        var delta = Math.max(0, Math.floor(Number(amount) || 0));
        if (!delta) return getSummary();

        ensureMounted();
        var before = getSummary();
        var oldLevel = before.level;
        var featureKey = normalizeFeatureName(featureName);

        checkStreak();
        state.xp += delta;
        saveState();

        var after = getSummary();
        updateUi(before);

        dispatchSafe('meta-xp-gained', {
            amount: delta,
            total: after.xp,
            feature: featureKey,
            level: after.level,
            previousLevel: oldLevel
        });

        if (after.level > oldLevel) {
            state.lastCelebratedLevel = after.level;
            saveState();
            dispatchSafe('meta-level-up', {
                level: after.level,
                previousLevel: oldLevel,
                title: after.levelTitle,
                unlockedFeatures: getUnlockedFeaturesForLevel(after.level).filter(function onlyNewUnlocked(key) {
                    return getFeatureMeta(key).unlockLevel === after.level;
                }).map(function mapFeature(key) {
                    return {
                        key: key,
                        label: getFeatureMeta(key).label,
                        icon: getFeatureMeta(key).icon
                    };
                })
            });
        }

        pulseShell();
        showFlyup(delta);
        return after;
    }

    function init() {
        ensureMounted();
        updateUi();
    }

    global.addEventListener('storage', function handleStorage(event) {
        if (!event || event.key !== STORAGE_KEY) return;
        state = loadState();
        ensureMounted();
        updateUi();
    });

    var api = {
        addXP: addXP,
        addStars: addStars,
        checkStreak: checkStreak,
        getLevel: function getLevel() {
            return getLevelForXp(state.xp);
        },
        getLevelTitle: getLevelTitle,
        getXPProgress: getXPProgress,
        getSummary: getSummary,
        getUnlockedFeatures: function getUnlockedFeatures() {
            return getUnlockedFeaturesForLevel(getLevelForXp(state.xp));
        }
    };

    Object.defineProperty(api, 'level', {
        enumerable: true,
        get: function levelGetter() {
            return getLevelForXp(state.xp);
        }
    });

    global.MetaGamification = api;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})(window, document);
