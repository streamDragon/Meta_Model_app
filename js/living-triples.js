
const LIVING_TRIPLES_STORAGE_KEY = 'living_triples_progress_v2';
const LIVING_TRIPLES_DATA_URL = 'data/living-triples.json';

const DEFAULT_TRIPLES_MAP = {
  rows: {
    '1': ['Lost Performative', 'Assumptions', 'Mind Reading'],
    '2': ['Universal Quantifier', 'Modal Operator', 'Cause & Effect'],
    '3': ['Nominalisations', 'Identity Predicates', 'Complex Equivalence'],
    '4': ['Comparative Deletion', 'Time & Space Predicates', 'Lack of Referential Index'],
    '5': ['Non-referring nouns', 'Sensory Predicates', 'Unspecified Verbs']
  },
  categoryToRow: {
    'Lost Performative': 1,
    'Assumptions': 1,
    'Mind Reading': 1,
    'Universal Quantifier': 2,
    'Modal Operator': 2,
    'Cause & Effect': 2,
    'Nominalisations': 3,
    'Identity Predicates': 3,
    'Complex Equivalence': 3,
    'Comparative Deletion': 4,
    'Time & Space Predicates': 4,
    'Lack of Referential Index': 4,
    'Non-referring nouns': 5,
    'Sensory Predicates': 5,
    'Unspecified Verbs': 5
  },
  labelsHe: {
    'Lost Performative': 'שיפוט חסר מקור',
    'Assumptions': 'הנחות יסוד',
    'Mind Reading': 'קריאת מחשבות',
    'Universal Quantifier': 'כמת אוניברסלי',
    'Modal Operator': 'אופרטור מודאלי',
    'Cause & Effect': 'סיבה ותוצאה',
    'Nominalisations': 'נומינליזציה',
    'Identity Predicates': 'פרדיקטים של זהות',
    'Complex Equivalence': 'הקבלה מורכבת',
    'Comparative Deletion': 'השמטה השוואתית',
    'Time & Space Predicates': 'פרדיקטים של זמן ומרחב',
    'Lack of Referential Index': 'אבדן מצביע',
    'Non-referring nouns': 'שמות לא-מייחסים',
    'Sensory Predicates': 'פרדיקטים חושיים',
    'Unspecified Verbs': 'פעלים לא-מפורטים'
  },
  rowTitlesHe: {
    '1': 'שלשה 1 | מקור, הנחה וכוונה',
    '2': 'שלשה 2 | חוקי משחק וגבולות',
    '3': 'שלשה 3 | משמעות, זהות והסקה',
    '4': 'שלשה 4 | הקשר, זמן וייחוס',
    '5': 'שלשה 5 | קרקע חושית ופעולה'
  },
  rowInsightsHe: {
    '1': 'בודקים מי מקור הסמכות, איזו הנחה פועלת מתחת לפני השטח, ואיזו כוונה מיוחסת בלי ראיה ישירה.',
    '2': 'כאן חוקרים את חוקי המשחק: חייב/צריך/יכול, גבולות הנכונות, והנגזרת התפקודית של החוקים האלה.',
    '3': 'מפרידים בין פעולה לזהות ובין סימן למסקנה, כדי לא להפוך רגע נקודתי להגדרת אדם.',
    '4': 'מחדדים זמן, מקום והקשר: מול מי, ביחס למה, ומתי בדיוק הטענה נכונה או לא נכונה.',
    '5': 'מורידים לקרקע מדידה: מי/מה בדיוק, מה רואים ושומעים בפועל, ומה הצעד ההתנהגותי הבא.'
  }
};

