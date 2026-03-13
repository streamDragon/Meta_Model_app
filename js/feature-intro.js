/**
 * feature-intro.js
 * Progressive disclosure: show explanation first, then task.
 * Bandler & Grinder floating help button for all features.
 */
(function () {
    'use strict';

    var SEEN_KEY = 'mm_feature_seen_v1';
    var seen = {};
    try { seen = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch (_) {}

    function saveSeen() {
        try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch (_) {}
    }

    var HELP = {
        'practice-question': {
            title: 'איך עובד תרגול הזיהוי?',
            steps: [
                'קראו את המשפט עד הסוף',
                'שימו לב לביטוי שמרגיש "לא מדויק" — חסר, מוגדש, גורף',
                'בחרו את שאלת הדיוק שהכי חושפת את ההפרה',
                'ראו את הניתוח — למה השאלה הזו מתאימה לקטגוריה'
            ],
            example: '"הוא לא בסדר" ← שואלים: לפי מי? מה הסטנדרט? ← Lost Performative',
            tip: 'אין צורך לנחש — הכל נלמד בזמן המשחק עצמו.'
        },
        'practice-radar': {
            title: 'איך עובד מכ"ם מטה-מודל?',
            steps: [
                'קראו את המשפט',
                'הביטוי המודגש הוא "הפרה" — איזו תבנית?',
                'לחצו על הכפתור המתאים לפני שהזמן נגמר',
                'ניקוד גבוה = מהירות + דיוק'
            ],
            example: '"**כולם** שונאים אותי" ← Universal Quantifier (כמת אוניברסלי)',
            tip: 'במצב מבחן אין עצירה. במצב למידה תקבלו הסבר אחרי כל בחירה.'
        },
        'practice-wizard': {
            title: 'איך עובד גשר תחושה-שפה?',
            steps: [
                'כתבו משפט שמישהו אמר — או שאתם מרגישים',
                'בחרו את הביטוי הכי "חי" במשפט',
                'תארו מה קורה בחוץ (מה רואים/שומעים)',
                'תארו מה קורה בפנים (מה מרגישים)',
                'בנו משפט גשר שמחבר את שניהם'
            ],
            example: '"הוא לא רואה אותי" ← חוץ: ממשיך לדבר בלי להסתכל. פנים: אני מתכווצת. גשר: כשהשיחה ממשיכה בלעדיי, אני מרגישה בלתי נראית.',
            tip: 'הגשר המוצלח יושב גם בפנים וגם בחוץ — שניהם אמיתיים.'
        },
        'practice-triples-radar': {
            title: 'איך עובד מכ"ם השלשות?',
            steps: [
                'קראו את המשפט',
                'בחרו שורה (1-5) מטבלת ברין — זהו כיוון הבדיקה',
                'בדקו 3 קטגוריות בתוך אותה שורה — בכל אחת שאלה אחרת',
                'שלוש שאלות = שלוש זוויות על אותו משפט'
            ],
            example: 'שורה 1: Lost Performative + Assumptions + Mind Reading — שלושתם שואלים: מי יודע? מה מונח? מה מיוחס?',
            tip: 'המטרה היא לראות שלוש זוויות שונות — לא רק לשם הקטגוריה.'
        },
        'sentence-map': {
            title: 'איך עובדת מפת המשפט?',
            steps: [
                'כתבו או הדביקו משפט',
                'המפה מנתחת: מה בפנים? מה בחוץ? מה ביחסים?',
                'לחצו על כל חלק לפרטים נוספים',
                'זהו איפה "נתקעה" התקשורת'
            ],
            example: '"הוא לא נותן לי מקום" ← חוץ: לא מגיב. פנים: מרגיש מחוסר. יחסים: הכח לא מאוזן.',
            tip: 'המפה היא כלי אבחון — לא חיפוש אשמה.'
        },
        'blueprint': {
            title: 'איך עובד בונה המהלך?',
            steps: [
                'הכניסו משפט של לקוח',
                'המערכת מחלצת: ההנחה, מה חסר, הכיוון האפשרי',
                'בחרו מהלך מטה-מודלי מתאים',
                'בנו שאלה מדויקת לסשן'
            ],
            example: '"אני תמיד מפספס" ← Universal Quantifier ← שאלה: תמיד? יש פעם שלא פספסת?',
            tip: 'הגדול לא תמיד הטוב ביותר — לפעמים שאלה קטנה פותחת הכי הרבה.'
        },
        'prismlab': {
            title: 'איך עובדת מעבדת הפריזמות?',
            steps: [
                'בחרו מצב (זוגיות, עבודה, הורות...)',
                'קראו סצנה וזהו מה "הבעיה"',
                'הריצו את הפריזמה — 5 פרשנויות לאותו רגע',
                'זהו איזו פרשנות "נדבקת" ואיזו פותחת אפשרויות'
            ],
            example: 'סצנה: השתהה לשיחה ← פרשנות 1: לא אכפת לו. פרשנות 2: משהו קרה אצלו. פרשנות 3: הנורמה שלו שונה.',
            tip: 'הפריזמה לא אומרת מי צודק — היא מרחיבה את שטח הראייה.'
        }
    };

    /* ── HTML escape ── */
    function escH(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    /* ── B&G Help Overlay ── */
    function openHelp(featureId) {
        var data = HELP[featureId] || HELP['practice-question'];
        var stepsHtml = (data.steps || []).map(function (s, i) {
            return '<li><span class="bg-step-num">' + (i + 1) + '</span><span>' + escH(s) + '</span></li>';
        }).join('');

        var overlay = document.createElement('div');
        overlay.className = 'bg-help-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'עזרה ממנטורים');
        overlay.setAttribute('hidden', '');
        overlay.innerHTML = [
            '<div class="bg-help-dialog">',
            '  <button class="bg-help-close" type="button" aria-label="סגירה">✕</button>',
            '  <div class="bg-help-header">',
            '    <img class="bg-coin-img-lg" src="assets/svg/bg-coin.svg" alt="Bandler &amp; Grinder" />',
            '    <div>',
            '      <p class="bg-help-from">בנדלר וגרינדר ממליצים:</p>',
            '      <h3 class="bg-help-title">' + escH(data.title) + '</h3>',
            '    </div>',
            '  </div>',
            '  <ol class="bg-help-steps">' + stepsHtml + '</ol>',
            '  <div class="bg-example-box">',
            '    <p class="bg-example-label">דוגמה:</p>',
            '    <p class="bg-example-text">' + escH(data.example) + '</p>',
            '  </div>',
            data.tip ? '  <p class="bg-tip">\uD83D\uDCA1 ' + escH(data.tip) + '</p>' : '',
            '  <button class="bg-help-cta btn btn-primary" type="button">הבנתי, ממשיכים \u2190</button>',
            '</div>'
        ].join('');

        document.body.appendChild(overlay);
        overlay.removeAttribute('hidden');
        requestAnimationFrame(function () { overlay.classList.add('is-open'); });

        function closeOverlay() {
            overlay.classList.remove('is-open');
            overlay.addEventListener('transitionend', function () {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, { once: true });
        }

        overlay.querySelector('.bg-help-close').addEventListener('click', closeOverlay);
        overlay.querySelector('.bg-help-cta').addEventListener('click', closeOverlay);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeOverlay();
        });
        document.addEventListener('keydown', function onKey(e) {
            if (e.key === 'Escape') {
                closeOverlay();
                document.removeEventListener('keydown', onKey);
            }
        });
    }

    /* ── Floating B&G button ── */
    function addCoinBtn(featureId, container) {
        if (container.querySelector('.bg-coin-btn')) return;
        var btn = document.createElement('button');
        btn.className = 'bg-coin-btn';
        btn.setAttribute('type', 'button');
        btn.setAttribute('aria-label', 'עזרה ממנטורים');
        btn.setAttribute('title', 'שאל את בנדלר וגרינדר');
        btn.innerHTML = '<img src="assets/svg/bg-coin.svg" alt="B&amp;G" />';
        btn.addEventListener('click', function () { openHelp(featureId); });
        container.appendChild(btn);
    }

    /* ── Progressive disclosure gate ── */
    function gateFeature(section) {
        var id = section.id;
        var introCard = section.querySelector('.practice-intro-card');
        if (!introCard) return;

        // Always add B&G coin button
        addCoinBtn(id, introCard);

        if (section.hasAttribute('data-feature-intro-opt-out')) {
            introCard.setAttribute('data-intro-seen', '1');
            return;
        }

        if (seen[id]) {
            introCard.setAttribute('data-intro-seen', '1');
            return;
        }

        // First visit — lock task sections until user confirms
        var taskSections = Array.from(section.querySelectorAll('.practice-section'));
        taskSections.forEach(function (s) {
            s.setAttribute('data-intro-locked', '1');
        });

        var confirmBtn = document.createElement('button');
        confirmBtn.className = 'fi-confirm-btn btn btn-primary';
        confirmBtn.setAttribute('type', 'button');
        confirmBtn.textContent = 'הבנתי, נכנסים \u2190';
        confirmBtn.setAttribute('data-feature-confirm', id);

        // Insert before the first practice-section
        var firstSection = taskSections[0];
        if (firstSection) {
            introCard.insertBefore(confirmBtn, firstSection);
        } else {
            introCard.appendChild(confirmBtn);
        }

        confirmBtn.addEventListener('click', function () {
            seen[id] = true;
            saveSeen();

            introCard.setAttribute('data-intro-seen', '1');

            taskSections.forEach(function (s) {
                s.removeAttribute('data-intro-locked');
                s.style.animation = 'fiSlideIn 0.35s cubic-bezier(0.22,1,0.36,1) both';
            });

            if (confirmBtn.parentNode) confirmBtn.parentNode.removeChild(confirmBtn);

            if (taskSections[0]) {
                taskSections[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }

    /* ── Init ── */
    function init() {
        var IDS = [
            'practice-question', 'practice-radar', 'practice-wizard',
            'practice-triples-radar', 'sentence-map', 'blueprint', 'prismlab'
        ];
        IDS.forEach(function (id) {
            var el = document.getElementById(id);
            if (el) gateFeature(el);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
