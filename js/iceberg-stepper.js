/* ============================================================
   ICEBERG STEPPER — iceberg-stepper.js
   Step-by-step UI wrapper for the iceberg templates trainer.
   ============================================================ */

/* ── STEP NAVIGATION ── */
function goStep(n) {
    var panels = document.querySelectorAll('.step-panel');
    var dots = document.querySelectorAll('.step-dot');
    var lines = document.querySelectorAll('.step-line');

    panels.forEach(function (p) { p.classList.add('hidden'); });
    var target = document.getElementById('step-' + n);
    if (target) target.classList.remove('hidden');

    dots.forEach(function (d, i) {
        d.classList.remove('active', 'done');
        if (i + 1 < n)  d.classList.add('done');
        if (i + 1 === n) d.classList.add('active');
    });
    lines.forEach(function (l, i) {
        l.classList.toggle('done', i + 1 < n);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── FILL EXAMPLE WORD ── */
function fillWord(word) {
    var inp = document.getElementById('word-input');
    if (inp) { inp.value = word; inp.focus(); }
}

/* ── CHAR COUNTER ── */
(function initCharCounter() {
    var ta = document.getElementById('sentence-input');
    var counter = document.getElementById('char-count');
    if (!ta || !counter) return;
    ta.addEventListener('input', function () { counter.textContent = ta.value.length; });
})();

/* ── TOAST ── */
function showToast(msg, duration) {
    duration = duration || 2500;
    var t = document.querySelector('.mm-toast');
    if (!t) {
        t = document.createElement('div');
        t.className = 'mm-toast';
        t.style.cssText = [
            'position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(20px)',
            'background:#1A1917;color:#fff;padding:10px 20px;border-radius:10px',
            'font-size:14px;opacity:0;transition:all 300ms ease;z-index:9999;white-space:nowrap'
        ].join(';');
        document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    setTimeout(function () {
        t.style.opacity = '0';
        t.style.transform = 'translateX(-50%) translateY(20px)';
    }, duration);
}

/* ── COLLAPSIBLE CARDS ── */
function toggleCard(header) {
    header.parentElement.classList.toggle('open');
}

/* ── TEMPLATE DEFINITIONS ── */
var TEMPLATES = {
    causeEffect: {
        icon: '⚡',
        name: 'סיבה → תוצאה',
        nameEn: 'Cause-Effect',
        desc: 'מקשר בין סיבה לתוצאה בשרשרת לוגית.',
        questionTemplate: function (word) {
            return 'כשאתם אומרים "' + word + '" — מה גורם ל___? וכיצד זה מוביל ___?';
        }
    },
    complexEquiv: {
        icon: '⚖️',
        name: 'שקילות מורכבת',
        nameEn: 'Complex Equivalence',
        desc: 'שתי עובדות שנחשבות לשקולות בפנים. X = Y.',
        questionTemplate: function (word) {
            return 'כשאתם אומרים "' + word + '" — מה זה אומר ש___?';
        }
    },
    logicalLevels: {
        icon: '🌿',
        name: 'רמות לוגיות',
        nameEn: 'Logical Levels',
        desc: 'מפת רמות: סביבה, התנהגות, יכולות, אמונות, זהות.',
        questionTemplate: function (word) {
            return '"' + word + '" — האם מדובר במה שעשית, איך, מדוע, מה האמנת, או מי אתה?';
        }
    },
    nominalization: {
        icon: '🦋',
        name: 'נומינליזציה',
        nameEn: 'Nominalization',
        desc: 'פעולה שהפכה לעצם — תהליך שהוקפא.',
        questionTemplate: function (word) {
            return 'אם "' + word + '" היה פועל — מה היית עושה? כיצד אתה ___ בדיוק?';
        }
    },
    presupposition: {
        icon: '🔍',
        name: 'הנחת יסוד',
        nameEn: 'Presupposition',
        desc: 'מה מונח מראש בתוך המשפט.',
        questionTemplate: function (word) {
            return 'כשאמרת "' + word + '" — מה לקחת כמובן מאליו שאינו ממש מוצהר?';
        }
    },
    modalOp: {
        icon: '🦅',
        name: 'מופרטורים מודאליים',
        nameEn: 'Modal Operator',
        desc: 'ביטויי חובה, אפשרות, הכרח.',
        questionTemplate: function (word) {
            return '"' + word + '" — מה יקרה אם לא? מה מגדיר שזה חובה גמורה?';
        }
    }
};

/* ── AI TEMPLATE SUGGESTION ── */
async function suggestTemplates(word) {
    var grid = document.getElementById('template-cards');
    if (!grid) return;

    grid.innerHTML = '<div style="grid-column:1/-1;padding:32px;text-align:center;color:#9C998F">' +
        '<div class="loading-dots"><span></span><span></span><span></span></div>' +
        '<div style="margin-top:10px;font-size:14px">מנתח את המילה...</div></div>';

    var suggested = null;
    try {
        var apiKey = window.ANTHROPIC_API_KEY || '';
        if (apiKey) {
            var res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({
                    model: 'claude-opus-4-5',
                    max_tokens: 200,
                    messages: [{ role: 'user', content: 'מטפל/מאמן שמנתח מילה: "' + word + '"\nהחזר JSON: { "top": ["causeEffect","complexEquiv","logicalLevels"], "why": "הסבר קצר" }\nאפשרויות: causeEffect, complexEquiv, logicalLevels, nominalization, presupposition, modalOp' }]
                })
            });
            var data = await res.json();
            var text = data && data.content && data.content[0] && data.content[0].text || '';
            var json = text.match(/\{[\s\S]*\}/);
            if (json) suggested = JSON.parse(json[0]);
        }
    } catch (e) { /* fallback */ }

    renderTemplateCards(grid, word, suggested);
}

function renderTemplateCards(grid, word, suggested) {
    var topKeys = (suggested && suggested.top) || Object.keys(TEMPLATES);
    var why = (suggested && suggested.why) || '';
    var allKeys = Object.keys(TEMPLATES);
    var ordered = [];
    topKeys.concat(allKeys).forEach(function (k) {
        if (ordered.indexOf(k) === -1) ordered.push(k);
    });

    grid.innerHTML = '';

    if (why) {
        var insight = document.createElement('p');
        insight.className = 'ai-insight';
        insight.style.cssText = 'grid-column:1/-1';
        insight.textContent = '💡 ' + why;
        grid.parentNode.insertBefore(insight, grid);
    }

    ordered.forEach(function (key) {
        var tpl = TEMPLATES[key];
        if (!tpl) return;
        var isTop = topKeys.indexOf(key) !== -1;
        var card = document.createElement('div');
        card.className = 'template-card';
        card.dataset.key = key;
        card.innerHTML = (isTop ? '<span class="template-ai-badge">★ מומלץ</span>' : '') +
            '<span class="template-card-icon">' + tpl.icon + '</span>' +
            '<div class="template-card-name">' + tpl.name + '</div>' +
            '<div class="template-card-desc">' + tpl.desc + '</div>';
        card.addEventListener('click', function () { selectTemplate(key, word, card); });
        grid.appendChild(card);
    });
}

/* ── TEMPLATE SELECTION ── */
window._selectedTemplate = null;
window._currentWord = null;

function selectTemplate(key, word, cardEl) {
    document.querySelectorAll('.template-card').forEach(function (c) { c.classList.remove('selected'); });
    cardEl.classList.add('selected');
    window._selectedTemplate = key;
    window._currentWord = word;
    buildAndShowTree(key, word);
}

async function buildAndShowTree(key, word) {
    var tpl = TEMPLATES[key];
    var container = document.getElementById('tree-container');
    var wd3 = document.getElementById('word-display-3');
    if (wd3) wd3.textContent = word;
    goStep(3);
    if (!container) return;

    container.innerHTML = '<div style="padding:40px;text-align:center;color:#9C998F">' +
        '<div class="loading-dots"><span></span><span></span><span></span></div>' +
        '<div style="margin-top:10px;font-size:14px">בונה עץ...</div></div>';

    var treeData = null;
    try {
        var apiKey = window.ANTHROPIC_API_KEY || '';
        if (apiKey) {
            var res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
                body: JSON.stringify({
                    model: 'claude-opus-4-5',
                    max_tokens: 400,
                    messages: [{ role: 'user', content: 'בנה עץ מושגי עבור המילה "' + word + '" לפי תבנית "' + tpl.nameEn + '".\nהחזר JSON: { "root": "' + word + '", "branches": [{ "label": "שם ענף", "leaves": ["עלה1","עלה2"] }] }\n3 ענפים, 2 עלים כל ענף.' }]
                })
            });
            var data = await res.json();
            var text = data && data.content && data.content[0] && data.content[0].text || '';
            var json = text.match(/\{[\s\S]*\}/);
            if (json) treeData = JSON.parse(json[0]);
        }
    } catch (e) {}

    if (!treeData) treeData = buildFallbackTree(key, word);
    renderTreeSVG(container, treeData);
    prefillQuestion(key, word);
}