const FALLBACK_SCENARIOS = [
  {
    id: 'fallback_row1',
    targetRow: 1,
    sentence: '׳–׳” ׳׳ ׳‘׳¡׳“׳¨ ׳©׳”׳™׳ ׳׳ ׳¢׳ ׳×׳” ׳׳™ ׳›׳ ׳”׳™׳•׳. ׳‘׳¨׳•׳¨ ׳©׳”׳™׳ ׳›׳‘׳¨ ׳׳ ׳¨׳•׳¦׳” ׳׳•׳×׳™.',
    answers: {
      'Lost Performative': {
        question: '׳׳₪׳™ ׳׳™ ׳–׳” "׳׳ ׳‘׳¡׳“׳¨"?',
        answer: '׳׳₪׳™ ׳”׳¡׳˜׳ ׳“׳¨׳˜ ׳©׳׳™ ׳‘׳–׳•׳’׳™׳•׳×: ׳׳™ ׳©׳¨׳•׳¦׳” ׳§׳©׳¨ ׳¢׳•׳ ׳”.',
        summary: '׳¡׳˜׳ ׳“׳¨׳˜ ׳׳™׳©׳™: ׳¨׳¦׳•׳ = ׳׳¢׳ ׳”.'
      },
      'Assumptions': {
        question: '׳׳” ׳׳×׳” ׳׳ ׳™׳— ׳©׳—׳™׳™׳‘ ׳׳”׳™׳•׳× ׳ ׳›׳•׳ ׳›׳“׳™ ׳©׳”׳׳¡׳§׳ ׳” ׳×׳¢׳׳•׳“?',
        answer: '׳׳ ׳™ ׳׳ ׳™׳— ׳©׳׳ ׳™׳© ׳׳”׳‘׳” - ׳™׳© ׳×׳’׳•׳‘׳” ׳™׳—׳¡׳™׳× ׳׳”׳¨.',
        summary: '׳”׳ ׳—׳”: ׳׳”׳‘׳” ׳ ׳׳“׳“׳× ׳‘׳׳”׳™׳¨׳•׳× ׳×׳’׳•׳‘׳”.'
      },
      'Mind Reading': {
        question: '׳׳™׳ ׳׳×׳” ׳™׳•׳“׳¢ ׳©׳”׳™׳ ׳›׳‘׳¨ ׳׳ ׳¨׳•׳¦׳” ׳׳•׳×׳?',
        answer: '׳׳ ׳™ ׳׳ ׳™׳•׳“׳¢ ׳‘׳•׳•׳“׳׳•׳×, ׳׳ ׳™ ׳׳₪׳¨׳© ׳׳× ׳”׳©׳×׳™׳§׳” ׳›׳¨׳™׳—׳•׳§.',
        summary: '׳₪׳¨׳©׳ ׳•׳× ׳₪׳ ׳™׳׳™׳× ׳׳©׳×׳™׳§׳”.'
      }
    },
    insight: '׳׳¢׳ ׳™׳™׳... ׳”׳₪׳›׳×׳™ ׳–׳׳ ׳×׳’׳•׳‘׳” ׳׳׳“׳“ ׳׳•׳—׳׳˜ ׳©׳ ׳׳”׳‘׳”.'
  },
  {
    id: 'fallback_row2',
    targetRow: 2,
    sentence: '׳׳ ׳™ ׳׳ ׳™׳›׳•׳ ׳׳”׳×׳—׳™׳™׳‘ ׳׳—׳×׳•׳ ׳”. ׳–׳” ׳×׳׳™׳“ ׳׳¡׳×׳‘׳, ׳›׳™ ׳׳ ׳™ ׳ ׳—׳ ׳§.',
    answers: {
      'Universal Quantifier': {
        question: '׳×׳׳™׳“? ׳׳×׳™ ׳–׳” ׳׳ ׳׳¡׳×׳‘׳ ׳׳₪׳™׳׳• ׳§׳¦׳×?',
        answer: '׳”׳™׳• ׳×׳§׳•׳₪׳•׳× ׳©׳–׳” ׳”׳™׳” ׳§׳ ׳™׳•׳×׳¨, ׳‘׳¢׳™׳§׳¨ ׳›׳©׳׳ ׳”׳™׳” ׳׳—׳¥.',
        summary: '׳׳ ׳×׳׳™׳“: ׳×׳׳•׳™ ׳‘׳¢׳•׳׳¡ ׳•׳‘׳׳—׳¥.'
      },
      'Modal Operator': {
        question: '׳׳” ׳‘׳“׳™׳•׳§ ׳׳•׳ ׳¢ ׳׳׳ ׳׳”׳×׳—׳™׳™׳‘?',
        answer: '׳”׳₪׳—׳“ ׳©׳׳׳‘׳“ ׳—׳•׳₪׳© ׳•׳©׳׳¢׳©׳” ׳˜׳¢׳•׳×.',
        summary: '׳”׳׳ ׳™׳¢׳”: ׳₪׳—׳“ ׳׳׳•׳‘׳“׳ ׳—׳•׳₪׳© ׳•׳˜׳¢׳•׳×.'
      },
      'Cause & Effect': {
        question: '׳׳™׳ ׳‘׳“׳™׳•׳§ ׳ ׳—׳ ׳§ ׳’׳•׳¨׳ ׳׳׳¡׳×׳‘׳?',
        answer: '׳›׳©׳׳ ׳™ ׳ ׳—׳ ׳§ ׳׳ ׳™ ׳׳×׳¨׳—׳§, ׳•׳׳– ׳”׳¦׳“ ׳”׳©׳ ׳™ ׳׳•׳—׳¥ ׳•׳ ׳•׳¦׳¨ ׳¨׳™׳‘.',
        summary: '׳ ׳—׳ ׳§ -> ׳”׳×׳¨׳—׳§׳•׳× -> ׳׳—׳¥ -> ׳¨׳™׳‘.'
      }
    },
    insight: '׳”׳‘׳ ׳×׳™ ׳©׳”׳˜׳¨׳™׳’׳¨ ׳”׳׳¨׳›׳–׳™ ׳”׳•׳ ׳×׳—׳•׳©׳× ׳”׳—׳ ׳§, ׳׳ ׳¢׳¦׳ ׳”׳׳—׳•׳™׳‘׳•׳×.'
  }
];

const state = {
  data: null,
  queue: [],
  index: 0,
  current: null,
  step: 1,
  activeRow: 0,
  selectedCategory: '',
  reveal: {},
  reflectionText: '',
  score: 0,
  progress: null,
  editTimer: null,
  autoTimer: null,
  toastTimer: null,
  el: null
};

function esc(v) {
  if (v === null || v === undefined) return '';
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normKey(v) {
  return String(v || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9\u0590-\u05FF]+/g, '_').replace(/^_+|_+$/g, '');
}

function parseRow(v) {
  if (typeof v === 'number') return v >= 1 && v <= 5 ? v : 0;
  const t = String(v || '').trim();
  if (/^[1-5]$/.test(t)) return Number(t);
  if (/^row[1-5]$/i.test(t)) return Number(t.replace(/[^\d]/g, ''));
  return 0;
}

function safeText(v, fallback = '') {
  const t = String(v || '').trim();
  if (!t) return String(fallback || '').trim();
  const qm = (t.match(/\?/g) || []).length;
  const he = (t.match(/[\u0590-\u05FF]/g) || []).length;
  const en = (t.match(/[A-Za-z]/g) || []).length;
  if (qm >= 3 && he === 0 && en === 0) return String(fallback || '').trim();
  return t;
}

