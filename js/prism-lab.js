(function attachPrismLab() {
  const root = document.getElementById('prism-lab-app');
  if (!root) return;

  const DRAFT_KEY = 'prism_lab_draft_v1';
  const SAVED_KEY = 'prism_lab_saved_v1';
  const DEMO_STORY = 'ביום שני יש לי שיחה עם המנהל. אני בטוח שהוא חושב שאני מורה גרוע. תמיד כשאני מדבר מולו אני נתקע. זה אומר שאין לי מה להציע בבית הספר. אני חייב להוכיח את עצמי, אבל אני לא יכול להשתנות.';

  const PRISMS = [
    { id: 'unspecified_verb', icon: '⚙️', nameHe: 'פועל לא-מפורט', desc: 'הופכים תחושה לרצף פעולות.', q: 'מה בדיוק אתה עושה כש־X?', type: 'process' },
    { id: 'unspecified_noun', icon: '🧩', nameHe: 'שם עצם לא-מפורט', desc: 'מבררים מי/מה בדיוק עומד מאחורי המילה.', q: 'מי/מה בדיוק X?', type: 'referent' },
    { id: 'nominalization', icon: '🎬', nameHe: 'נומינליזציה', desc: 'מחזירים מושג מופשט לתנועה בפועל.', q: 'איך זה נראה בפועל כשיש X?', type: 'process' },
    { id: 'universal_quantifier', icon: '♾️', nameHe: 'כמתים אוניברסליים', desc: 'בודקים תמיד/אף פעם ומחפשים חריגים.', q: 'תמיד? מתי כן/לא?', type: 'scope' },
    { id: 'necessity_modal', icon: '📌', nameHe: 'מודאלי הכרח', desc: 'חושפים את המחיר מאחורי חייב/צריך.', q: 'מה יקרה אם לא X?', type: 'fear' },
    { id: 'possibility_modal', icon: '🧱', nameHe: 'מודאלי אפשרות', desc: 'מפרקים לא-יכול לחסם בר-טיפול.', q: 'מה מונע ממך X?', type: 'barrier' },
    { id: 'cause_effect', icon: '🔗', nameHe: 'סיבת-תוצאה', desc: 'בונים מנגנון X⇢Y במקום קסם.', q: 'איך בדיוק X גורם ל־Y?', type: 'mechanism' },
    { id: 'complex_equivalence', icon: '🪢', nameHe: 'הקבלה מורכבת', desc: 'מפרקים את הדבק של “זה אומר ש…”.', q: 'איך X אומר ש־Y?', type: 'meaning' },
    { id: 'mind_reading', icon: '🧠', nameHe: 'קריאת מחשבות', desc: 'מבדילים בין נתון לפרשנות.', q: 'איך אתה יודע ש־X?', type: 'evidence' },
    { id: 'comparison', icon: '📏', nameHe: 'השוואה חסרה', desc: 'מוצאים ביחס למה/מי מודדים.', q: 'יותר/פחות ביחס ל־מה/מי?', type: 'criterion' },
    { id: 'lost_performative', icon: '🏛️', nameHe: 'Lost Performative', desc: 'מגלים מי אמר ולפי איזה כלל.', q: 'לפי מי/איזה כלל X?', type: 'authority' },
    { id: 'presupposition', icon: '🧱', nameHe: 'הנחות יסוד', desc: 'חושפים מה חייב להיות נכון ברקע.', q: 'מה חייב להיות נכון כדי שהמשפט הזה יהיה נכון?', type: 'assumption' },
    { id: 'unspecified_time', icon: '⏱️', nameHe: 'זמן לא מוגדר', desc: 'מוצאים חלון זמן מדויק.', q: 'מתי בדיוק X?', type: 'time' },
    { id: 'context_place', icon: '📍', nameHe: 'מקום/הקשר', desc: 'ממפים טריגרים סביבתיים והקשר.', q: 'איפה/באיזה הקשר X?', type: 'context' },
    { id: 'logical_levels', icon: '🗼', nameHe: 'רמות לוגיות', desc: 'מזהים רמה וקפיצות רמה.', q: 'באיזו רמה אתה מדבר עכשיו?', type: 'levels' }
  ];

  const BREEN_ROWS = Object.freeze([
    Object.freeze({ id: 'row1', categories: Object.freeze(['lost_performative', 'assumptions', 'mind_reading']) }),
    Object.freeze({ id: 'row2', categories: Object.freeze(['universal_quantifier', 'modal_operator', 'cause_effect']) }),
    Object.freeze({ id: 'row3', categories: Object.freeze(['nominalisations', 'identity_predicates', 'complex_equivalence']) }),
    Object.freeze({ id: 'row4', categories: Object.freeze(['comparative_deletion', 'time_space_predicates', 'lack_referential_index']) }),
    Object.freeze({ id: 'row5', categories: Object.freeze(['non_referring_nouns', 'sensory_predicates', 'unspecified_verbs']) })
  ]);

  const BREEN_ROW_META = Object.freeze({
    row1: Object.freeze({
      colorClass: 'row-sky',
      heLabel: 'שלשה 1 | מקור, הנחה וכוונה',
      heInsight: 'בודקים מי מקור הסמכות, איזו הנחה פועלת מתחת לפני השטח, ואיזו כוונה מיוחסת בלי ראיה ישירה.'
    }),
    row2: Object.freeze({
      colorClass: 'row-teal',
      heLabel: 'שלשה 2 | חוקי משחק וגבולות',
      heInsight: 'כאן חוקרים את חוקי המשחק: חייב/צריך/יכול, גבולות הנכונות, והנגזרת התפקודית של החוקים האלה.'
    }),
    row3: Object.freeze({
      colorClass: 'row-amber',
      heLabel: 'שלשה 3 | משמעות, זהות והסקה',
      heInsight: 'מפרידים בין פעולה לזהות ובין סימן למסקנה, כדי לא להפוך רגע נקודתי להגדרת אדם.'
    }),
    row4: Object.freeze({
      colorClass: 'row-violet',
      heLabel: 'שלשה 4 | הקשר, זמן וייחוס',
      heInsight: 'מחדדים זמן, מקום והקשר: מול מי, ביחס למה, ומתי בדיוק הטענה נכונה או לא נכונה.'
    }),
    row5: Object.freeze({
      colorClass: 'row-rose',
      heLabel: 'שלשה 5 | קרקע חושית ופעולה',
      heInsight: 'מורידים לקרקע מדידה: מי/מה בדיוק, מה רואים/שומעים בפועל, ומה הצעד ההתנהגותי הבא.'
    })
  });

  const BREEN_LABELS_HE = Object.freeze({
    lost_performative: 'שיפוט חסר מקור',
    assumptions: 'הנחות סמויות',
    mind_reading: 'קריאת מחשבות',
    universal_quantifier: 'כמת כוללני',
    modal_operator: 'מודל אופרטור',
    cause_effect: 'סיבה ותוצאה',
    nominalisations: 'נומינליזציה',
    identity_predicates: 'זהות',
    complex_equivalence: 'שקילות מורכבת',
    comparative_deletion: 'השוואה חסרה',
    time_space_predicates: 'זמן ומרחב',
    lack_referential_index: 'חוסר ייחוס',
    non_referring_nouns: 'שמות לא מפנים',
    sensory_predicates: 'פרדיקטים חושיים',
    unspecified_verbs: 'פועל לא מפורט'
  });

  const BREEN_PRISM_ALIASES = Object.freeze({
    presupposition: 'assumptions',
    nominalization: 'nominalisations',
    necessity_modal: 'modal_operator',
    possibility_modal: 'modal_operator',
    comparison: 'comparative_deletion',
    unspecified_noun: 'non_referring_nouns',
    unspecified_verb: 'unspecified_verbs',
    unspecified_time: 'time_space_predicates',
    context_place: 'time_space_predicates'
  });

  const PRISM_BY_ID = Object.fromEntries(PRISMS.map((p) => [p.id, p]));
  const MOBILE_BREAKPOINT = 900;
  const STEP_GUIDE = Object.freeze([
    Object.freeze({
      title: 'בחירת פריזמה',
      subtitle: 'בחר עדשה/פריזמה להתחלה. היא תקבע איזה סוג חקירה תתרגל.'
    }),
    Object.freeze({
      title: 'איסוף חומר גלם',
      subtitle: 'כתוב משפט קצר מהחיים (או טען דוגמה). המטרה: שיהיה משפט שאפשר לשאול עליו שאלות.'
    }),
    Object.freeze({
      title: 'חפירה עמוקה (3 שכבות)',
      subtitle: 'ענה על שאלות שמדייקות: מה בדיוק? איך יודעים? לפי מי? ואז תקבל שאלות עומק נוספות.'
    })
  ]);

  const state = {
    baseStory: DEMO_STORY,
    selectedPrismId: null,
    ex: null,
    saved: [],
    uiMessage: 'בחר/י פריזמה אחת והתחילו חפירה של 3 שלבים.',
    mobileActionsOpen: false
  };

  function esc(v) {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function norm(v) {
    return String(v || '').replace(/\s+/g, ' ').trim();
  }

  function normalizeBreenPrismId(prismId) {
    const raw = String(prismId || '').trim().toLowerCase().replace(/\s+/g, '_');
    if (!raw) return '';
    return BREEN_PRISM_ALIASES[raw] || raw;
  }

  function splitSentences(text) {
    return norm(text)
      .split(/(?<=[.!?])\s+|\n+/)
      .map((s) => norm(s))
      .filter(Boolean);
  }

  function shrink(text, max = 72) {
    const t = norm(text).replace(/^["'״׳]+|["'״׳]+$/g, '');
    if (!t) return '';
    if (t.length <= max) return t;
    const cut = t.slice(0, max);
    const idx = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','));
    return `${(idx > 18 ? cut.slice(0, idx) : cut).trim()}…`;
  }

  function stripEnd(text) {
    return String(text || '').replace(/[.!?…,:;־-]+$/g, '').trim();
  }

  function firstClause(text) {
    const s = splitSentences(text)[0] || norm(text);
    return stripEnd((s || '').split(/[,:;]/)[0] || s);
  }

  function pickAfter(text, re) {
    const m = re.exec(String(text || ''));
    return m ? stripEnd(shrink(m[1] || m[0], 70)) : '';
  }

  function deriveSeed(prism, story) {
    const text = norm(story);
    const ss = splitSentences(text);
    let x = '';
    let y = '';
    if (!prism) return { x: 'האמירה המרכזית', y: '' };

    if (prism.id === 'mind_reading') x = pickAfter(text, /(?:חושב(?:ת)?|בטוח(?:ה)?(?: ש)?)([^.?!]+)/);
    if (prism.id === 'necessity_modal') x = pickAfter(text, /(?:חייב(?:ת)?|צריך(?:ה)?)([^.?!]+)/);
    if (prism.id === 'possibility_modal') x = pickAfter(text, /(?:לא יכול(?:ה)?|אי אפשר)([^.?!]+)/);
    if (prism.id === 'comparison') x = pickAfter(text, /(?:יותר|פחות|גרוע|טוב)([^.?!]+)/);
    if ((prism.id === 'cause_effect' || prism.id === 'complex_equivalence') && !x) x = pickAfter(text, /(?:זה אומר|גורם|כי)([^.?!]+)/);
    if (!x) x = shrink(firstClause(text) || ss[0] || 'האמירה המרכזית', 70);

    if (prism.id === 'cause_effect' || prism.id === 'complex_equivalence') {
      y = pickAfter(text, /זה אומר([^.?!]+)/) || pickAfter(text, /(?:מרגיש(?:ה)?|מרגיש)([^.?!]+)/) || shrink(ss[1] || ss[0] || (prism.id === 'cause_effect' ? 'תוצאה' : 'משמעות'), 56);
      if (!y) y = prism.id === 'cause_effect' ? 'תוצאה' : 'משמעות';
    }

    return { x: stripEnd(x) || 'האמירה המרכזית', y: stripEnd(y) || '' };
  }

  function nextAnchor(answer, fallback) {
    const t = norm(answer);
    if (!t) return fallback || 'האמירה החדשה';
    const p = t.split(/[.!?]/)[0] || t;
    const c = p.split(/(?:,| ואז | אבל | כי )/)[0] || p;
    return stripEnd(shrink(c, 72)) || fallback || 'האמירה החדשה';
  }

  function renderQuestion(prism, x, y) {
    if (!prism) return '';
    let q = prism.q;
    if (q.includes('X')) q = q.replaceAll('X', x || 'זה');
    if (q.includes('Y')) q = q.replaceAll('Y', y || 'תוצאה');
    return q;
  }

  function blankStep(i) {
    return { i, anchorX: '', anchorY: '', q: '', a: '' };
  }

  function makeExcavation(prismId) {
    const prism = PRISM_BY_ID[prismId];
    if (!prism) return null;
    const seed = deriveSeed(prism, state.baseStory);
    const steps = [blankStep(0), blankStep(1), blankStep(2)];
    steps[0].anchorX = seed.x;
    steps[0].anchorY = seed.y;
    steps[0].q = renderQuestion(prism, seed.x, seed.y);
    return { prismId, seedX: seed.x, seedY: seed.y, visible: 1, steps, summary: null };
  }

  function prism() {
    return PRISM_BY_ID[state.selectedPrismId] || null;
  }

  function answers() {
    return (state.ex?.steps || []).map((s) => ({ q: s.q || '', a: norm(s.a || ''), x: s.anchorX || '', y: s.anchorY || '' }));
  }

  function resetDownstream(fromIdx) {
    if (!state.ex) return;
    for (let i = fromIdx; i < 3; i += 1) state.ex.steps[i] = blankStep(i);
    state.ex.summary = null;
  }

  function selectPrism(prismId) {
    if (!PRISM_BY_ID[prismId]) return;
    state.selectedPrismId = prismId;
    state.ex = makeExcavation(prismId);
    state.uiMessage = `נבחרה פריזמה: ${PRISM_BY_ID[prismId].nameHe}.`; 
    persistDraft();
    render();
  }

  function setStepAnswer(idx, val) {
    if (!state.ex || !state.ex.steps[idx]) return;
    state.ex.steps[idx].a = String(val || '');
    if (idx === 0) { resetDownstream(1); state.ex.visible = 1; }
    if (idx === 1) { resetDownstream(2); if (state.ex.visible > 2) state.ex.visible = 2; }
    persistDraft();
    const saveBtn = root.querySelector('[data-action="save-current"]');
    if (saveBtn) saveBtn.disabled = !canSave();
  }

  function continueStep(idx) {
    const p = prism();
    if (!p || !state.ex || idx < 0 || idx > 1) return;
    const cur = state.ex.steps[idx];
    if (!norm(cur.a)) { state.uiMessage = `צריך למלא תשובה בשלב ${idx + 1}.`; render(); return; }
    const next = state.ex.steps[idx + 1];
    const nx = nextAnchor(cur.a, cur.anchorX || state.ex.seedX);
    next.anchorX = nx;
    next.anchorY = cur.anchorY || state.ex.seedY;
    next.q = renderQuestion(p, nx, next.anchorY);
    state.ex.visible = Math.max(state.ex.visible, idx + 2);
    state.uiMessage = `נבנה שלב ${idx + 2}: אותה שאלה, X מעודכן מתוך התשובה הקודמת.`;
    persistDraft();
    render();
  }

  function summaryLead(type) {
    const map = {
      process: 'החפירה הזיזה את הטקסט ממושג כללי לתהליך שאפשר לראות ולתאר.',
      referent: 'החפירה הפכה מילה כללית לרפרנט/דמות עם מאפיינים ברורים.',
      scope: 'החפירה התחילה לשבור הכללה רחבה ולחשוף תנאים וחריגים.',
      fear: 'החפירה חשפה את שרשרת המחירים שמחזיקה את ה״חייב״.',
      barrier: 'החפירה פירקה את ה״לא יכול״ לחסם שניתן לעבוד עליו.',
      mechanism: 'החפירה בנתה מנגנון ולא רק קשר כללי של סיבה-תוצאה.',
      meaning: 'החפירה חשפה את כלל הפרשנות שמחבר אירוע למשמעות.',
      evidence: 'החפירה הבדילה בין נתון, פרשנות ותחושת ידיעה.',
      criterion: 'החפירה חשפה את הקריטריון הסמוי שמנהל את ההשוואה.',
      authority: 'החפירה גילתה מקור סמכות/כלל שמאחורי השיפוט.',
      assumption: 'החפירה פתחה את שכבת ההנחות שמחזיקה את המשפט.',
      time: 'החפירה צמצמה את הסיפור לחלון זמן מדויק.',
      context: 'החפירה יצרה מפה של הקשרים וטריגרים סביבתיים.',
      levels: 'החפירה עזרה להבחין ברמה שבה מדברים ובקפיצות אפשריות.'
    };
    return map[type] || 'החפירה יצרה יותר דיוק, יותר שטח ויותר נקודות בחירה.';
  }

  function summaryNext(type) {
    const map = {
      process: 'איזו פעולה אחת קטנה ברצף הזה אפשר לשנות בפעם הבאה?',
      referent: 'איזה פרט נוסף צריך כדי לדייק עוד את הרפרנט/הקריטריון?',
      scope: 'איפה כבר קיימת דוגמה נגדית שיכולה להפוך לתנאי הצלחה?',
      fear: 'מה סביר באמת שיקרה, ומה צעד קטן שיגן עליך בלי להיתקע?',
      barrier: 'איזה משאב/מיומנות קטן יהפוך את זה לאפשרי ב-10% יותר?',
      mechanism: 'באיזה שלב בשרשרת הכי קל להתערב כרגע?',
      meaning: 'איזה תרגום חלופי אפשר לבדוק לאותו X?',
      evidence: 'מה הנתון הבא שיכול לבדוק את הפרשנות?',
      criterion: 'האם הקריטריון הזה מתאים להקשר הזה?',
      authority: 'האם הכלל הזה עדיין משרת אותך כאן, ובאיזה גבול?',
      assumption: 'איזו הנחה אחת הכי חשוב לבדוק קודם?',
      time: 'מה אפשר לעשות בדיוק ברגע שזוהה?',
      context: 'באיזה הקשר אחר יהיה קל יותר לתרגל?',
      levels: 'לאיזו רמה כדאי לרדת/לעלות עכשיו כדי להחזיר פתירות?'
    };
    return map[type] || 'מה השאלה הבאה שתמשיך את אותה עדשה ותגדיל דיוק?';
  }

  function buildSummary() {
    const p = prism();
    const ex = state.ex;
    if (!p || !ex) return;
    const s = answers();
    if (!(s[0]?.a && s[1]?.a && s[2]?.a)) { state.uiMessage = 'צריך להשלים 3 שלבים לפני סיכום.'; render(); return; }
    ex.summary = {
      title: 'מה נהיה משמעותי?',
      lead: summaryLead(p.type),
      bullets: [
        `העוגן ההתחלתי היה "${shrink(ex.seedX, 40)}", ובשלב השלישי כבר עבדנו עם "${shrink(ex.steps[2].anchorX || s[2].a, 40)}".`,
        `נוצר רצף ברור: "${shrink(s[0].a, 64)}" → "${shrink(s[1].a, 64)}" → "${shrink(s[2].a, 64)}".`,
        'עכשיו יש יותר מפת פעולה ופחות מסקנה כללית: אפשר לעבוד עם מנגנון, תנאי, קריטריון או כלל.'
      ],
      next: summaryNext(p.type)
    };
    state.uiMessage = 'נוצר סיכום אוטומטי על בסיס שלושת שלבי החפירה.';
    persistDraft();
    render();
  }

  function canSave() {
    return !!(state.selectedPrismId && state.ex && answers().some((x) => x.a));
  }

  function saveCurrent() {
    if (!canSave()) { state.uiMessage = 'אין עדיין תוכן לשמירה.'; render(); return; }
    const p = prism();
    const entry = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      savedAt: new Date().toISOString(),
      baseStory: state.baseStory,
      prismId: p.id,
      prismNameHe: p.nameHe,
      ex: JSON.parse(JSON.stringify(state.ex))
    };
    state.saved.unshift(entry);
    state.saved = state.saved.slice(0, 30);
    persistSaved();
    state.uiMessage = `נשמרה פריזמה: ${p.nameHe}.`;
    render();
  }

  function chooseAnother() {
    state.selectedPrismId = null;
    state.ex = null;
    state.uiMessage = 'אפשר לבחור פריזמה אחרת על אותו Base Story.';
    persistDraft();
    render();
  }

  function loadSaved(id) {
    const item = state.saved.find((x) => x.id === id);
    if (!item || !PRISM_BY_ID[item.prismId]) return;
    state.baseStory = String(item.baseStory || DEMO_STORY);
    state.selectedPrismId = item.prismId;
    state.ex = item.ex && typeof item.ex === 'object' ? item.ex : makeExcavation(item.prismId);
    if (!state.ex || !Array.isArray(state.ex.steps)) state.ex = makeExcavation(item.prismId);
    state.uiMessage = `נטענה פריזמה שמורה: ${item.prismNameHe || PRISM_BY_ID[item.prismId].nameHe}.`;
    persistDraft();
    render();
  }

  function removeSaved(id) {
    const n = state.saved.length;
    state.saved = state.saved.filter((x) => x.id !== id);
    if (state.saved.length !== n) { persistSaved(); state.uiMessage = 'נמחקה פריזמה שמורה.'; render(); }
  }

  function persistDraft() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ baseStory: state.baseStory, selectedPrismId: state.selectedPrismId, ex: state.ex }));
    } catch (e) {}
  }

  function persistSaved() {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(state.saved)); } catch (e) {}
  }

  function restoreAll() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
      if (Array.isArray(s)) state.saved = s;
    } catch (e) {}
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (d && typeof d === 'object') {
        state.baseStory = String(d.baseStory || DEMO_STORY);
        if (d.selectedPrismId && PRISM_BY_ID[d.selectedPrismId]) {
          state.selectedPrismId = d.selectedPrismId;
          state.ex = d.ex && typeof d.ex === 'object' ? d.ex : makeExcavation(d.selectedPrismId);
          if (!state.ex || !Array.isArray(state.ex.steps)) state.ex = makeExcavation(d.selectedPrismId);
          for (let i = 0; i < 3; i += 1) {
            if (!state.ex.steps[i]) state.ex.steps[i] = blankStep(i);
          }
        }
      }
    } catch (e) {}
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(d);
    } catch (e) {
      return d.toLocaleString();
    }
  }

  function isMobileView() {
    if (typeof window.matchMedia !== 'function') return window.innerWidth <= MOBILE_BREAKPOINT;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
  }

  function stepGuide(idx) {
    return STEP_GUIDE[idx] || {
      title: `שלב ${idx + 1}`,
      subtitle: 'המשך חקירה ממוקד על אותו עוגן.'
    };
  }

  function pendingMicrocopy() {
    if (!state.selectedPrismId) return 'בחר פריזמה כדי להתחיל';
    return 'כתוב משפט כדי להמשיך';
  }

  function renderPrismGrid() {
    return PRISMS.map((p) => `
      <button type="button" class="pl-btn pl-prism-btn${p.id === state.selectedPrismId ? ' is-active' : ''}" data-action="select-prism" data-id="${esc(p.id)}" title="${esc(p.q)}">
        <span class="pl-prism-head"><span class="pl-prism-icon">${esc(p.icon)}</span><span class="pl-prism-name">${esc(p.nameHe)}</span></span>
        <p class="pl-prism-desc">${esc(p.desc)}</p>
      </button>
    `).join('');
  }

  function renderBreenReferenceBoard() {
    const activeId = normalizeBreenPrismId(state.selectedPrismId);
    const activeRowId = BREEN_ROWS.find((row) => row.categories.includes(activeId))?.id || '';

    const rowsHtml = BREEN_ROWS.map((row) => {
      const meta = BREEN_ROW_META[row.id] || BREEN_ROW_META.row1;
      const isActiveRow = !!activeRowId && activeRowId === row.id;
      const cellsHtml = row.categories.map((categoryId) => {
        const isActive = !!activeId && activeId === categoryId;
        const classes = ['pl-breen-cell'];
        if (isActiveRow) classes.push('is-row');
        if (isActive) classes.push('is-active');
        return `
          <div class="${classes.join(' ')}">
            <span class="pl-breen-chip">${esc((categoryId || '').slice(0, 2).toUpperCase())}</span>
            <small>${esc(BREEN_LABELS_HE[categoryId] || categoryId)}</small>
          </div>
        `;
      }).join('');

      return `
        <div class="pl-breen-row ${esc(meta.colorClass || '')}${isActiveRow ? ' is-active' : ''}">
          <div class="pl-breen-row-head">
            <strong>${esc(meta.heLabel || row.id)}</strong>
            <small>${esc(meta.heInsight || '')}</small>
          </div>
          <div class="pl-breen-row-cells">${cellsHtml}</div>
        </div>
      `;
    }).join('');

    const selectedPrismName = state.selectedPrismId && PRISM_BY_ID[state.selectedPrismId]
      ? PRISM_BY_ID[state.selectedPrismId].nameHe
      : '';
    const note = selectedPrismName
      ? (activeId
          ? `הפריזמה הנבחרת (${selectedPrismName}) מסומנת בטבלת ברין כשיש התאמה ישירה/אליאס.`
          : `הפריזמה הנבחרת (${selectedPrismName}) היא הרחבה שאינה תא ברין ישיר.`)
      : 'טבלת ברין משמשת כמפת עוגן (5×3) בין העדשות השונות.';

    return `
      <section class="pl-card pl-breen-board">
        <h2>טבלת ברין — מפת 5×3</h2>
        <p class="pl-kicker">${esc(note)}</p>
        <div class="pl-breen-grid">${rowsHtml}</div>
      </section>
    `;
  }

  function renderBaseActions(isMobile) {
    if (!isMobile) {
      return `
        <div class="pl-inline-actions">
          <button type="button" class="pl-btn" data-action="load-demo">טען דוגמת בסיס</button>
          <button type="button" class="pl-btn" data-action="refresh-anchor" ${state.selectedPrismId ? '' : 'disabled'}>רענן עוגן אוטומטי</button>
          <button type="button" class="pl-btn" data-action="clear-draft">נקה טיוטה</button>
        </div>
      `;
    }

    return `
      <div class="pl-mobile-actions-wrap${state.mobileActionsOpen ? ' is-open' : ''}" data-mobile-actions-root>
        <button
          type="button"
          class="pl-btn pl-mobile-actions-toggle"
          data-action="toggle-mobile-actions"
          aria-expanded="${state.mobileActionsOpen ? 'true' : 'false'}"
          aria-controls="pl-mobile-actions-menu"
        >
          פעולות
        </button>
        <div
          id="pl-mobile-actions-menu"
          class="pl-mobile-actions-menu${state.mobileActionsOpen ? ' is-open' : ''}"
          role="menu"
          aria-hidden="${state.mobileActionsOpen ? 'false' : 'true'}"
        >
          <button type="button" class="pl-btn pl-mobile-actions-item" data-action="load-demo" role="menuitem">טען דוגמת בסיס</button>
          <button type="button" class="pl-btn pl-mobile-actions-item" data-action="refresh-anchor" role="menuitem" ${state.selectedPrismId ? '' : 'disabled'}>רענן עוגן אוטומטי</button>
          <button type="button" class="pl-btn pl-mobile-actions-item" data-action="clear-draft" role="menuitem">נקה טיוטה</button>
        </div>
      </div>
    `;
  }

  function renderStep(step, idx, p, ex) {
    const visible = ex.visible >= idx + 1;
    if (!visible) return '';
    const guide = stepGuide(idx);
    const hasA = !!norm(step.a);
    const statusText = hasA ? 'נכתב' : pendingMicrocopy();
    const q = step.q || renderQuestion(p, step.anchorX || ex.seedX, step.anchorY || ex.seedY);
    const nextVisible = ex.visible >= idx + 2;
    return `
      <article class="pl-step-card${hasA ? ' is-locked' : ''}">
        <div class="pl-step-head">
          <div class="pl-step-label">שלב ${idx + 1} · ${esc(guide.title)}</div>
          <div class="pl-step-status${hasA ? ' done' : ''}">${esc(statusText)}</div>
        </div>
        <p class="pl-step-guidance">${esc(guide.subtitle)}</p>
        <p class="pl-step-question"><strong>השאלה:</strong> ${esc(q)}</p>
        <p class="pl-step-context">עוגן ${idx + 1}: <code>${esc(step.anchorX || ex.seedX || '—')}</code>${p.q.includes('Y') ? ` · Y: <code>${esc(step.anchorY || ex.seedY || 'תוצאה')}</code>` : ''}</p>
        <textarea data-action="step-answer" data-step="${idx}" spellcheck="false" placeholder="כתבו כאן את תשובת שלב ${idx + 1}...">${esc(step.a || '')}</textarea>
        <div class="pl-step-actions">
          ${idx < 2 && hasA ? `<button type="button" class="pl-btn primary" data-action="continue-step" data-step="${idx}">${nextVisible ? `עדכן שלב ${idx + 2}` : `המשך לשלב ${idx + 2}`}</button>` : ''}
        </div>
      </article>
    `;
  }

  function renderExcavation() {
    const p = prism();
    const ex = state.ex;
    if (!p || !ex) return `
      <section class="pl-card"><h2>אזור החפירה</h2><div class="pl-excavation-empty">בחר/י אחת מ-15 הפריזמות כדי להתחיל חפירה עמוקה של 3 שלבים עם אותה שאלה חוזרת.</div></section>
    `;
    const canSumm = ex.visible >= 3 && !!norm(ex.steps[2]?.a);
    return `
      <section class="pl-card">
        <div class="pl-excavation-header">
          <h2 class="pl-excavation-title">פריזמה: ${esc(p.nameHe)} <small>| שאלה חוזרת</small></h2>
          <div class="pl-anchor-chip"><span>עוגן התחלתי:</span><code>${esc(ex.seedX || '—')}</code></div>
          ${p.q.includes('Y') ? `<div class="pl-anchor-chip"><span>Y (נגזר אוטומטית):</span><code>${esc(ex.seedY || 'תוצאה')}</code></div>` : ''}
          <p class="pl-kicker">אותה שאלה בדיוק. בכל שלב ה-<code>X</code> מתעדכן מהתשובה הקודמת.</p>
        </div>
        <div class="pl-step-list">${ex.steps.map((s, i) => renderStep(s, i, p, ex)).join('')}</div>
        ${canSumm ? `<div class="pl-inline-actions"><button type="button" class="pl-btn green big" data-action="make-summary">מה נהיה משמעותי?</button></div>` : ''}
        ${ex.summary ? `
          <section class="pl-summary-card" aria-live="polite">
            <h3 class="pl-summary-title">${esc(ex.summary.title || 'מה נהיה משמעותי?')}</h3>
            <p class="pl-summary-lead">${esc(ex.summary.lead || '')}</p>
            <ul class="pl-summary-list">${(ex.summary.bullets || []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
            <div class="pl-summary-next">שאלה הבאה מומלצת: ${esc(ex.summary.next || '')}</div>
          </section>` : ''}
      </section>
    `;
  }

  function renderHistory() {
    const p = prism();
    const ex = state.ex;
    const steps = ex?.steps || [blankStep(0), blankStep(1), blankStep(2)];
    const items = steps.map((s, i) => {
      const guide = stepGuide(i);
      const title = `שלב ${i + 1} · ${guide.title}`;
      const hasQ = !!norm(s.q);
      const hasA = !!norm(s.a);
      if (!hasQ) {
        return `<div class="pl-history-item is-empty"><div class="pl-history-item-head"><strong>${esc(title)}</strong><span>${esc(pendingMicrocopy())}</span></div><p>${esc(guide.subtitle)}</p><p>${state.selectedPrismId ? 'השאלה תופיע אחרי שממלאים את השלב הקודם.' : 'השאלה תופיע אחרי בחירת פריזמה.'}</p></div>`;
      }
      return `<div class="pl-history-item${hasA ? '' : ' is-empty'}"><div class="pl-history-item-head"><strong>${esc(title)}</strong><span>${hasA ? 'נכתב' : esc(pendingMicrocopy())}</span></div><p>${esc(guide.subtitle)}</p><p>${esc(s.q)}</p><p class="pl-history-answer">${hasA ? esc(s.a) : 'כתוב משפט כדי להמשיך.'}</p></div>`;
    }).join('');

    const savedHtml = state.saved.length
      ? state.saved.map((it) => `
        <article class="pl-saved-item">
          <h5>${esc(it.prismNameHe || it.prismId || 'פריזמה')}</h5>
          <p>${esc(fmtDate(it.savedAt))} · עוגן: ${esc(shrink(it.ex?.seedX || '', 26) || '—')}</p>
          <p>${esc(shrink(it.ex?.steps?.[2]?.a || it.ex?.steps?.[0]?.a || '', 66) || 'ללא תשובה')}</p>
          <div class="pl-inline-actions">
            <button type="button" class="pl-btn" data-action="load-saved" data-id="${esc(it.id)}">פתח</button>
            <button type="button" class="pl-btn" data-action="delete-saved" data-id="${esc(it.id)}">מחק</button>
          </div>
        </article>`).join('')
      : '<div class="pl-history-item is-empty"><p>עדיין אין שמירות. אפשר לשמור אחרי שממלאים תשובה אחת לפחות.</p></div>';

    return `
      <aside class="pl-side">
        <section class="pl-card pl-side-card">
          <h3>היסטוריה של 3 השלבים</h3>
          <p class="pl-kicker">קריאה בלבד · רואים את כל הרצף בלי לגלול.</p>
          <div class="pl-history-list">${items}</div>
          <div class="pl-side-actions">
            <button type="button" class="pl-btn primary" data-action="save-current" ${canSave() ? '' : 'disabled'}>שמור פריזמה זו</button>
            <button type="button" class="pl-btn" data-action="choose-another" ${p ? '' : 'disabled'}>בחר פריזמה אחרת</button>
          </div>
          <p class="pl-message">${esc(state.uiMessage || '')}</p>
        </section>
        <section class="pl-card pl-side-card">
          <h3>פריזמות שמורות</h3>
          <p class="pl-kicker">טעינה מהירה של חפירות קודמות בדפדפן זה.</p>
          <div class="pl-saved-list">${savedHtml}</div>
        </section>
      </aside>
    `;
  }

  function render() {
    const mobileView = isMobileView();
    root.innerHTML = `
      <div class="pl-shell" dir="rtl">
        <header class="pl-hero">
          <p class="pl-eyebrow">Prism Lab</p>
          <h1>Prism Lab – חפירה עמוקה עם עדשות</h1>
          <p>בוחרים עדשה אחת (פריזמה) ומבצעים חפירה עמוקה של 3 שלבים עם אותה שאלה בדיוק. בכל שלב <code>X</code> מתעדכן אוטומטית מהתשובה הקודמת.</p>
        </header>
        <div class="pl-layout">
          <main class="pl-main">
            <section class="pl-card pl-base">
              <h2>Base Story</h2>
              <p class="pl-kicker">כתבו/ערכו את הפסקה כאן. שלב 1 יקבל עוגן אוטומטי, ואז ההמשך נבנה מתוך התשובות.</p>
              <textarea id="pl-base-story" spellcheck="false">${esc(state.baseStory || '')}</textarea>
              ${renderBaseActions(mobileView)}
            </section>

            ${mobileView ? '' : renderBreenReferenceBoard()}

            <section class="pl-card">
              <h2>15 פריזמות</h2>
              <p class="pl-kicker">בוחרים פריזמה אחת וחופרים איתה 3 פעמים ברצף.</p>
              <div class="pl-prisms-grid">${renderPrismGrid()}</div>
            </section>

            ${renderExcavation()}
          </main>

          ${renderHistory()}
        </div>

        <footer class="pl-card">
          <p class="pl-footnote">המסך הזה ייעודי ל-Chain Recursive Prism: החקירה מתקדמת קדימה על המשפט החדש שנולד בכל תשובה, בלי להחליף כלי בין השלבים.</p>
        </footer>
      </div>
    `;
  }

  function refreshAnchor() {
    if (!state.selectedPrismId) return;
    if (answers().some((x) => x.a)) {
      state.uiMessage = 'כבר התחילה חפירה. כדי לרענן עוגן - בחר/י פריזמה אחרת או נקה טיוטה.';
      render();
      return;
    }
    state.ex = makeExcavation(state.selectedPrismId);
    state.uiMessage = 'העוגן ההתחלתי רוענן מתוך Base Story.';
    persistDraft();
    render();
  }

  function clearDraft() {
    state.baseStory = DEMO_STORY;
    state.selectedPrismId = null;
    state.ex = null;
    state.uiMessage = 'הטיוטה נוקתה. אפשר להתחיל מחדש.';
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
    render();
  }

  function onInput(e) {
    const t = e.target;
    if (!t) return;
    if (t.id === 'pl-base-story') {
      state.baseStory = String(t.value || '');
      if (state.selectedPrismId && state.ex && !answers().some((x) => x.a)) state.ex = makeExcavation(state.selectedPrismId);
      persistDraft();
      return;
    }
    if (t.getAttribute('data-action') === 'step-answer') {
      const idx = Number(t.getAttribute('data-step'));
      if (Number.isInteger(idx)) setStepAnswer(idx, t.value);
    }
  }

  function onClick(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    if (action === 'toggle-mobile-actions') {
      state.mobileActionsOpen = !state.mobileActionsOpen;
      render();
      return;
    }
    if (state.mobileActionsOpen && (action === 'load-demo' || action === 'refresh-anchor' || action === 'clear-draft')) {
      state.mobileActionsOpen = false;
    }
    if (action === 'select-prism') return selectPrism(btn.getAttribute('data-id'));
    if (action === 'continue-step') return continueStep(Number(btn.getAttribute('data-step')));
    if (action === 'make-summary') return buildSummary();
    if (action === 'save-current') return saveCurrent();
    if (action === 'choose-another') return chooseAnother();
    if (action === 'load-saved') return loadSaved(btn.getAttribute('data-id'));
    if (action === 'delete-saved') return removeSaved(btn.getAttribute('data-id'));
    if (action === 'load-demo') {
      state.baseStory = DEMO_STORY;
      if (state.selectedPrismId && state.ex && !answers().some((x) => x.a)) state.ex = makeExcavation(state.selectedPrismId);
      state.uiMessage = 'נטענה פסקת בסיס לדוגמה.';
      persistDraft();
      render();
      return;
    }
    if (action === 'refresh-anchor') return refreshAnchor();
    if (action === 'clear-draft') return clearDraft();
  }

  function onDocumentClick(event) {
    if (!state.mobileActionsOpen) return;
    const wrap = root.querySelector('[data-mobile-actions-root]');
    if (!wrap) {
      state.mobileActionsOpen = false;
      return;
    }
    const target = event.target;
    if (target instanceof Node && wrap.contains(target)) return;
    state.mobileActionsOpen = false;
    render();
  }

  function onDocumentKeydown(event) {
    if (!state.mobileActionsOpen) return;
    if (event.key !== 'Escape') return;
    state.mobileActionsOpen = false;
    render();
  }

  function bindViewportListener() {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const onChange = () => {
      state.mobileActionsOpen = false;
      render();
    };
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onChange);
      return;
    }
    if (typeof mq.addListener === 'function') {
      mq.addListener(onChange);
    }
  }

  restoreAll();
  root.addEventListener('input', onInput);
  root.addEventListener('click', onClick);
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('keydown', onDocumentKeydown);
  bindViewportListener();
  render();
})();