function buildFallbackTree(key, word) {
    var trees = {
        causeEffect:    { root: word, branches: [{ label: 'סיבה', leaves: ['?'] }, { label: 'תוצאה', leaves: ['?'] }] },
        complexEquiv:   { root: word, branches: [{ label: 'עובדה', leaves: ['מה'] }, { label: 'שקילות', leaves: ['שיבוא'] }] },
        logicalLevels:  { root: word, branches: [{ label: 'התנהגות', leaves: ['?'] }, { label: 'זהות', leaves: ['?'] }] },
        nominalization: { root: word, branches: [{ label: 'הפועל המקורי', leaves: ['___ לעשות'] }, { label: 'מעבר', leaves: ['?'] }] },
        presupposition: { root: word, branches: [{ label: 'גלוי', leaves: ['מה אמרו'] }, { label: 'נסתר', leaves: ['מה הניחו'] }] },
        modalOp:        { root: word, branches: [{ label: 'חובה', leaves: ['מה קובע?'] }, { label: 'אפשרות', leaves: ['?'] }] }
    };
    return trees[key] || { root: word, branches: [{ label: 'ענף', leaves: ['עלה'] }] };
}

/* ── SVG TREE RENDERER ── */
function renderTreeSVG(container, data) {
    var root = data.root;
    var branches = data.branches;
    var BW = 120, BH = 40;
    var LW = 100, LH = 34;
    var GAP_V = 48, PAD = 16;

    var totalLeaves = branches.reduce(function (s, b) { return s + Math.max(1, b.leaves.length); }, 0);
    var totalW = Math.max(500, totalLeaves * (LW + PAD) + 80);
    var rootX  = totalW / 2;
    var rootY  = 24;
    var branchY = rootY + BH + GAP_V;
    var leafY   = branchY + BH + GAP_V;
    var svgH    = leafY + LH + 30;

    var svg = '<svg viewBox="0 0 ' + totalW + ' ' + svgH + '" xmlns="http://www.w3.org/2000/svg" style="font-family:inherit;direction:rtl;overflow:visible">';

    svg += '<rect x="' + (rootX - BW/2) + '" y="' + rootY + '" width="' + BW + '" height="' + BH + '" rx="8" fill="#EBF4EF" stroke="#2F6B4E" stroke-width="2"/>';
    svg += '<text x="' + rootX + '" y="' + (rootY + BH/2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="700" fill="#2F6B4E">' + esc(root) + '</text>';

    var leafCursor = 40;
    branches.forEach(function (branch) {
        var leafCount = Math.max(1, branch.leaves.length);
        var branchSpan = leafCount * (LW + PAD) - PAD;
        var bx = leafCursor + branchSpan / 2;

        svg += '<line x1="' + rootX + '" y1="' + (rootY + BH) + '" x2="' + bx + '" y2="' + branchY + '" stroke="#C9C4BA" stroke-width="1.5"/>';
        svg += '<rect x="' + (bx - BW/2) + '" y="' + branchY + '" width="' + BW + '" height="' + BH + '" rx="8" fill="#F5EDE5" stroke="#7B4F2E" stroke-width="1.5"/>';
        svg += '<text x="' + bx + '" y="' + (branchY + BH/2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="600" fill="#7B4F2E">' + esc(branch.label) + '</text>';

        branch.leaves.forEach(function (leaf, li) {
            var lx = leafCursor + li * (LW + PAD) + LW / 2;
            svg += '<line x1="' + bx + '" y1="' + (branchY + BH) + '" x2="' + lx + '" y2="' + leafY + '" stroke="#E2DED7" stroke-width="1"/>';
            svg += '<rect x="' + (lx - LW/2) + '" y="' + leafY + '" width="' + LW + '" height="' + LH + '" rx="6" fill="#F7F6F3" stroke="#C9C4BA" stroke-width="1"/>';
            svg += '<text x="' + lx + '" y="' + (leafY + LH/2 + 1) + '" text-anchor="middle" dominant-baseline="central" font-size="11" fill="#6B6860">' + esc(leaf) + '</text>';
        });

        leafCursor += branchSpan + PAD + 16;
    });

    svg += '</svg>';
    container.innerHTML = svg;
}

function esc(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── QUESTION GENERATION ── */
async function prefillQuestion(key, word) {
    var tpl = TEMPLATES[key];
    var card = document.getElementById('question-card');
    var alts = document.getElementById('alt-questions');
    if (!card) return;

    var mainQ = tpl.questionTemplate(word);
    card.innerHTML = '<div class="q-label">שאלה מוצעת</div>' +
        '<div class="q-text">' + esc(mainQ) + '</div>' +
        '<div class="q-explain" style="margin-top:10px;color:#9C998F;font-size:13px">(ממשיך ליצור שאלה מדויקת יותר...)</div>';
    if (alts) alts.innerHTML = '';

    try {
        var apiKey = window.ANTHROPIC_API_KEY || '';
        if (!apiKey) return;
        var res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({
                model: 'claude-opus-4-5',
                max_tokens: 400,
                messages: [{ role: 'user', content: 'מטפל NLP רוצה שאלה מדויקת עבור מילה "' + word + '" לפי תבנית "' + tpl.nameEn + '".\nצור JSON: { "main": "שאלה עיקרית, קצרה, 15-20 מילה", "explain": "למה השאלה זו טובה", "alts": ["שאלה חלופית א", "שאלה חלופית ב"] }\nבעברית, בשפה חיה ומדויקת.' }]
            })
        });
        var data = await res.json();
        var text = data && data.content && data.content[0] && data.content[0].text || '';
        var jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;
        var q = JSON.parse(jsonMatch[0]);

        card.innerHTML = '<div class="q-label">שאלה מוצעת</div>' +
            '<div class="q-text">' + esc(q.main) + '</div>' +
            (q.explain ? '<div class="q-explain">' + esc(q.explain) + '</div>' : '');

        if (alts && q.alts && q.alts.length) {
            alts.innerHTML = q.alts.map(function (a) {
                return '<div class="alt-q-item" onclick="copyQuestion(this)">' + esc(a) + '</div>';
            }).join('');
        }
    } catch (e) {
        var exp = card.querySelector('.q-explain');
        if (exp) exp.remove();
    }
}

function copyQuestion(el) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(el.textContent.trim()).then(function () { showToast('השאלה הועתקה ✓'); });
    } else {
        showToast(el.textContent.trim());
    }
}

/* ── STEP 1 SUBMIT ── */
function initStepOneSubmit() {
    var btn = document.getElementById('btn-analyze');
    var inp = document.getElementById('word-input');
    if (!btn || !inp) return;

    function doSubmit() {
        var word = inp.value.trim();
        if (!word) { inp.focus(); inp.style.borderColor = '#B5500B'; return; }
        inp.style.borderColor = '';
        var wd2 = document.getElementById('word-display');
        if (wd2) wd2.textContent = word;
        goStep(2);
        suggestTemplates(word);
    }

    btn.addEventListener('click', doSubmit);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSubmit(); });
}

/* ── START NEW ── */
function startNew() {
    var inp = document.getElementById('word-input');
    if (inp) inp.value = '';
    window._selectedTemplate = null;
    window._currentWord = null;
    document.querySelectorAll('.ai-insight').forEach(function (e) { e.remove(); });
    goStep(1);
}

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', function () {
    initStepOneSubmit();
    goStep(1);
});