function shuffle(items) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function defaultQuestion(cat) {
  const q = {
    'Lost Performative': '׳׳₪׳™ ׳׳™ ׳–׳” ׳ ׳›׳•׳/׳׳ ׳ ׳›׳•׳?',
    'Assumptions': '׳׳™׳–׳• ׳”׳ ׳—׳” ׳¡׳׳•׳™׳” ׳—׳™׳™׳‘׳× ׳׳”׳™׳•׳× ׳ ׳›׳•׳ ׳” ׳›׳׳?',
    'Mind Reading': '׳׳™׳ ׳׳×׳” ׳™׳•׳“׳¢ ׳׳” ׳”׳׳“׳ ׳”׳©׳ ׳™ ׳—׳•׳©׳‘/׳׳¨׳’׳™׳©?',
    'Universal Quantifier': '׳×׳׳™׳“/׳׳£ ׳₪׳¢׳? ׳׳×׳™ ׳–׳” ׳׳ ׳ ׳›׳•׳?',
    'Modal Operator': '׳׳” ׳׳•׳ ׳¢ ׳׳׳? ׳׳” ׳™׳§׳¨׳” ׳׳ ׳›׳?',
    'Cause & Effect': '׳׳™׳ ׳‘׳“׳™׳•׳§ X ׳’׳•׳¨׳ ׳-Y?',
    'Nominalisations': '׳›׳©׳׳×׳” ׳׳•׳׳¨ ׳׳× ׳”׳׳™׳׳” ׳”׳–׳• - ׳׳” ׳§׳•׳¨׳” ׳‘׳₪׳•׳¢׳?',
    'Identity Predicates': '׳׳™ ׳׳×׳” ׳ ׳”׳™׳” ׳›׳©׳׳×׳” ׳׳•׳׳¨ "׳׳ ׳™ X"?',
    'Complex Equivalence': '׳׳™׳ X ׳׳•׳׳¨ ׳‘׳”׳›׳¨׳— Y?',
    'Comparative Deletion': '׳™׳•׳×׳¨/׳₪׳—׳•׳× ׳‘׳™׳—׳¡ ׳׳׳”?',
    'Time & Space Predicates': '׳׳×׳™ ׳•׳׳™׳₪׳” ׳‘׳“׳™׳•׳§ ׳–׳” ׳§׳•׳¨׳”?',
    'Lack of Referential Index': '׳׳™ ׳‘׳“׳™׳•׳§? ׳¢׳ ׳׳™ ׳–׳” ׳ ׳׳׳¨?',
    'Non-referring nouns': '׳׳” ׳–׳” ׳‘׳“׳™׳•׳§? ׳×׳ ׳“׳•׳’׳׳” ׳׳•׳—׳©׳™׳×.',
    'Sensory Predicates': '׳׳™׳ ׳׳×׳” ׳™׳•׳“׳¢ - ׳׳” ׳¨׳׳™׳×/׳©׳׳¢׳×/׳”׳¨׳’׳©׳×?',
    'Unspecified Verbs': '׳׳” ׳”׳׳“׳ ׳¢׳•׳©׳” ׳‘׳₪׳•׳¢׳? ׳¦׳¢׳“-׳¦׳¢׳“.'
  };
  return q[cat] || '׳׳” ׳”׳©׳׳׳” ׳”׳׳“׳•׳™׳§׳× ׳©׳›׳“׳׳™ ׳׳©׳׳•׳ ׳›׳׳?';
}

function normalizeMap(payload) {
  const from = payload?.triplesMap || {};
  const rows = {};

  if (from.rows && typeof from.rows === 'object' && !Array.isArray(from.rows)) {
    Object.entries(from.rows).forEach(([k, v]) => {
      const row = parseRow(k);
      if (!row || !Array.isArray(v)) return;
      rows[String(row)] = v.map((x) => safeText(x)).filter(Boolean);
    });
  }

  if (!Object.keys(rows).length && Array.isArray(payload?.rows)) {
    payload.rows.forEach((rowItem, idx) => {
      const row = parseRow(rowItem?.id || rowItem?.rowId || idx + 1);
      if (!row) return;
      const cats = (Array.isArray(rowItem?.categories) ? rowItem.categories : [])
        .map((c) => typeof c === 'string' ? safeText(c) : safeText(c?.label || c?.id))
        .filter(Boolean);
      if (cats.length) rows[String(row)] = cats;
    });
  }

  if (!Object.keys(rows).length) return JSON.parse(JSON.stringify(DEFAULT_TRIPLES_MAP));

  const allCats = Object.values(rows).flat();
  const pickCat = (raw) => allCats.find((c) => normKey(c) === normKey(raw)) || safeText(raw);

  const categoryToRow = {};
  Object.entries(from.categoryToRow || {}).forEach(([cat, row]) => {
    const p = pickCat(cat);
    const r = parseRow(row);
    if (p && r) categoryToRow[p] = r;
  });
  Object.entries(rows).forEach(([row, cats]) => cats.forEach((cat) => { if (!categoryToRow[cat]) categoryToRow[cat] = Number(row); }));

  const labelsHe = {};
  Object.entries(from.labelsHe || {}).forEach(([cat, he]) => {
    const p = pickCat(cat);
    const t = safeText(he);
    if (p && t) labelsHe[p] = t;
  });
  Object.keys(categoryToRow).forEach((cat) => { if (!labelsHe[cat]) labelsHe[cat] = DEFAULT_TRIPLES_MAP.labelsHe[cat] || cat; });

  const rowTitlesHe = {};
  const rowInsightsHe = {};
  Object.keys(rows).forEach((rowKey) => {
    const fallbackTitle = DEFAULT_TRIPLES_MAP.rowTitlesHe?.[rowKey] || `שלשה ${rowKey}`;
    const fallbackInsight = DEFAULT_TRIPLES_MAP.rowInsightsHe?.[rowKey] || '';
    rowTitlesHe[rowKey] = fallbackTitle;
    rowInsightsHe[rowKey] = fallbackInsight;
  });
  Object.entries(from.rowTitlesHe || {}).forEach(([rowKey, title]) => {
    const parsed = parseRow(rowKey);
    if (!parsed) return;
    const text = safeText(title);
    if (text) rowTitlesHe[String(parsed)] = text;
  });
  Object.entries(from.rowInsightsHe || {}).forEach(([rowKey, insight]) => {
    const parsed = parseRow(rowKey);
    if (!parsed) return;
    const text = safeText(insight);
    if (text) rowInsightsHe[String(parsed)] = text;
  });

  return { rows, categoryToRow, labelsHe, rowTitlesHe, rowInsightsHe };
}

