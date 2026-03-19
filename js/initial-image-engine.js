/**
 * Initial Image vs Deep Structure Engine
 * מתמונת שטח למבנה עומק
 *
 * Three-phase engine: guess → reveal → complete
 * Data-driven: exercises defined in EXERCISES array below.
 */
(function attachInitialImageEngine(window, document) {
    'use strict';
    if (!window || !document || window.__initialImageEngineAttached) return;
    window.__initialImageEngineAttached = true;

    var ROOT_ID = 'initial-image-engine-root';
    var STORAGE_KEY = 'initial_image_deep_state_v2';
    var CSS_PREFIX = 'iids';

    // ─── EXERCISE DATA ───────────────────────────────────────
    var EXERCISES = [
        {
            id: 'initial-image-vs-deep-structure-couple-01',
            feature: 'initial-image-vs-deep-structure',
            title: 'מתמונת שטח למבנה עומק',
            originalSentence: 'כשהיא אמרה את זה ככה, הרגשתי מושפל ופשוט נאטמתי.',
            subjectName: 'אורי',
            hypothesisImages: [
                {
                    id: 'h1',
                    label: 'היא תוקפת אותו',
                    subtitle: 'הוא חווה אותה כתוקפת ומאשימה',
                    image: 'assets/images/initial-image-vs-deep-structure/couples_scene/couple_guess_1.jpg'
                },
                {
                    id: 'h2',
                    label: 'היא משפילה אותו',
                    subtitle: 'ביקורת נחווית אצלו כהשפלה',
                    image: 'assets/images/initial-image-vs-deep-structure/couples_scene/couple_guess_2.jpg'
                },
                {
                    id: 'h3',
                    label: 'אין לו סיכוי מולה',
                    subtitle: 'מולה הוא מרגיש שאין תשובה נכונה',
                    image: 'assets/images/initial-image-vs-deep-structure/couples_scene/couple_guess_3.jpg'
                }
            ],
            truthImage: 'assets/images/initial-image-vs-deep-structure/couples_scene/couple_truth.jpg',
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
                        text: 'היא אמרה: ״אי אפשר לדבר איתך על שום דבר רציני.״',
                        question: 'מה בדיוק היא אמרה שגרם לך להיסגר?',
                        rationale: 'השאלה מחזירה את המשפט המדויק במקום הכותרת הכללית ״היא השפילה אותי״.',
                        targetTextSlot: 'd1'
                    },
                    {
                        id: 'deletion-2',
                        text: 'זה היה בערב, אחרי כמה ימים של מתח בינינו.',
                        question: 'באיזה הקשר זה קרה?',
                        rationale: 'הקשר מחזיר רצף ונותן עומק למה שנשמע קודם כמו אירוע מבודד.',
                        targetTextSlot: 'd2'
                    },
                    {
                        id: 'deletion-3',
                        text: 'באותו רגע הגוף שלי נסגר והלב התחיל לדפוק.',
                        question: 'מה קרה לך בפנים באותו רגע?',
                        rationale: 'השאלה מחזירה את החוויה הפנימית שהושמטה מהמשפט.',
                        targetTextSlot: 'd3'
                    }
                ],
                distortion: [
                    {
                        id: 'distortion-1',
                        text: 'לא שמעתי בזה רק תסכול — שמעתי בזה שאני קטן ולא ראוי.',
                        question: 'איך זה נהיה אצלך השפלה ולא רק ביקורת?',
                        rationale: 'כאן נחשף הפירוש שנכנס בין מה שהיא אמרה לבין מה שהוא הרגיש.',
                        targetTextSlot: 'x1'
                    },
                    {
                        id: 'distortion-2',
                        text: 'אצלי ביקורת בלי ריכוך נחווית כמעט מיד כהשפלה.',
                        question: 'איזה כלל פנימי הופך ביקורת להשפלה?',
                        rationale: 'השאלה חושפת את העיוות: הביקורת נחווית כאמירה על הערך העצמי.',
                        targetTextSlot: 'x2'
                    },
                    {
                        id: 'distortion-3',
                        text: 'בתוכי זה נהיה כאילו היא לא מדברת איתי — אלא פוסקת על הערך שלי.',
                        question: 'מה המשמעות שנתת למילים שלה?',
                        rationale: 'השאלה מפרידה בין דבריה לבין המשמעות שהוא בנה סביבם.',
                        targetTextSlot: 'x3'
                    }
                ],
                generalization: [
                    {
                        id: 'generalization-1',
                        text: 'יש בי כלל ישן: כשאישה מאוכזבת ממני, עדיף להיסגר.',
                        question: 'איזה חוק פעל אצלך ברגע הזה?',
                        rationale: 'כאן מתגלה הכלל הרחב שמכוון את התגובה.',
                        targetTextSlot: 'g1'
                    },
                    {
                        id: 'generalization-2',
                        text: 'אני מכיר את התחושה הזו ממקומות מוקדמים שבהם לא היה לי איך לענות.',
                        question: 'מאיפה הדפוס הזה מוכר לך?',
                        rationale: 'השאלה מחברת את ההווה לדפוס ישן ולא משאירה הכול רק בזוגיות העכשווית.',
                        targetTextSlot: 'g2'
                    },
                    {
                        id: 'generalization-3',
                        text: 'לכן השתיקה הרגישה לא כמו בחירה, אלא כמו מנגנון ישן שקפץ לבד.',
                        question: 'איך זה נהיה כמעט בלתי נמנע?',
                        rationale: 'כאן רואים שה״אין ברירה״ הוא מבנה פנימי, לא חוק טבע.',
                        targetTextSlot: 'g3'
                    }
                ]
            },
            completionPrompt: {
                title: 'עכשיו רואים את המעבר מן החוץ אל הפנים',
                text: 'עכשיו כבר לא רואים רק את הסיפור החיצוני. רואים גם את הפירוש, את החוק, ואת החלק הפנימי שהופעל ברגע הזה.',
                closing: 'המטרה כאן איננה לבטל את החוויה החיצונית, אלא לראות איך היא נשענת על מבנה עומק שאפשר להבין, לשאול עליו, ולעבוד איתו טיפולית.'
            }
        }
    ];

    // ─── STATE ────────────────────────────────────────────────
    var currentExercise = null;
    var phase = 'guess';                   // 'guess' | 'reveal' | 'complete'
    var selectedHypothesisIndex = -1;      // confirmed choice
    var viewingHypothesisIndex = 0;        // currently browsed
    var revealedIds = [];
    var currentReveal = null;
    var revealedTileIndexes = [];
    var tileRevealOrder = [];
    var pendingTileReveal = -1;
    var rootEl = null;
    var mounted = false;

    // ─── HELPERS ──────────────────────────────────────────────
    function resolveAssetPath(path) {
        if (typeof window.__withAssetVersion === 'function') {
            try { return window.__withAssetVersion(path); } catch (e) { /* fall through */ }
        }
        return path;
    }

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    function initTileRevealOrder() {
        if (!currentExercise) return;
        var total = currentExercise.imageGrid.rows * currentExercise.imageGrid.cols;
        var indices = [];
        for (var i = 0; i < total; i++) indices.push(i);
        tileRevealOrder = shuffleArray(indices);
    }

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
        return revealedTileIndexes.indexOf(tileIndex) !== -1;
    }

    function getActiveImage() {
        if (!currentExercise) return '';
        if (phase === 'guess') {
            var hyps = currentExercise.hypothesisImages;
            var idx = viewingHypothesisIndex >= 0 && viewingHypothesisIndex < hyps.length ? viewingHypothesisIndex : 0;
            return hyps[idx].image;
        }
        // reveal / complete: use selected hypothesis
        var hyps2 = currentExercise.hypothesisImages;
        var si = selectedHypothesisIndex >= 0 && selectedHypothesisIndex < hyps2.length ? selectedHypothesisIndex : 0;
        return hyps2[si].image;
    }

    function saveState() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                exerciseId: currentExercise ? currentExercise.id : null,
                phase: phase,
                selectedHypothesisIndex: selectedHypothesisIndex,
                viewingHypothesisIndex: viewingHypothesisIndex,
                revealedIds: revealedIds,
                currentRevealId: currentReveal ? currentReveal.id : null,
                revealedTileIndexes: revealedTileIndexes,
                tileRevealOrder: tileRevealOrder
            }));
        } catch (e) { /* ignore */ }
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    // ─── TILE POSITION MATH ──────────────────────────────────
    // For a 3x3 grid with background-size: 300% 300%
    // each tile shows exactly 1/9 of the image.
    // background-position percentage formula:
    //   col/(cols-1)*100 , row/(rows-1)*100
    // This yields 0%, 50%, 100% for indices 0,1,2 which correctly
    // selects the left/centre/right (or top/centre/bottom) third.

    function tileBgPos(row, col, rows, cols) {
        var pctX = cols > 1 ? (col / (cols - 1)) * 100 : 50;
        var pctY = rows > 1 ? (row / (rows - 1)) * 100 : 50;
        return pctX + '% ' + pctY + '%';
    }

    // ─── RENDER ───────────────────────────────────────────────
    function renderAll() {
        if (!rootEl || !currentExercise) return;
        var ex = currentExercise;
        var grid = ex.imageGrid;
        var totalTiles = grid.rows * grid.cols;
        var complete = phase === 'complete';

        var html = [];
        var hyps = ex.hypothesisImages;
        var viewIdx = viewingHypothesisIndex;
        if (viewIdx < 0 || viewIdx >= hyps.length) viewIdx = 0;

        // ── Image panel label
        var labelText = complete ? 'מבנה העומק נחשף' : (phase === 'guess' ? 'תמונת השטח הנוכחית' : 'כאן המבנה העמוק מתחיל להיחשף');
        html.push('<div class="' + CSS_PREFIX + '-image-label">' + esc(labelText) + '</div>');

        // ── Top panel: image grid + optional carousel arrows
        html.push('<div class="' + CSS_PREFIX + '-image-panel">');

        // Hypothesis info bar (guess phase only)
        if (phase === 'guess') {
            html.push(
                '<div class="' + CSS_PREFIX + '-hyp-bar">' +
                '<span class="' + CSS_PREFIX + '-hyp-counter">' + (viewIdx + 1) + ' / ' + hyps.length + '</span>' +
                '<span class="' + CSS_PREFIX + '-hyp-label">' + esc(hyps[viewIdx].label) + '</span>' +
                '<span class="' + CSS_PREFIX + '-hyp-subtitle">' + esc(hyps[viewIdx].subtitle) + '</span>' +
                '</div>'
            );
        }

        // The grid itself
        var resolvedSurface = resolveAssetPath(getActiveImage());
        var resolvedTruth = resolveAssetPath(ex.truthImage);

        html.push('<div class="' + CSS_PREFIX + '-grid-wrap">');

        // Arrows (guess phase)
        if (phase === 'guess' && hyps.length > 1) {
            html.push('<button type="button" class="' + CSS_PREFIX + '-arrow ' + CSS_PREFIX + '-arrow-right" data-dir="prev" aria-label="הקודם">&rsaquo;</button>');
            html.push('<button type="button" class="' + CSS_PREFIX + '-arrow ' + CSS_PREFIX + '-arrow-left" data-dir="next" aria-label="הבא">&lsaquo;</button>');
        }

        html.push('<div class="' + CSS_PREFIX + '-image-grid' + (complete ? ' is-complete' : '') + '" style="--iids-grid-rows:' + grid.rows + ';--iids-grid-cols:' + grid.cols + ';">');

        var capturedPending = pendingTileReveal;
        pendingTileReveal = -1;

        for (var t = 0; t < totalTiles; t++) {
            var tileIsRevealed = isTileRevealed(t) && t !== capturedPending;
            var row = Math.floor(t / grid.cols);
            var col = t % grid.cols;
            var bgPos = tileBgPos(row, col, grid.rows, grid.cols);
            html.push(
                '<div class="' + CSS_PREFIX + '-tile' + (tileIsRevealed ? ' is-revealed' : '') + '" data-tile="' + t + '">' +
                '<div class="' + CSS_PREFIX + '-tile-inner">' +
                '<div class="' + CSS_PREFIX + '-tile-face ' + CSS_PREFIX + '-tile-a" style="background-image:url(\'' + esc(resolvedSurface) + '\');background-position:' + bgPos + ';"></div>' +
                '<div class="' + CSS_PREFIX + '-tile-face ' + CSS_PREFIX + '-tile-b" style="background-image:url(\'' + esc(resolvedTruth) + '\');background-position:' + bgPos + ';"></div>' +
                '</div></div>'
            );
        }
        html.push('</div>'); // grid
        html.push('</div>'); // grid-wrap
        html.push('</div>'); // image-panel

        // ── Confirm button (guess phase)
        if (phase === 'guess') {
            html.push(
                '<div class="' + CSS_PREFIX + '-confirm-wrap">' +
                '<p class="' + CSS_PREFIX + '-guess-instruction">' + esc('בחרו את תמונת השטח שנראית לכם הכי קרובה לפירוש הגלוי.') + '</p>' +
                '<button type="button" class="' + CSS_PREFIX + '-confirm-btn">' + esc('זה הפירוש הגלוי שאני רואה') + '</button>' +
                '</div>'
            );
        }

        // ── Reveal-phase instruction
        if (phase === 'reveal' && !complete) {
            html.push(
                '<p class="' + CSS_PREFIX + '-reveal-instruction">' +
                esc('לחצו על הכפתורים אחד אחד כדי לחשוף את התמונה האמיתית') +
                '</p>'
            );
        }

        // ── Action buttons
        var categories = [
            { key: 'deletion', label: 'השמטה', sub: 'מה חסר במפה?' },
            { key: 'distortion', label: 'עיוות', sub: 'איזה פירוש נכנס?' },
            { key: 'generalization', label: 'הכללה', sub: 'איזה כלל פועל כאן?' }
        ];
        var revealDisabled = phase === 'guess';
        html.push('<div class="' + CSS_PREFIX + '-actions">');
        for (var b = 0; b < categories.length; b++) {
            var cat = categories[b];
            var catReveals = (ex.reveals[cat.key] || []).length;
            var catDone = getRevealedCount(cat.key);
            var catExhausted = catDone >= catReveals;
            var btnDisabled = revealDisabled || catExhausted;
            html.push(
                '<button type="button" class="' + CSS_PREFIX + '-action-btn' +
                (catExhausted ? ' is-exhausted' : '') +
                (revealDisabled ? ' is-locked' : '') +
                '" data-category="' + cat.key + '"' +
                (btnDisabled ? ' disabled' : '') + '>' +
                '<span class="' + CSS_PREFIX + '-action-label">' + esc(cat.label) + '</span>' +
                '<span class="' + CSS_PREFIX + '-action-sub">' + esc(cat.sub) + '</span>' +
                '<span class="' + CSS_PREFIX + '-action-count">' + catDone + '/' + catReveals + '</span>' +
                '</button>'
            );
        }
        html.push('</div>');

        // ── Core sentence + text grid
        html.push('<div class="' + CSS_PREFIX + '-text-panel">');
        html.push(
            '<div class="' + CSS_PREFIX + '-text-cell ' + CSS_PREFIX + '-text-core">' +
            '<span class="' + CSS_PREFIX + '-core-sentence">' + esc(ex.originalSentence) + '</span>' +
            '</div>'
        );
        html.push('<div class="' + CSS_PREFIX + '-text-grid">');
        var slots = ex.textSlots;
        var maxRow = 0; var maxCol = 0;
        for (var s = 0; s < slots.length; s++) {
            if (slots[s].row > maxRow) maxRow = slots[s].row;
            if (slots[s].col > maxCol) maxCol = slots[s].col;
        }
        html.push('<div class="' + CSS_PREFIX + '-text-cells" style="--iids-text-rows:' + (maxRow + 1) + ';--iids-text-cols:' + (maxCol + 1) + ';">');
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

        // ── Yellow / blue info boxes
        if (phase === 'reveal' && currentReveal && !complete) {
            html.push(
                '<div class="' + CSS_PREFIX + '-info-boxes">' +
                '<div class="' + CSS_PREFIX + '-box-yellow">' +
                '<span class="' + CSS_PREFIX + '-box-label">שאלת העומק הנוכחית</span>' +
                '<p>' + esc(currentReveal.question) + '</p>' +
                '</div>' +
                '<div class="' + CSS_PREFIX + '-box-blue">' +
                '<span class="' + CSS_PREFIX + '-box-label">מה השאלה הזאת מחזירה למפה</span>' +
                '<p>' + esc(currentReveal.rationale) + '</p>' +
                '</div>' +
                '</div>'
            );
        } else if (phase === 'reveal' && !currentReveal && !complete) {
            html.push(
                '<div class="' + CSS_PREFIX + '-info-boxes">' +
                '<div class="' + CSS_PREFIX + '-box-yellow ' + CSS_PREFIX + '-box-initial">' +
                '<span class="' + CSS_PREFIX + '-box-label">לפני שמתחילים</span>' +
                '<p>עוד לפני ששואלים, המוח כבר משלים: מי אשם, מה הכוונה, ומה ״ברור״ שקרה. כאן מנסים לעצור רגע לפני הסגירה.</p>' +
                '</div>' +
                '</div>'
            );
        } else if (phase === 'guess') {
            html.push(
                '<div class="' + CSS_PREFIX + '-info-boxes">' +
                '<div class="' + CSS_PREFIX + '-box-yellow ' + CSS_PREFIX + '-box-initial">' +
                '<span class="' + CSS_PREFIX + '-box-label">לפני שמתחילים</span>' +
                '<p>בחרו קודם את תמונת השטח. אחר כך התחילו לחשוף מה חסר, איזה פירוש נכנס, ואיזה חוק פנימי פועל מאחורי התגובה.</p>' +
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

        // ── Progress
        html.push(
            '<div class="' + CSS_PREFIX + '-progress">' +
            '<span>' + revealedIds.length + ' / ' + getTotalReveals() + ' חשיפות</span>' +
            '<div class="' + CSS_PREFIX + '-progress-bar"><div class="' + CSS_PREFIX + '-progress-fill" style="width:' + (getTotalReveals() > 0 ? Math.round((revealedIds.length / getTotalReveals()) * 100) : 0) + '%;"></div></div>' +
            '</div>'
        );

        rootEl.innerHTML = html.join('');

        // ── Trigger CSS transition for pending tile
        if (capturedPending >= 0) {
            (function (idx) {
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        if (!rootEl) return;
                        var el = rootEl.querySelector('[data-tile="' + idx + '"]');
                        if (el) el.classList.add('is-revealed');
                    });
                });
            })(capturedPending);
        }

        bindEvents();
    }

    // ─── EVENTS ──────────────────────────────────────────────
    function bindEvents() {
        if (!rootEl) return;

        // Category reveal buttons
        var btns = rootEl.querySelectorAll('.' + CSS_PREFIX + '-action-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].addEventListener('click', handleCategoryClick);
        }

        // Confirm button
        var confirmBtn = rootEl.querySelector('.' + CSS_PREFIX + '-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleConfirm);
        }

        // Arrows
        var arrows = rootEl.querySelectorAll('.' + CSS_PREFIX + '-arrow');
        for (var a = 0; a < arrows.length; a++) {
            arrows[a].addEventListener('click', handleArrow);
        }

        // Restart button
        var restartBtn = rootEl.querySelector('.' + CSS_PREFIX + '-restart-btn');
        if (restartBtn) {
            restartBtn.addEventListener('click', handleRestart);
        }
    }

    function handleArrow(event) {
        if (phase !== 'guess' || !currentExercise) return;
        var dir = event.currentTarget.getAttribute('data-dir');
        var len = currentExercise.hypothesisImages.length;
        if (dir === 'next') {
            viewingHypothesisIndex = (viewingHypothesisIndex + 1) % len;
        } else {
            viewingHypothesisIndex = (viewingHypothesisIndex - 1 + len) % len;
        }
        renderAll();
    }

    function handleConfirm() {
        if (phase !== 'guess') return;
        selectedHypothesisIndex = viewingHypothesisIndex;
        phase = 'reveal';
        saveState();
        renderAll();
    }

    function handleCategoryClick(event) {
        if (phase !== 'reveal') return;
        var btn = event.currentTarget;
        var category = btn.getAttribute('data-category');
        if (!category) return;

        var reveal = getNextReveal(category);
        if (!reveal) return;

        revealedIds.push(reveal.id);
        currentReveal = reveal;

        // Reveal next random tile
        var tileIdx = revealedTileIndexes.length;
        if (tileIdx < tileRevealOrder.length) {
            revealedTileIndexes.push(tileRevealOrder[tileIdx]);
            pendingTileReveal = tileRevealOrder[tileIdx];
        }

        // Check completion
        if (isComplete()) {
            phase = 'complete';
        }

        saveState();

        if (typeof window.awardMetaGamificationXp === 'function') {
            window.awardMetaGamificationXp(5, 'initial-image-vs-deep-structure');
        }

        renderAll();

        var infoBoxes = rootEl.querySelector('.' + CSS_PREFIX + '-info-boxes');
        if (infoBoxes) {
            setTimeout(function () {
                infoBoxes.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }, 100);
        }
    }

    function handleRestart() {
        phase = 'guess';
        selectedHypothesisIndex = -1;
        viewingHypothesisIndex = 0;
        revealedIds = [];
        revealedTileIndexes = [];
        currentReveal = null;
        pendingTileReveal = -1;
        initTileRevealOrder();
        saveState();
        renderAll();
    }

    // ─── MOUNT ────────────────────────────────────────────────
    function mount() {
        rootEl = document.getElementById(ROOT_ID);
        if (!rootEl || mounted) return;
        mounted = true;

        currentExercise = EXERCISES[0];

        // Restore state
        var saved = loadState();
        if (saved && saved.exerciseId === currentExercise.id) {
            phase = saved.phase || 'guess';
            selectedHypothesisIndex = typeof saved.selectedHypothesisIndex === 'number' ? saved.selectedHypothesisIndex : -1;
            viewingHypothesisIndex = typeof saved.viewingHypothesisIndex === 'number' ? saved.viewingHypothesisIndex : 0;
            revealedIds = Array.isArray(saved.revealedIds) ? saved.revealedIds : [];
            revealedTileIndexes = Array.isArray(saved.revealedTileIndexes) ? saved.revealedTileIndexes : [];
            tileRevealOrder = Array.isArray(saved.tileRevealOrder) ? saved.tileRevealOrder : [];
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

        if (!tileRevealOrder.length) {
            initTileRevealOrder();
        }

        // Sync tiles with reveals (migration from old state)
        while (revealedTileIndexes.length < revealedIds.length && revealedTileIndexes.length < tileRevealOrder.length) {
            revealedTileIndexes.push(tileRevealOrder[revealedTileIndexes.length]);
        }

        // Fix phase consistency
        if (isComplete() && phase !== 'complete') phase = 'complete';
        if (revealedIds.length > 0 && phase === 'guess') phase = 'reveal';

        renderAll();
    }

    // ─── CONTROLLER ──────────────────────────────────────────
    window.__metaFeatureControllers = window.__metaFeatureControllers || {};
    window.__metaFeatureControllers['initial-image-vs-deep-structure'] = {
        stepBack: function () { return false; },
        canRestart: function () { return true; },
        restart: function () {
            handleRestart();
            return true;
        }
    };

    // ─── BOOT ────────────────────────────────────────────────
    function tryMount() {
        if (document.getElementById(ROOT_ID)) mount();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryMount, { once: true });
    } else {
        tryMount();
    }

    if (typeof MutationObserver === 'function' && document.body) {
        var observer = new MutationObserver(function () {
            if (!mounted && document.getElementById(ROOT_ID)) {
                mount();
            }
        });
        observer.observe(document.body, { attributes: true, attributeFilter: ['data-active-tab'] });
    }

})(window, document);
