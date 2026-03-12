/**
 * onboarding.js
 * Duolingo-style 3-step onboarding for Meta Model app.
 * Shown once on first visit; profile saved to localStorage.
 * On subsequent visits shows a personalised greeting bar.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'mm_user_profile';
    var DISMISSED_KEY = 'mm_onboarding_dismissed_v1';
    var SPLASH_DURATION_MS = 3700; // wait until after splash fades

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
            name: 'סימולטור סצנות',
            desc: 'בחר תגובה בשיחה חיה וראה לאן הלחץ הולך',
            navKey: null,
            href: 'scenario_trainer.html'
        },
        advanced_other: {
            emoji: '🔬',
            name: 'מעבדת פריזמות',
            desc: 'חקירה שכבתית של מילה אחת — עם רמות לוגיות וכיוון פרקטי',
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
        } catch (e) { /* ignore */ }
    }

    function getRecommendation(role, level) {
        if (level === 'beginner') return RECOMMENDATIONS.beginner;
        if (level === 'intermediate') return RECOMMENDATIONS.intermediate;
        if (role === 'therapist' || role === 'coach') return RECOMMENDATIONS.advanced_therapist;
        return RECOMMENDATIONS.advanced_other;
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
        overlay.classList.add('is-exiting');
        setTimeout(function () {
            overlay.hidden = true;
            overlay.setAttribute('aria-hidden', 'true');
            overlay.classList.remove('is-exiting', 'is-visible');
            injectGreetingBar(role, level);
            // Navigate to recommended tool
            if (rec.href) {
                // Use versioned asset URL helper if available to avoid relative-path 404s
                var targetHref = (typeof window.__withAssetVersion === 'function')
                    ? window.__withAssetVersion(rec.href)
                    : rec.href;
                window.location.href = targetHref;
            } else if (rec.navKey && typeof window.navigateByNavKey === 'function') {
                window.navigateByNavKey(rec.navKey);
            } else if (rec.navKey && typeof window.navigateTo === 'function') {
                // navKey to tabId mapping
                var navKeyToTab = {
                    practiceWizard:       'practice-wizard',
                    practiceQuestion:     'practice-question',
                    practiceTriplesRadar: 'practice-triples-radar',
                    prismLab:             'prismlab',
                    categories:           'categories'
                };
                var tabId = navKeyToTab[rec.navKey];
                if (tabId) window.navigateTo(tabId);
            }
        }, 480);
    }

    function exploreAndClose() {
        setDismissed();
        overlay.classList.add('is-exiting');
        setTimeout(function () {
            overlay.hidden = true;
            overlay.setAttribute('aria-hidden', 'true');
            overlay.classList.remove('is-exiting', 'is-visible');
            if (selectedRole && selectedLevel) {
                injectGreetingBar(selectedRole, selectedLevel);
            }
        }, 480);
    }

    /* ── Greeting bar ── */
    function injectGreetingBar(role, level) {
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
    function init() {
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

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
