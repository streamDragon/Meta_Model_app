/**
 * onboarding.js
 * Duolingo-style 3-step onboarding for Meta Model app.
 * Shown once on first visit; profile saved to localStorage.
 * On subsequent visits shows a personalised greeting bar.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'mm_user_profile';
    var DISMISSED_KEY = 'mm_onboarding_dismissed_v2';
    var LEGACY_DISMISSED_KEYS = ['mm_onboarding_dismissed_v1', 'mm_onboarding_done', 'onboarding_complete'];
    var SPLASH_DURATION_MS = 1900; // splash fades at 1.6s, show onboarding at 1.9s

    /* ── Recommendation map ── */
    var RECOMMENDATIONS = {
        beginner: {
            emoji: '🌉',
            name: 'גשר תחושה‑שפה',
            desc: 'הכלי הראשון — מחבר בין מה שמרגישים לבין מה שאומרים',
            navKey: 'practiceWizard',
            href: null
        },
        intermediate: {
            emoji: '🔎',
            name: 'תרגול זיהוי',
            desc: 'חדד את הרפלקס — זהה מחיקה, עיוות או הכללה בזמן אמת',
            navKey: 'practiceQuestion',
            href: null
        },
        advanced_therapist: {
            emoji: '🎭',
            name: '$1תמונות מחיי היום',
            desc: 'בחר תגובה בשיחה חיה וראה לאן הלחץ הולך',
            navKey: null,
            href: 'scenario_trainer.html'
        },
        advanced_other: {
            emoji: '🔬',
            name: 'מעבדת רמות לוגיות',
            desc: 'חקירה שכבתית דרך רמות לוגיות, גרעין, סדק וכיוון פרקטי',
            navKey: 'prismLab',
            href: null
        }
    };

    var ROLE_LABELS = {
        therapist: { label: 'מטפל/ת', emoji: '🌿' },
        coach:     { label: 'מאמן/ת', emoji: '🎯' },
        student:   { label: 'סטודנט/ית', emoji: '📚' },
        self:      { label: 'צמיחה אישית', emoji: '✨' }
    };

    var LEVEL_LABELS = {
        beginner:     'מתחיל/ה',
        intermediate: 'בינוני',
        advanced:     'מתקדם/ת'
    };

    /* ── State ── */
    var currentStep = 1;
    var selectedRole = null;
    var selectedLevel = null;
    var overlay, card;

    /* ── Helpers ── */
    function getProfile() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
        } catch (e) {
            return null;
        }
    }

    function saveProfile(role, level) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: role, level: level }));
        } catch (e) { /* ignore */ }
    }

    function isDismissed() {
        try {
            return localStorage.getItem(DISMISSED_KEY) === '1';
        } catch (e) {
            return false;
        }
    }

    function setDismissed() {
        try {
            localStorage.setItem(DISMISSED_KEY, '1');
        } catch (e) { /* ignore */ }
    }

    function clearDismissed() {
        try {
            localStorage.removeItem(DISMISSED_KEY);
            LEGACY_DISMISSED_KEYS.forEach(function (key) {
                localStorage.removeItem(key);
            });
        } catch (e) { /* ignore */ }
    }

    function getRecommendation(role, level) {
        if (level === 'beginner') return RECOMMENDATIONS.beginner;
        if (level === 'intermediate') return RECOMMENDATIONS.intermediate;
        if (role === 'therapist' || role === 'coach') return RECOMMENDATIONS.advanced_therapist;
        return RECOMMENDATIONS.advanced_other;
    }

    function navigateToRecommendation(rec) {
        if (!rec) return;

        if (rec.href) {
            var targetHref = (typeof window.__withAssetVersion === 'function')
                ? window.__withAssetVersion(rec.href)
                : rec.href;
            window.location.href = targetHref;
            return;
        }

        if (rec.navKey && typeof window.navigateByNavKey === 'function') {
            if (window.navigateByNavKey(rec.navKey, { versioned: true, featureEntry: 'welcome' }) !== false) {
                return;
            }
        }

        if (rec.navKey && typeof window.navigateTo === 'function') {
            var navKeyToTab = {
                practiceWizard:       'practice-wizard',
                practiceQuestion:     'practice-question',
                practiceTriplesRadar: 'practice-triples-radar',
                prismLab:             'prismlab',
                categories:           'categories'
            };
            var tabId = navKeyToTab[rec.navKey];
            if (tabId) window.navigateTo(tabId, { featureEntry: 'welcome' });
        }
    }

    function syncChoiceSelections() {
        if (!overlay) return;

        overlay.querySelectorAll('[data-ob-step="1"] .mm-ob-choice').forEach(function (btn) {
            btn.classList.toggle('is-selected', btn.getAttribute('data-role') === selectedRole);
        });

        overlay.querySelectorAll('[data-ob-step="2"] .mm-ob-choice').forEach(function (btn) {
            btn.classList.toggle('is-selected', btn.getAttribute('data-level') === selectedLevel);
        });
    }

    function resetToStep(step) {
        if (!overlay) return;

        currentStep = step;
        overlay.querySelectorAll('.mm-ob-step').forEach(function (stepNode) {
            var nodeStep = Number(stepNode.getAttribute('data-ob-step') || '0');
            stepNode.hidden = nodeStep !== step;
            stepNode.classList.remove('is-leaving');
        });
        updateDots(step);
    }

    function showOverlay(startStep) {
        if (!overlay) return;

        var step = startStep || 1;
        resetToStep(step);
        syncChoiceSelections();
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        overlay.classList.remove('is-exiting');
        void overlay.offsetHeight;
        overlay.classList.add('is-visible');
    }

    function closeOverlay(onClosed) {
        if (!overlay) return;

        overlay.classList.add('is-exiting');
        setTimeout(function () {
            overlay.hidden = true;
            overlay.setAttribute('aria-hidden', 'true');
            overlay.classList.remove('is-exiting', 'is-visible');
            if (typeof onClosed === 'function') onClosed();
        }, 480);
    }

    function reopenOnboarding(profile) {
        var safeProfile = profile && typeof profile === 'object' ? profile : getProfile() || {};
        selectedRole = safeProfile.role || null;
        selectedLevel = safeProfile.level || null;
        showOverlay(1);
    }

    /* ── Progress dots ── */
    function updateDots(step) {
        var dots = overlay.querySelectorAll('.mm-ob-dot');
        dots.forEach(function (dot, i) {
            var stepNum = i + 1;
            dot.classList.toggle('is-active', stepNum === step);
            dot.classList.toggle('is-done', stepNum < step);
        });
    }

    /* ── Step navigation ── */
    function showStep(nextStep) {
        var currentEl = overlay.querySelector('[data-ob-step="' + currentStep + '"]');
        var nextEl    = overlay.querySelector('[data-ob-step="' + nextStep + '"]');
        if (!currentEl || !nextEl) return;

        currentEl.classList.add('is-leaving');
        setTimeout(function () {
            currentEl.hidden = true;
            currentEl.classList.remove('is-leaving');
            nextEl.hidden = false;
            nextEl.style.animation = 'none';
            /* force reflow */
            void nextEl.offsetHeight;
            nextEl.style.animation = '';
            currentStep = nextStep;
            updateDots(nextStep);
        }, 260);
    }

    /* ── Build result step ── */
    function populateResult(role, level) {
        var rec = getRecommendation(role, level);
        var roleMeta  = ROLE_LABELS[role]  || { label: role,   emoji: '✨' };
        var levelMeta = LEVEL_LABELS[level] || level;

        overlay.querySelector('#mm-ob-result-emoji').textContent = rec.emoji;
        overlay.querySelector('#mm-ob-result-name').textContent  = rec.name;
        overlay.querySelector('#mm-ob-result-desc').textContent  = rec.desc;
        overlay.querySelector('#mm-ob-result-intro').textContent =
            'בהתאם למה שסיפרת, הכלי הכי מתאים לך הוא:';
    }

    /* ── Close overlay and go ── */
    function launchAndClose(role, level) {
        var rec = getRecommendation(role, level);
        setDismissed();
        closeOverlay(function () {
            injectGreetingBar(role, level);
            navigateToRecommendation(rec);
        });
    }

    function exploreAndClose() {
        setDismissed();
        closeOverlay(function () {
            var profile = getProfile();
            if (profile && profile.role && profile.level && currentStep < 3) {
                injectGreetingBar(profile.role, profile.level);
                return;
            }
            if (selectedRole && selectedLevel) {
                injectGreetingBar(selectedRole, selectedLevel);
                return;
            }
            if (profile && profile.role && profile.level) {
                injectGreetingBar(profile.role, profile.level);
            }
        });
    }

    /* ── Greeting bar ── */
    function legacyInjectGreetingBar(role, level) {
        var roleMeta  = ROLE_LABELS[role]  || { label: role,   emoji: '✨' };
        var levelMeta = LEVEL_LABELS[level] || level;
        var homeSection = document.getElementById('home');
        if (!homeSection) return;

        var existing = document.getElementById('mm-home-greeting');
        if (existing) existing.remove();

        var bar = document.createElement('div');
        bar.id = 'mm-home-greeting';
        bar.className = 'mm-home-greeting is-visible';
        bar.setAttribute('aria-label', 'ברכת כניסה');
        bar.innerHTML =
            '<span class="mm-home-greeting-emoji">' + roleMeta.emoji + '</span>' +
            '<div class="mm-home-greeting-text">' +
                '<strong>שלום, ' + roleMeta.label + '!</strong>' +
                '<small>המסלול המומלץ שלך: ' + getRecommendation(role, level).name + '</small>' +
            '</div>' +
            '<button class="mm-home-greeting-reset" type="button" aria-label="אפס פרופיל">שנה פרופיל</button>';

        homeSection.insertAdjacentElement('afterbegin', bar);

        bar.querySelector('.mm-home-greeting-reset').addEventListener('click', function () {
            try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
            clearDismissed();
            bar.remove();
        });
    }

    function injectGreetingBar(role, level) {
        var roleMeta = ROLE_LABELS[role] || { label: role, emoji: '✨' };
        var levelMeta = LEVEL_LABELS[level] || level;
        var rec = getRecommendation(role, level);
        var homeSection = document.getElementById('home');
        if (!homeSection) return;

        var existing = document.getElementById('mm-home-greeting');
        if (existing) existing.remove();

        var bar = document.createElement('div');
        bar.id = 'mm-home-greeting';
        bar.className = 'mm-home-greeting is-visible';
        bar.setAttribute('aria-label', 'ברכת כניסה');
        bar.innerHTML =
            '<span class="mm-home-greeting-emoji">' + roleMeta.emoji + '</span>' +
            '<div class="mm-home-greeting-text">' +
                '<strong>המשך/י כ' + roleMeta.label + '</strong>' +
                '<small>' + levelMeta + ' | ' + rec.name + '</small>' +
            '</div>' +
            '<div class="mm-home-greeting-actions">' +
                '<button class="mm-home-greeting-continue" type="button" aria-label="המשך למסלול המומלץ">המשך/י עכשיו</button>' +
                '<button class="mm-home-greeting-reset" type="button" aria-label="שינוי בחירה">שינוי</button>' +
            '</div>';

        homeSection.insertAdjacentElement('afterbegin', bar);

        bar.querySelector('.mm-home-greeting-continue').addEventListener('click', function () {
            navigateToRecommendation(rec);
        });

        bar.querySelector('.mm-home-greeting-reset').addEventListener('click', function () {
            reopenOnboarding({ role: role, level: level });
        });
    }

    function showReturningGreeting(profile) {
        // Small delay to let the home screen render
        setTimeout(function () {
            injectGreetingBar(profile.role, profile.level);
        }, 500);
    }

    /* ── Event wiring ── */
    function wireStep1() {
        var choices = overlay.querySelectorAll('[data-ob-step="1"] .mm-ob-choice');
        choices.forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectedRole = btn.getAttribute('data-role');
                // Visual selection feedback
                choices.forEach(function (b) { b.classList.remove('is-selected'); });
                btn.classList.add('is-selected');
                // Brief pause so user sees selection, then advance
                setTimeout(function () { showStep(2); }, 340);
            });
        });
    }

    function wireStep2() {
        var choices = overlay.querySelectorAll('[data-ob-step="2"] .mm-ob-choice');
        choices.forEach(function (btn) {
            btn.addEventListener('click', function () {
                selectedLevel = btn.getAttribute('data-level');
                choices.forEach(function (b) { b.classList.remove('is-selected'); });
                btn.classList.add('is-selected');
                populateResult(selectedRole, selectedLevel);
                setTimeout(function () {
                    saveProfile(selectedRole, selectedLevel);
                    showStep(3);
                }, 340);
            });
        });
    }

    function wireStep3() {
        var launchBtn  = overlay.querySelector('#mm-ob-launch-btn');
        var exploreBtn = overlay.querySelector('#mm-ob-explore-btn');
        if (launchBtn) {
            launchBtn.addEventListener('click', function () {
                launchAndClose(selectedRole, selectedLevel);
            });
        }
        if (exploreBtn) {
            exploreBtn.addEventListener('click', function () {
                exploreAndClose();
            });
        }
    }

    function wireDismissActions() {
        var dismissButtons = overlay.querySelectorAll('[data-ob-dismiss]');
        dismissButtons.forEach(function (btn) {
            btn.addEventListener('click', function () {
                exploreAndClose();
            });
        });

        var backdrop = overlay.querySelector('.mm-ob-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', function () {
                exploreAndClose();
            });
        }

        document.addEventListener('keydown', function (event) {
            if (event.key !== 'Escape') return;
            if (!overlay || overlay.hidden || !overlay.classList.contains('is-visible')) return;
            exploreAndClose();
        });
    }

    /* ── Init ── */
    function legacyInitUnused() {
        overlay = document.getElementById('mm-onboarding');
        if (!overlay) return;
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');

        var profile = getProfile();
        if (profile && profile.role && profile.level) {
            // Returning user — just show greeting bar, no overlay
            showReturningGreeting(profile);
            return;
        }

        // First visit — show onboarding after splash
        if (isDismissed()) {
            return;
        }

        wireStep1();
        wireStep2();
        wireStep3();
        wireDismissActions();
        updateDots(1);

        setTimeout(function () {
            overlay.hidden = false;
            overlay.setAttribute('aria-hidden', 'false');
            // Force reflow before adding is-visible for CSS transition
            void overlay.offsetHeight;
            overlay.classList.add('is-visible');
        }, SPLASH_DURATION_MS);
    }

    function init() {
        overlay = document.getElementById('mm-onboarding');
        if (!overlay) return;
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');

        wireStep1();
        wireStep2();
        wireStep3();
        wireDismissActions();
        updateDots(1);

        var profile = getProfile();
        if (profile && profile.role && profile.level) {
            showReturningGreeting(profile);
            return;
        }

        if (isDismissed()) {
            return;
        }

        setTimeout(function () {
            showOverlay(1);
        }, SPLASH_DURATION_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