function pickScenarioText(raw) {
  const keys = ['sentence', 'clientSentence', 'client_sentence', 'title', 'scenario_title', 'text', 'client_text'];
  for (const k of keys) {
    const v = raw?.[k];
    if (Array.isArray(v)) {
      const joined = v.map((x) => safeText(x)).filter(Boolean).join(' ').trim();
      if (joined) return joined;
    }
    const t = safeText(v);
    if (t) return t;
  }
  return '׳׳©׳₪׳˜ ׳׳×׳¨׳’׳•׳';
}
function getAnswerByCat(answerObj, cat) {
  if (!answerObj || typeof answerObj !== 'object') return null;
  if (answerObj[cat]) return answerObj[cat];
  const wanted = normKey(cat);
  for (const key of Object.keys(answerObj)) {
    if (normKey(key) === wanted) return answerObj[key];
  }
  return null;
}

function normalizeScenario(raw, index, triplesMap) {
  if (!raw || typeof raw !== 'object') return null;

  let targetRow = parseRow(raw.targetRow || raw.target_row || raw.rowId || raw.row_id || raw.targetRowId || raw.target_row_id);
  const directCategory = safeText(raw.correctCategory || raw.correct_category);
  if (!targetRow && directCategory) {
    const entry = Object.entries(triplesMap.categoryToRow).find(([cat]) => normKey(cat) === normKey(directCategory));
    if (entry) targetRow = Number(entry[1]) || 0;
  }
  if (!targetRow || !triplesMap.rows[String(targetRow)]?.length) return null;

  const rowCats = triplesMap.rows[String(targetRow)] || [];
  const answers = {};
  const anchors = Array.isArray(raw.anchors) ? raw.anchors.map((x) => safeText(x)) : [];
  const revealArr = Array.isArray(raw.revealAnswers || raw.reveal_answers) ? (raw.revealAnswers || raw.reveal_answers) : [];

  rowCats.forEach((cat, idx) => {
    const answerBlock = getAnswerByCat(raw.answers, cat);
    const revealRaw = revealArr[idx];
    const revealText = Array.isArray(revealRaw)
      ? safeText(revealRaw.find((x) => safeText(x)))
      : safeText(revealRaw);

    const question = safeText(answerBlock?.question || anchors[idx], defaultQuestion(cat));
    const answer = safeText(answerBlock?.answer || revealText, '׳׳™׳ ׳×׳©׳•׳‘׳” ׳׳•׳›׳ ׳”. ׳ ׳¡׳• ׳׳©׳׳•׳ ׳׳—׳“׳© ׳‘׳§׳¦׳¨׳”.');
    const summary = safeText(answerBlock?.summary, answer.length > 100 ? `${answer.slice(0, 97).trim()}...` : answer);

    answers[cat] = { question, answer, summary };
  });

  return {
    id: safeText(raw.id || raw.scenarioId || raw.scenario_id, `lt_scn_${index + 1}`),
    targetRow,
    sentence: pickScenarioText(raw),
    answers,
    insight: safeText(raw.insight, '׳׳¢׳ ׳™׳™׳... ׳›׳©׳׳—׳–׳™׳§׳™׳ ׳׳× ׳›׳ ׳”׳©׳׳©׳” ׳™׳—׳“, ׳”׳×׳׳•׳ ׳” ׳ ׳¢׳©׳™׳× ׳׳“׳•׳™׳§׳× ׳™׳•׳×׳¨.')
  };
}

function normalizeData(payload) {
  const triplesMap = normalizeMap(payload || {});
  const scenarios = (Array.isArray(payload?.scenarios) ? payload.scenarios : [])
    .map((item, i) => normalizeScenario(item, i, triplesMap))
    .filter(Boolean);

  if (!scenarios.length) {
    return {
      version: '1.1.0',
      language: 'he',
      triplesMap: JSON.parse(JSON.stringify(DEFAULT_TRIPLES_MAP)),
      scenarios: JSON.parse(JSON.stringify(FALLBACK_SCENARIOS))
    };
  }

  return {
    version: safeText(payload?.version, '1.1.0'),
    language: safeText(payload?.language, 'he'),
    triplesMap,
    scenarios
  };
}

