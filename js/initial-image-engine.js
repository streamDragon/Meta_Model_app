/**
 * Initial Image vs Deep Structure Engine
 * תמונה ראשונית מול מבנה עומק
 *
 * Practice screen for the surface-to-deep-structure training feature.
 * Data-driven: exercises are defined in EXERCISES array below.
 */
(function attachInitialImageEngine(window, document) {
    'use strict';
    if (!window || !document || window.__initialImageEngineAttached) return;
    window.__initialImageEngineAttached = true;

    var ROOT_ID = 'initial-image-engine-root';
    var STORAGE_KEY = 'initial_image_deep_state_v1';
    var CSS_PREFIX = 'iids';

    // ─── EXERCISE DATA ───────────────────────────────────────
    var EXERCISES = [
        {
            id: 'initial-image-vs-deep-structure-anger-01',
            feature: 'initial-image-vs-deep-structure',
            title: 'תמונה ראשונית מול מבנה עומק',
            originalSentence: 'הוא הרגיז אותי אז צרחתי עליו',
            imageA: 'assets/images/initial-image-vs-deep-structure/anger_initial.jpg',
            imageB: 'assets/images/initial-image-vs-deep-structure/anger_deep.jpg',
            imageGrid: { rows: 3, cols: 3 },
            textSlots: [
                { id: 'd1', category: 'deletion', order: 1, row: 0, col: 0 },
                { id: 'd2', category: 'deletion', order: 2, row: 0, col: 1 },
                { id: 'd3', category: 'deletion', order: 3, row: 0, col: 2 },
                { id: 'x1', category: 'distortion', order: 1, row: 1, col: 0 },
                { id: 'x2', category: 'distortion', order: 2, row: 1, col: 1 },
                { id: 'x3', category: 'distortion', order: 3, row: 1, col: 2 },
                { id: 'g1', category: 'generalization', order: 1, row: 2, col: 0 },
                { id: 'g2', category: 'generalization', order: 2, row: 2, col: 1 },
                { id: 'g3', category: 'generalization', order: 3, row: 2, col: 2 }
            ],
            reveals: {
                deletion: [
                    {
                        id: 'deletion-1',
                        text: 'כשדיבר אליי בטון מסוים',
                        question: 'אחרי מה זה קרה? מה היה ההקשר המדויק?',
                        rationale: 'השאלה מחזירה את ההקשר שנמחק, כדי שהמשפט לא יישמע כאילו הופיע בלי סיבה ובלי רצף.',
                        targetTextSlot: 'd1',
                        targetImageTiles: [0]
                    },
                    {
                        id: 'deletion-2',
                        text: 'ואני לא פירקתי מה בדיוק קרה',
                        question: 'מה בדיוק הוא עשה או אמר?',
                        rationale: 'השאלה מחליפה כותרת כללית כמו \'הרגיז\' בתיאור מדויק יותר של מה שקרה בפועל.',
                        targetTextSlot: 'd2',
                        targetImageTiles: [1]
                    },
                    {
                        id: 'deletion-3',
                        text: 'וגם לא שמתי לב מה קרה לי בגוף',
                        question: 'מה קרה לך בפנים באותו רגע?',
                        rationale: 'השאלה מחזירה את החוויה הפנימית שנמחקה מן המשפט, כי לעיתים שם נמצאת חוליה קריטית להבנה.',
                        targetTextSlot: 'd3',
                        targetImageTiles: [6]
                    }
                ],
                distortion: [
                    {
                        id: 'distortion-1',
                        text: 'פירשתי את זה כהשפלה',
                        question: 'איך זה נהיה אצלך השפלה?',
                        rationale: 'השאלה מפרידה בין מה שקרה בפועל לבין המשמעות שנבנתה סביבו בתוך עולמו של האדם.',
                        targetTextSlot: 'x1',
                        targetImageTiles: [2]
                    },
                    {
                        id: 'distortion-2',
                        text: 'הרגשתי שאני קטן וחסר אונים',
                        question: 'מה זה גרם לך להרגיש על עצמך?',
                        rationale: 'השאלה חושפת את התרגום האישי שהאירוע קיבל ואת הדרך שבה הוא פגע בתחושת העצמי.',
                        targetTextSlot: 'x2',
                        targetImageTiles: [3]
                    },
                    {
                        id: 'distortion-3',
                        text: 'ובתוכי זה נהיה כאילו חייבים להחזיר כוח',
                        question: 'איך זה נהיה אצלך משהו שחייבים להגיב אליו כך?',
                        rationale: 'השאלה חושפת את המעבר ממשמעות רגשית לתחושת הכרח פנימית.',
                        targetTextSlot: 'x3',
                        targetImageTiles: [7]
                    }
                ],
                generalization: [
                    {
                        id: 'generalization-1',
                        text: 'כי אצלי כשמשפילים אותי אסור להישאר חלש',
                        question: 'איזה חוק פעל אצלך במצב הזה?',
                        rationale: 'השאלה מחפשת את החוק הרחב או הכלל הפנימי שפועלים מאחורי התגובה.',
                        targetTextSlot: 'g1',
                        targetImageTiles: [5]
                    },
                    {
                        id: 'generalization-2',
                        text: 'ובתור ילד זו הייתה דרך מוכרת להגן על עצמי',
                        question: 'מאיפה למדת שזו הדרך להגיב?',
                        rationale: 'השאלה מחפשת את מקור הדפוס ומראה שהתגובה נשענת על למידה קודמת, לא רק על הרגע הנוכחי.',
                        targetTextSlot: 'g2',
                        targetImageTiles: [8]
                    },
                    {
                        id: 'generalization-3',
                        text: 'ולכן הצעקה הרגישה כמעט בלתי נמנעת',
                        question: 'איך זה נהיה משהו שמרגיש כאילו אין דרך אחרת?',
                        rationale: 'השאלה עוזרת לחשוף שה\'הכרח\' הוא מבנה פנימי שנבנה, ולא חוק טבע.',
                        targetTextSlot: 'g3',
                        targetImageTiles: [4]
                    }
                ]
            },
            completionPrompt: {
                title: 'עכשיו התמונה רחבה יותר',
                text: 'מה אתה מבין עכשיו שלא היה ברור לפני החקירה? איך השתנתה ההבנה שלך לגבי המשפט ולגבי האדם שאמר אותו?',
                closing: 'הגעת למבנה עומק רחב יותר. עכשיו אפשר להמשיך את הטיפול מתוך הבנה מדויקת יותר.'
            }
        }
    ];

    // ─── STATE ────────────────────────────────────────────────
    var currentExercise = null;
    var revealedIds = [];      // ids of revealed items
    var currentReveal = null;  // last revealed item (for yellow/blue boxes)
    var rootEl = null;
    var mounted = false;

    // ─── HELPERS ──────────────────────────────────────────────
    function esc(value) {
        return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function getRevealedCount(category) {
        if (!currentExercise) return 0;
        var reveals = currentExercise.reveals[category] || [];
        var count = 0;
        for (var i = 0; i < reveals.length; i++) {
            if (revealedIds.indexOf(reveals[i].id) !== -1) count++;
        }
        return count;
    }

    function getNextReveal(category) {
        if (!currentExercise) return null;
        var reveals = currentExercise.reveals[category] || [];
        for (var i = 0; i < reveals.length; i++) {
            if (revealedIds.indexOf(reveals[i].id) === -1) return reveals[i];
        }
        return null;
    }

    function getTotalReveals() {
        if (!currentExercise) return 0;
        return (currentExercise.reveals.deletion || []).length +
               (currentExercise.reveals.distortion || []).length +
               (currentExercise.reveals.generalization || []).length;
    }

    function isComplete() {
        return revealedIds.length >= getTotalReveals();
    }

    function isSlotRevealed(slotId) {
        if (!currentExercise) return false;
        var categories = ['deletion', 'distortion', 'generalization'];
        for (var c = 0; c < categories.length; c++) {
            var reveals = currentExercise.reveals[categories[c]] || [];
            for (var r = 0; r < reveals.length; r++) {
                if (reveals[r].targetTextSlot === slotId && revealedIds.indexOf(reveals[r].id) !== -1) {
                    return reveals[r];
                }
            }
        }
        return false;
    }

    function isTileRevealed(tileIndex) {
        if (!currentExercise) return false;
        var categories = ['deletion', 'distortion', 'generalization'];
        for (var c = 0; c < categories.length; c++) {
            var reveals = currentExercise.reveals[categories[c]] || [];
            for (var r = 0; r < reveals.length; r++) {
                if (revealedIds.indexOf(reveals[r].id) !== -1 &&
                    reveals[r].targetImageTiles &&
                    reveals[r].targetImageTiles.indexOf(tileIndex) !== -1) {
                    return true;
                }
            }
        }
        return false;
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                exerciseId: currentExercise ? currentExercise.id : null,
                revealedIds: revealedIds,
                currentRevealId: currentReveal ? currentReveal.id : null
            }));
        } catch (e) { /* ignore */ }
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    // ─── RENDER ───────────────────────────────────────────────
    function renderAll() {
        if (!rootEl || !currentExercise) return;
        var ex = currentExercise;
        var grid = ex.imageGrid;
        var totalTiles = grid.rows * grid.cols;
        var complete = isComplete();

        var html = [];

        // ── Image panel label
        html.push('<div class="' + CSS_PREFIX + '-image-label">' + esc(complete ? 'התמונה נחשפת מחדש' : 'התמונה הראשונית') + '</div>');

        // ── Top panel: image grid
        html.push('<div class="' + CSS_PREFIX + '-image-panel">');
        html.push('<div class="' + CSS_PREFIX + '-image-grid" style="--iids-grid-rows:' + grid.rows + ';--iids-grid-cols:' + grid.cols + ';">');
        for (var t = 0; t < totalTiles; t++) {
            var revealed = isTileRevealed(t);
            var row = Math.floor(t / grid.cols);
            var col = t % grid.cols;
            var pctX = grid.cols > 1 ? (col / (grid.cols - 1)) * 100 : 50;
            var pctY = grid.rows > 1 ? (row / (grid.rows - 1)) * 100 : 50;
            html.push(
                '<div class="' + CSS_PREFIX + '-tile' + (revealed ? ' is-revealed' : '') + '" data-tile="' + t + '">' +
                '<div class="' + CSS_PREFIX + '-tile-inner">' +
                '<div class="' + CSS_PREFIX + '-tile-face ' + CSS_PREFIX + '-tile-a" style="background-image:url(\'' + esc(ex.imageA) + '\');background-position:' + pctX + '% ' + pctY + '%;"></div>' +
                '<div class="' + CSS_PREFIX + '-tile-face ' + CSS_PREFIX + '-tile-b" style="background-image:url(\'' + esc(ex.imageB) + '\');background-position:' + pctX + '% ' + pctY + '%;"></div>' +
                '</div></div>'
            );
        }
        html.push('</div></div>');

        // ── Action buttons
        var categories = [
            { key: 'deletion', label: 'השמטה', sub: 'מה חסר כאן?' },
            { key: 'distortion', label: 'עיוות', sub: 'איזה פירוש נכנס?' },
            { key: 'generalization', label: 'הכללה', sub: 'איזה כלל פועל כאן?' }
        ];
        html.push('<div class="' + CSS_PREFIX + '-actions">');
        for (var b = 0; b < categories.length; b++) {
            var cat = categories[b];
            var catReveals = (ex.reveals[cat.key] || []).length;
            var catDone = getRevealedCount(cat.key);
            var catExhausted = catDone >= catReveals;
            html.push(
                '<button type="button" class="' + CSS_PREFIX + '-action-btn' +
                (catExhausted ? ' is-exhausted' : '') +
                '" data-category="' + cat.key + '"' +
                (catExhausted ? ' disabled' : '') + '>' +
                '<span class="' + CSS_PREFIX + '-action-label">' + esc(cat.label) + '</span>' +
                '<span class="' + CSS_PREFIX + '-action-sub">' + esc(cat.sub) + '</span>' +
                '<span class="' + CSS_PREFIX + '-action-count">' + catDone + '/' + catReveals + '</span>' +
                '</button>'
            );
        }
        html.push('</div>');

        // ── Bottom panel: core sentence + text grid
        html.push('<div class="' + CSS_PREFIX + '-text-panel">');
        // Core sentence above the grid
        html.push(
            '<div class="' + CSS_PREFIX + '-text-cell ' + CSS_PREFIX + '-text-core">' +
            '<span class="' + CSS_PREFIX + '-core-sentence">' + esc(ex.originalSentence) + '</span>' +
            '</div>'
        );
        // Reveal slots grid (all non-core)
        html.push('<div class="' + CSS_PREFIX + '-text-grid">');
        var slots = ex.textSlots;
        var maxRow = 0; var maxCol = 0;
        for (var s = 0; s < slots.length; s++) {
            if (slots[s].row > maxRow) maxRow = slots[s].row;
            if (slots[s].col > maxCol) maxCol = slots[s].col;
        }
        var textRows = maxRow + 1;
        var textCols = maxCol + 1;
        html.push('<div class="' + CSS_PREFIX + '-text-cells" style="--iids-text-rows:' + textRows + ';--iids-text-cols:' + textCols + ';">');
        for (var si = 0; si < slots.length; si++) {
            var slot = slots[si];
            var revealData = isSlotRevealed(slot.id);
            var catClass = slot.category === 'deletion' ? 'del' : slot.category === 'distortion' ? 'dis' : 'gen';
            html.push(
                '<div class="' + CSS_PREFIX + '-text-cell ' + CSS_PREFIX + '-text-slot ' + CSS_PREFIX + '-cat-' + catClass +
                (revealData ? ' is-revealed' : '') +
                '" data-slot="' + esc(slot.id) + '" style="grid-row:' + (slot.row + 1) + ';grid-column:' + (slot.col + 1) + ';">' +
                (revealData ? '<span class="' + CSS_PREFIX + '-slot-text">' + esc(revealData.text) + '</span>' : '<span class="' + CSS_PREFIX + '-slot-placeholder">?</span>') +
                '</div>'
            );
        }
        html.push('</div></div></div>');

        // ── Yellow box (question) and blue box (rationale)
        if (currentReveal && !complete) {
            html.push(
                '<div class="' + CSS_PREFIX + '-info-boxes">' +
                '<div class="' + CSS_PREFIX + '-box-yellow">' +
                '<span class="' + CSS_PREFIX + '-box-label">השאלה שנשאלת עכשיו</span>' +
                '<p>' + esc(currentReveal.question) + '</p>' +
                '</div>' +
                '<div class="' + CSS_PREFIX + '-box-blue">' +
                '<span class="' + CSS_PREFIX + '-box-label">למה השאלה הזו</span>' +
                '<p>' + esc(currentReveal.rationale) + '</p>' +
                '</div>' +
                '</div>'
            );
        } else if (!currentReveal && !complete) {
            html.push(
                '<div class="' + CSS_PREFIX + '-info-boxes">' +
                '<div class="' + CSS_PREFIX + '-box-yellow ' + CSS_PREFIX + '-box-initial">' +
                '<span class="' + CSS_PREFIX + '-box-label">התחילו לחקור</span>' +
                '<p>לחצו על אחד מהכפתורים למעלה כדי להתחיל לחשוף את מבנה העומק.</p>' +
                '</div>' +
                '</div>'
            );
        }

        // ── Completion card
        if (complete) {
            var cp = ex.completionPrompt;
            html.push(
                '<div class="' + CSS_PREFIX + '-completion">' +
                '<div class="' + CSS_PREFIX + '-completion-card">' +
                '<h3>' + esc(cp.title) + '</h3>' +
                '<p class="' + CSS_PREFIX + '-completion-text">' + esc(cp.text) + '</p>' +
                '<p class="' + CSS_PREFIX + '-completion-closing">' + esc(cp.closing) + '</p>' +
                '<button type="button" class="' + CSS_PREFIX + '-restart-btn">תרגול נוסף</button>' +
                '</div>' +
                '</div>'
            );
        }

        // ── Progress indicator
        html.push(
            '<div class="' + CSS_PREFIX + '-progress">' +
            '<span>' + revealedIds.length + ' / ' + getTotalReveals() + ' חשיפות</span>' +
            '<div class="' + CSS_PREFIX + '-progress-bar"><div class="' + CSS_PREFIX + '-progress-fill" style="width:' + (getTotalReveals() > 0 ? Math.round((revealedIds.length / getTotalReveals()) * 100) : 0) + '%;"></div></div>' +
            '</div>'
        );

        rootEl.innerHTML = html.join('');

        // ── Bind events
        bindEvents();
    }

    function bindEvents() {
        if (!rootEl) return;

        // Action buttons
        var btns = rootEl.querySelectorAll('.' + CSS_PREFIX + '-action-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', handleCategoryClick);
        }

        // Restart button
        var restartBtn = rootEl.querySelector('.' + CSS_PREFIX + '-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', function () {
                revealedIds = [];
                currentReveal = null;
                saveState();
                renderAll();
            });
        }
    }

    function handleCategoryClick(event) {
        var btn = event.currentTarget;
        var category = btn.getAttribute('data-category');
        if (!category) return;

        var reveal = getNextReveal(category);
        if (!reveal) return;

        revealedIds.push(reveal.id);
        currentReveal = reveal;
        saveState();

        // Award XP if gamification is available
        if (typeof window.awardMetaGamificationXp === 'function') {
            window.awardMetaGamificationXp(5, 'initial-image-vs-deep-structure');
        }

        renderAll();

        // Smooth scroll to info boxes after reveal
        var infoBoxes = rootEl.querySelector('.' + CSS_PREFIX + '-info-boxes');
        if (infoBoxes) {
            setTimeout(function () {
                infoBoxes.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    // ─── MOUNT ────────────────────────────────────────────────
    function mount() {
        rootEl = document.getElementById(ROOT_ID);
        if (!rootEl || mounted) return;
        mounted = true;

        // Pick exercise (first for now; expandable later)
        currentExercise = EXERCISES[0];

        // Restore state if available
        var saved = loadState();
        if (saved && saved.exerciseId === currentExercise.id) {
            revealedIds = Array.isArray(saved.revealedIds) ? saved.revealedIds : [];
            if (saved.currentRevealId) {
                var categories = ['deletion', 'distortion', 'generalization'];
                for (var c = 0; c < categories.length; c++) {
                    var reveals = currentExercise.reveals[categories[c]] || [];
                    for (var r = 0; r < reveals.length; r++) {
                        if (reveals[r].id === saved.currentRevealId) {
                            currentReveal = reveals[r];
                        }
                    }
                }
            }
        }

        renderAll();
    }

    // ─── CONTROLLER (for shell nav) ──────────────────────────
    window.__metaFeatureControllers = window.__metaFeatureControllers || {};
    window.__metaFeatureControllers['initial-image-vs-deep-structure'] = {
        stepBack: function () {
            return false; // let the shell handle back navigation
        },
        canRestart: function () { return true; },
        restart: function () {
            revealedIds = [];
            currentReveal = null;
            saveState();
            renderAll();
            return true;
        }
    };

    // ─── BOOT ─────────────────────────────────────────────────
    function tryMount() {
        if (document.getElementById(ROOT_ID)) mount();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryMount, { once: true });
    } else {
        tryMount();
    }

    // Also observe tab switches to mount when needed
    if (typeof MutationObserver === 'function' && document.body) {
        var observer = new MutationObserver(function () {
            if (!mounted && document.getElementById(ROOT_ID)) {
                mount();
            }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
    }

})(window, document);