async function loadData() {
  try {
    const res = await fetch(LIVING_TRIPLES_DATA_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    return normalizeData(json);
  } catch (e) {
    console.warn('Cannot load living triples data, fallback in use.', e);
    return normalizeData({ triplesMap: DEFAULT_TRIPLES_MAP, scenarios: FALLBACK_SCENARIOS });
  }
}

function getElements() {
  return {
    root: document.getElementById('ltv2-root'),
    onboarding: document.getElementById('ltv2-onboarding'),
    practice: document.getElementById('ltv2-practice'),
    startBtn: document.getElementById('ltv2-start-btn'),
    openMapTopBtn: document.getElementById('ltv2-open-map-top'),
    openMapBtn: document.getElementById('ltv2-open-map-btn'),
    closeMapBtn: document.getElementById('ltv2-close-map-btn'),
    mapModal: document.getElementById('ltv2-map-modal'),
    mapContent: document.getElementById('ltv2-map-content'),
    resetSceneBtn: document.getElementById('ltv2-reset-scene-btn'),
    sceneIndex: document.getElementById('ltv2-scene-index'),
    sceneTotal: document.getElementById('ltv2-scene-total'),
    score: document.getElementById('ltv2-score'),
    sentenceText: document.getElementById('ltv2-sentence-text'),
    categoryChips: document.getElementById('ltv2-category-chips'),
    step1Feedback: document.getElementById('ltv2-step1-feedback'),
    rowSticky: document.getElementById('ltv2-row-sticky'),
    rowTitle: document.getElementById('ltv2-row-title'),
    rowInsight: document.getElementById('ltv2-row-insight'),
    rowMembers: document.getElementById('ltv2-row-members'),
    changeRowBtn: document.getElementById('ltv2-change-row-btn'),
    step1: document.getElementById('ltv2-step-1'),
    step2: document.getElementById('ltv2-step-2'),
    revealCategories: document.getElementById('ltv2-reveal-categories'),
    revealProgress: document.getElementById('ltv2-reveal-progress'),
    revealCards: document.getElementById('ltv2-reveal-cards'),
    step2Feedback: document.getElementById('ltv2-step2-feedback'),
    step3: document.getElementById('ltv2-step-3'),
    reflectionCard: document.getElementById('ltv2-reflection-card'),
    editReflectBtn: document.getElementById('ltv2-edit-reflect-btn'),
    editTimer: document.getElementById('ltv2-edit-timer'),
    editWrap: document.getElementById('ltv2-edit-wrap'),
    reflectInput: document.getElementById('ltv2-reflect-input'),
    saveReflectBtn: document.getElementById('ltv2-save-reflect-btn'),
    toInsightBtn: document.getElementById('ltv2-to-insight-btn'),
    step4: document.getElementById('ltv2-step-4'),
    insightCard: document.getElementById('ltv2-insight-card'),
    nextBtn: document.getElementById('ltv2-next-btn'),
    stepperItems: Array.from(document.querySelectorAll('.ltv2-stepper [data-step]')),
    toast: document.getElementById('ltv2-toast')
  };
}

function saveProgress() {
  if (!state.progress) return;
  localStorage.setItem(LIVING_TRIPLES_STORAGE_KEY, JSON.stringify(state.progress));
}

function loadProgress() {
  const base = { played: 0, totalScore: 0, bestScore: 0, lastPlayedAt: null };
  try {
    const raw = localStorage.getItem(LIVING_TRIPLES_STORAGE_KEY);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) || {}) };
  } catch {
    return base;
  }
}

function showToast(text, cls = 'info') {
  const t = state.el.toast;
  if (!t) return;
  t.className = `ltv2-toast ${cls}`;
  t.textContent = text;
  t.classList.remove('hidden');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

function categories() {
  const out = [];
  const map = state.data.triplesMap;
  Object.keys(map.rows).map(Number).sort((a, b) => a - b).forEach((row) => {
    (map.rows[String(row)] || []).forEach((cat) => {
      out.push({ key: cat, row, he: map.labelsHe[cat] || cat, en: cat });
    });
  });
  return out;
}

function catByKey(key) {
  return categories().find((c) => c.key === key) || null;
}

function getRowMeta(row) {
  const parsed = parseRow(row);
  const rowKey = parsed ? String(parsed) : '';
  const map = state.data?.triplesMap || DEFAULT_TRIPLES_MAP;
  return {
    title: safeText(map?.rowTitlesHe?.[rowKey], DEFAULT_TRIPLES_MAP.rowTitlesHe?.[rowKey] || `שלשה ${rowKey || '?'}`),
    insight: safeText(map?.rowInsightsHe?.[rowKey], DEFAULT_TRIPLES_MAP.rowInsightsHe?.[rowKey] || '')
  };
}

function setStep(step) {
  state.step = step;
  state.el.stepperItems.forEach((item) => {
    const s = Number(item.getAttribute('data-step'));
    item.classList.toggle('is-active', s === step);
    item.classList.toggle('is-done', s < step);
  });
  state.el.step1.classList.toggle('hidden', step !== 1);
  state.el.step2.classList.toggle('hidden', step !== 2);
  state.el.step3.classList.toggle('hidden', step !== 3);
  state.el.step4.classList.toggle('hidden', step !== 4);
}

function updateTop() {
  state.el.sceneIndex.textContent = String(state.index + 1);
  state.el.sceneTotal.textContent = String(state.queue.length || 1);
  state.el.score.textContent = String(state.score);
}

function renderSentence() {
  state.el.sentenceText.textContent = safeText(state.current?.sentence, '׳׳©׳₪׳˜ ׳׳×׳¨׳’׳•׳');
}

function renderMap() {
  const rows = state.data.triplesMap.rows;
  const labels = state.data.triplesMap.labelsHe;
  state.el.mapContent.innerHTML = Object.keys(rows).map(Number).sort((a, b) => a - b).map((row) => {
    const rowMeta = getRowMeta(row);
    const chips = (rows[String(row)] || []).map((cat) => `
      <div class="ltv2-map-chip"><strong>${esc(labels[cat] || cat)}</strong><small>${esc(cat)}</small></div>
    `).join('');
    return `
      <section class="ltv2-map-row">
        <div class="ltv2-map-row-head">
          <h4>${esc(rowMeta.title)}</h4>
          <p class="ltv2-map-row-insight">${esc(rowMeta.insight)}</p>
        </div>
        <div class="ltv2-map-row-cells">${chips}</div>
      </section>
    `;
  }).join('');
}
function resetRound() {
  clearInterval(state.editTimer);
  clearTimeout(state.autoTimer);
  state.editTimer = null;
  state.autoTimer = null;
  state.step = 1;
  state.activeRow = 0;
  state.selectedCategory = '';
  state.reveal = {};
  state.reflectionText = '';

  state.el.step1Feedback.textContent = '';
  state.el.step2Feedback.textContent = '';
  state.el.revealCards.innerHTML = '';
  if (state.el.revealCategories) state.el.revealCategories.innerHTML = '';
  state.el.revealProgress.textContent = '0/3';
  state.el.rowSticky.classList.add('hidden');
  if (state.el.rowInsight) state.el.rowInsight.textContent = '';
  state.el.rowMembers.innerHTML = '';
  state.el.editWrap.classList.add('hidden');
  state.el.editTimer.textContent = '';
  state.el.reflectInput.value = '';
  state.el.reflectionCard.innerHTML = '';
  state.el.insightCard.innerHTML = '';
}

function initReveal(row) {
  const slots = {};
  (state.data.triplesMap.rows[String(row)] || []).forEach((cat) => {
    slots[cat] = { asked: false, showHelp: false, helpHint: '', answer: '', summary: '' };
  });
  state.reveal = slots;
}

function renderCategoryChips() {
  state.el.categoryChips.innerHTML = categories().map((c) => {
    const selected = c.key === state.selectedCategory;
    const rowMeta = getRowMeta(c.row);
    return `
      <button type="button" class="ltv2-category-chip ${selected ? 'is-selected' : ''}" data-ltv2-category="${encodeURIComponent(c.key)}" aria-pressed="${selected ? 'true' : 'false'}">
        <strong>${esc(c.he)}</strong>
        <small>${esc(c.en)} ֲ· ${esc(rowMeta.title)}</small>
      </button>
    `;
  }).join('');
}

function renderRowSticky() {
  if (!state.activeRow) {
    state.el.rowSticky.classList.add('hidden');
    if (state.el.rowInsight) state.el.rowInsight.textContent = '';
    state.el.rowMembers.innerHTML = '';
    return;
  }

  const labels = state.data.triplesMap.labelsHe;
  const rowCats = state.data.triplesMap.rows[String(state.activeRow)] || [];
  const rowMeta = getRowMeta(state.activeRow);
  state.el.rowTitle.textContent = rowMeta.title;
  if (state.el.rowInsight) state.el.rowInsight.textContent = rowMeta.insight;
  state.el.rowMembers.innerHTML = rowCats.map((cat) => {
    const selected = cat === state.selectedCategory;
    return `<span class="ltv2-row-member ${selected ? 'is-selected' : ''}">${esc(labels[cat] || cat)}</span>`;
  }).join('');
  state.el.rowSticky.classList.remove('hidden');
}

function revealCount() {
  const keys = Object.keys(state.reveal);
  const asked = keys.filter((k) => state.reveal[k]?.asked).length;
  return { asked, total: keys.length };
}

function helpHint(cat, option) {
  const slot = state.reveal[cat] || {};
  const labels = state.data.triplesMap.labelsHe;
  if (Number(option) === 1) {
    return `׳“׳•׳’׳׳” ׳§׳˜׳ ׳”: ׳‘׳׳§׳•׳ ׳׳©׳₪׳˜ ׳›׳׳׳™, ׳ ׳¡׳—/׳™ ׳׳§׳¨׳” ׳׳—׳“ ׳׳׳©׳™. (${labels[cat] || cat})`;
  }
  const short = (slot.answer || '').length > 90 ? `${slot.answer.slice(0, 88).trim()}...` : (slot.answer || '');
  return `׳©׳׳׳” ׳¢׳“׳™׳ ׳”: ׳׳×׳™ ׳›׳ / ׳׳™ ׳›׳ ׳”׳™׳” ׳™׳•׳“׳¢? ׳¨׳׳–: ${short}`;
}

function renderReveal() {
  const labels = state.data.triplesMap.labelsHe;
  const rowCats = state.data.triplesMap.rows[String(state.activeRow)] || [];

  state.el.revealCards.innerHTML = rowCats.map((cat) => {
    const slot = state.reveal[cat] || {};
    const ans = state.current?.answers?.[cat] || {};
    const answered = Boolean(slot.asked);

    return `
      <article class="ltv2-reveal-card ${answered ? 'is-answered opened-content' : ''}" data-ltv2-card="${encodeURIComponent(cat)}">
        <header><h5>${esc(labels[cat] || cat)}</h5><small>${esc(cat)}</small></header>
        <p class="ltv2-reveal-question">${esc(ans.question || defaultQuestion(cat))}</p>
        <div class="ltv2-reveal-actions">
          <button type="button" class="btn btn-primary" data-ltv2-act="ask" data-ltv2-cat="${encodeURIComponent(cat)}" ${answered ? 'disabled' : ''}>${answered ? '׳ ׳©׳׳ ג“' : '׳©׳׳'}</button>
          <button type="button" class="btn btn-secondary" data-ltv2-act="help" data-ltv2-cat="${encodeURIComponent(cat)}" ${answered ? 'disabled' : ''}>׳׳ ׳™ ׳׳ ׳™׳•׳“׳¢</button>
        </div>
        ${slot.showHelp && !answered ? `
          <div class="ltv2-help-popover opened-content">
            <button type="button" class="btn btn-secondary" data-ltv2-act="help-option" data-ltv2-option="1" data-ltv2-cat="${encodeURIComponent(cat)}">׳ ׳ ׳¡׳” ׳“׳•׳’׳׳” ׳׳—׳× ׳§׳˜׳ ׳”?</button>
            <button type="button" class="btn btn-secondary" data-ltv2-act="help-option" data-ltv2-option="2" data-ltv2-cat="${encodeURIComponent(cat)}">׳׳×׳™ ׳›׳ / ׳׳™ ׳›׳ ׳”׳™׳” ׳™׳•׳“׳¢?</button>
          </div>
        ` : ''}
        ${slot.helpHint ? `<p class="ltv2-help-hint">${esc(slot.helpHint)}</p>` : ''}
        ${answered ? `<p class="ltv2-answer-text">ג… ${esc(slot.answer)}</p>` : ''}
      </article>
    `;
  }).join('');

  const c = revealCount();
  state.el.revealProgress.textContent = `${c.asked}/${c.total}`;
}

function renderRevealCategories() {
  if (!state.el.revealCategories) return;
  const activeRow = state.activeRow;
  state.el.revealCategories.innerHTML = categories().map((c) => {
    const isRow = c.row === activeRow;
    return `
      <button type="button" class="ltv2-reveal-cat ${isRow ? 'is-row' : ''}" data-ltv2-category="${encodeURIComponent(c.key)}">
        ${esc(c.he)}
      </button>
    `;
  }).join('');
}

function buildReflection() {
  const labels = state.data.triplesMap.labelsHe;
  const rowCats = state.data.triplesMap.rows[String(state.activeRow)] || [];
  const lines = rowCats.map((cat, i) => {
    const slot = state.reveal[cat] || {};
    const summary = safeText(slot.summary || slot.answer, '---');
    return `(${i + 1}) ${labels[cat] || cat}: ${summary}`;
  });
  return `׳׳– ׳׳ ׳׳ ׳™ ׳׳‘׳™׳ ׳ ׳›׳•׳:\n${lines.join('\n')}`;
}

function renderReflection() {
  state.el.reflectionCard.innerHTML = `<p>${esc(state.reflectionText).replace(/\n/g, '<br>')}</p>`;
}

function renderInsight() {
  const text = safeText(state.current?.insight, '׳׳¢׳ ׳™׳™׳... ׳׳ ׳—׳©׳‘׳×׳™ ׳¢׳ ׳–׳” ׳›׳›׳”.');
  state.el.insightCard.innerHTML = `<p class="ltv2-insight-quote">"${esc(text)}"</p><p class="ltv2-insight-sub">׳™׳₪׳”. ׳”׳©׳׳©׳” ׳”׳•׳©׳׳׳” ׳•׳ ׳•׳¦׳¨׳” ׳×׳׳•׳ ׳” ׳˜׳™׳₪׳•׳׳™׳× ׳‘׳¨׳•׳¨׳” ׳™׳•׳×׳¨.</p>`;
}

function render() {
  setStep(state.step);
  updateTop();
  renderSentence();
  renderCategoryChips();
  renderRowSticky();
  if (state.step >= 2) {
    renderRevealCategories();
    renderReveal();
  }
  if (state.step >= 3) renderReflection();
  if (state.step >= 4) renderInsight();
}

function wrongShake(node) {
  if (!node) return;
  node.classList.add('ltv2-shake');
  setTimeout(() => node.classList.remove('ltv2-shake'), 320);
}

function handleCategoryPick(catKey, button) {
  const cat = catByKey(catKey);
  if (!cat || !state.current) return;

  if (state.step === 1) {
    if (cat.row !== state.current.targetRow) {
      state.score = Math.max(0, state.score - 15);
      state.el.step1Feedback.textContent = '׳ ׳¡׳”/׳™ ׳©׳•׳‘: ׳—׳₪׳©/׳™ ׳§׳˜׳’׳•׳¨׳™׳” ׳©׳©׳™׳™׳›׳× ׳׳©׳•׳¨׳” ׳”׳₪׳¢׳™׳׳” ׳‘׳׳©׳₪׳˜ ׳”׳–׳”.';
      wrongShake(button);
      updateTop();
      return;
    }

    state.selectedCategory = cat.key;
    state.activeRow = cat.row;
    initReveal(cat.row);
    state.score += 80;
    state.el.step1Feedback.textContent = `נבחר: ${cat.he}. השלשה הפעילה: ${getRowMeta(cat.row).title}. עכשיו משלימים Reveal מלא.`;
    setStep(2);
    render();
    state.el.step2.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  if (state.step === 2) {
    if (cat.row !== state.activeRow) {
      const selected = catByKey(state.selectedCategory);
      state.el.step2Feedback.textContent = `❌ לא באותה שלשה. חפש/י את שתי האחיות של ${selected?.he || 'הקטגוריה הנוכחית'} בתוך "${getRowMeta(state.activeRow).title}".`;
      wrongShake(button);
      showToast('׳׳ ׳‘׳׳•׳×׳” ׳©׳׳©׳”', 'danger');
      return;
    }
    const card = state.el.revealCards.querySelector(`[data-ltv2-card="${encodeURIComponent(cat.key)}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('opened-content');
      setTimeout(() => card.classList.remove('opened-content'), 900);
    }
  }
}

function maybeToReflection() {
  const c = revealCount();
  if (c.total && c.asked === c.total) {
    state.el.step2Feedback.textContent = '׳׳¢׳•׳׳”. ׳”׳©׳׳©׳” ׳”׳•׳©׳׳׳” (3/3). ׳¢׳•׳‘׳¨׳™׳ ׳׳©׳™׳§׳•׳£...';
    state.autoTimer = setTimeout(() => {
      state.reflectionText = buildReflection();
      setStep(3);
      render();
      state.el.step3.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 420);
  }
}

function handleRevealAction(catKey, action, option) {
  const slot = state.reveal[catKey];
  if (!slot) return;

  if (action === 'ask') {
    if (slot.asked) return;
    const ans = state.current?.answers?.[catKey] || {};
    slot.asked = true;
    slot.showHelp = false;
    slot.answer = safeText(ans.answer, '׳׳™׳ ׳×׳©׳•׳‘׳” ׳׳•׳›׳ ׳”. ׳ ׳¡׳• ׳׳©׳׳•׳ ׳׳—׳“׳© ׳‘׳§׳¦׳¨׳”.');
    slot.summary = safeText(ans.summary, slot.answer);
    slot.helpHint = '';
    state.score += 55;
    renderReveal();
    updateTop();
    maybeToReflection();
    return;
  }

  if (action === 'help') {
    Object.keys(state.reveal).forEach((k) => { if (k !== catKey) state.reveal[k].showHelp = false; });
    slot.showHelp = !slot.showHelp;
    renderReveal();
    return;
  }

  if (action === 'help-option') {
    slot.showHelp = false;
    slot.helpHint = helpHint(catKey, option);
    renderReveal();
  }
}
function startEditReflection() {
  state.el.editWrap.classList.remove('hidden');
  state.el.reflectInput.value = state.reflectionText;
  const started = Date.now();
  const limit = 10000;
  clearInterval(state.editTimer);
  state.editTimer = setInterval(() => {
    const left = Math.max(0, limit - (Date.now() - started));
    state.el.editTimer.textContent = `׳ ׳•׳×׳¨׳• ${(left / 1000).toFixed(1)} ׳©׳ ׳™׳•׳×`;
    if (left <= 0) saveEditReflection();
  }, 120);
}

function saveEditReflection() {
  clearInterval(state.editTimer);
  state.editTimer = null;
  state.reflectionText = safeText(state.el.reflectInput.value, state.reflectionText);
  state.el.editWrap.classList.add('hidden');
  state.el.editTimer.textContent = '׳”׳©׳™׳§׳•׳£ ׳ ׳©׳׳¨.';
  renderReflection();
}

function toInsight() {
  setStep(4);
  render();
  state.el.step4.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function loadCurrentScenario() {
  if (!state.queue.length) {
    state.queue = shuffle([...state.data.scenarios]);
    state.index = 0;
  }
  state.current = state.queue[state.index] || state.data.scenarios[0];
  resetRound();
  setStep(1);
  render();
}

function nextScenario() {
  state.progress.played += 1;
  state.progress.totalScore += state.score;
  state.progress.bestScore = Math.max(Number(state.progress.bestScore || 0), Number(state.score || 0));
  state.progress.lastPlayedAt = new Date().toISOString();
  saveProgress();

  state.index += 1;
  if (state.index >= state.queue.length) {
    state.queue = shuffle([...state.data.scenarios]);
    state.index = 0;
  }
  loadCurrentScenario();
}

function restartPickStep() {
  state.activeRow = 0;
  state.selectedCategory = '';
  state.reveal = {};
  state.el.step1Feedback.textContent = '׳‘׳—׳¨/׳™ ׳§׳˜׳’׳•׳¨׳™׳” ׳—׳“׳©׳” ׳›׳“׳™ ׳׳”׳×׳—׳™׳ ׳©׳•׳‘ ׳׳× ׳”׳©׳׳©׳”.';
  state.el.step2Feedback.textContent = '';
  setStep(1);
  render();
}

function openMap() {
  state.el.mapModal.classList.remove('hidden');
  document.body.classList.add('screen-guide-open');
}

function closeMap() {
  state.el.mapModal.classList.add('hidden');
  if (!document.querySelector('.screen-read-guide-modal:not(.hidden)')) {
    document.body.classList.remove('screen-guide-open');
  }
}

function startPractice() {
  state.el.onboarding.classList.add('hidden');
  state.el.practice.classList.remove('hidden');
  state.queue = shuffle([...state.data.scenarios]);
  state.index = 0;
  state.score = 0;
  loadCurrentScenario();
}

function bindEvents() {
  state.el.startBtn.addEventListener('click', startPractice);
  state.el.openMapTopBtn.addEventListener('click', openMap);
  state.el.openMapBtn.addEventListener('click', openMap);
  state.el.closeMapBtn.addEventListener('click', closeMap);

  state.el.mapModal.addEventListener('click', (e) => {
    if (e.target === state.el.mapModal) closeMap();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !state.el.mapModal.classList.contains('hidden')) closeMap();
  });

  state.el.resetSceneBtn.addEventListener('click', () => {
    state.queue = shuffle([...state.data.scenarios]);
    state.index = 0;
    loadCurrentScenario();
    showToast('׳ ׳˜׳¢׳ ׳×׳¨׳—׳™׳© ׳—׳“׳©', 'info');
  });

  state.el.changeRowBtn.addEventListener('click', restartPickStep);

  state.el.categoryChips.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ltv2-category]');
    if (!btn) return;
    const catKey = decodeURIComponent(btn.getAttribute('data-ltv2-category') || '');
    handleCategoryPick(catKey, btn);
  });

  state.el.revealCards.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ltv2-act]');
    if (!btn) return;
    const action = btn.getAttribute('data-ltv2-act') || '';
    const catKey = decodeURIComponent(btn.getAttribute('data-ltv2-cat') || '');
    const option = btn.getAttribute('data-ltv2-option') || '';
    if (!catKey) return;
    handleRevealAction(catKey, action, option);
  });

  state.el.revealCategories?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ltv2-category]');
    if (!btn) return;
    const catKey = decodeURIComponent(btn.getAttribute('data-ltv2-category') || '');
    handleCategoryPick(catKey, btn);
  });

  state.el.editReflectBtn.addEventListener('click', startEditReflection);
  state.el.saveReflectBtn.addEventListener('click', saveEditReflection);
  state.el.toInsightBtn.addEventListener('click', toInsight);
  state.el.nextBtn.addEventListener('click', nextScenario);
}

function renderInit() {
  state.el.onboarding.classList.remove('hidden');
  state.el.practice.classList.add('hidden');
  renderMap();
}

async function setupLivingTriplesModule() {
  state.el = getElements();
  if (!state.el.root) return;

  state.progress = loadProgress();
  state.data = await loadData();

  if (!Array.isArray(state.data.scenarios) || !state.data.scenarios.length) {
    state.data = normalizeData({ triplesMap: DEFAULT_TRIPLES_MAP, scenarios: FALLBACK_SCENARIOS });
  }

  bindEvents();
  renderInit();
}

window.setupLivingTriplesModule = setupLivingTriplesModule;

