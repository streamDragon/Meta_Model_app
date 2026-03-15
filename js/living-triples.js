const LIVING_TRIPLES_STORAGE_KEY = 'living_triples_progress_v3';
const LIVING_TRIPLES_PREFS_KEY = 'living_triples_prefs_v1';
const LIVING_TRIPLES_DATA_URL = 'data/living-triples.json';

const STEP_META = Object.freeze([
  Object.freeze({ key: 'context', label: 'הקשר' }),
  Object.freeze({ key: 'identify', label: 'זיהוי' }),
  Object.freeze({ key: 'questions', label: '3 שאלות' }),
  Object.freeze({ key: 'landing', label: 'שיקוף' })
]);

const SLOT_META = Object.freeze([
  Object.freeze({ key: 'left', color: '#E24B4A' }),
  Object.freeze({ key: 'center', color: '#7F77DD' }),
  Object.freeze({ key: 'right', color: '#1D9E75' })
]);

function awardXP(amount) {
  try {
    if (window.MetaGamification && typeof window.MetaGamification.addXP === 'function') {
      window.MetaGamification.addXP(amount, 'livingTriples');
    }
  } catch (_) {}
}

function awardStars(amount) {
  try {
    if (window.MetaGamification && typeof window.MetaGamification.addStars === 'function') {
      window.MetaGamification.addStars(amount, 'livingTriples');
    }
  } catch (_) {}
}

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
    sentence: 'זה לא בסדר שהיא לא ענתה לי כל היום. ברור שהיא כבר לא רוצה אותי.',
    answers: {
      'Lost Performative': {
        question: 'לפי מי זה "לא בסדר"?',
        answer: 'לפי הסטנדרט שלי בזוגיות: מי שרוצה קשר עונה.',
        summary: 'סטנדרט אישי: רצון = מענה.'
      },
      'Assumptions': {
        question: 'מה אתה מניח שחייב להיות נכון כדי שהמסקנה תעמוד?',
        answer: 'אני מניח שאם יש אהבה - יש תגובה יחסית מהר.',
        summary: 'הנחה: אהבה נמדדת במהירות תגובה.'
      },
      'Mind Reading': {
        question: 'איך אתה יודע שהיא כבר לא רוצה אותך?',
        answer: 'אני לא יודע בוודאות, אני מפרש את השתיקה כריחוק.',
        summary: 'פרשנות פנימית לשתיקה.'
      }
    },
    insight: 'אולי הפכתי זמן תגובה למדד מוחלט של אהבה.'
  },
  {
    id: 'fallback_row2',
    targetRow: 2,
    sentence: 'אני לא יכול להתחייב לחתונה. זה תמיד מסתבך, כי אני נחנק.',
    answers: {
      'Universal Quantifier': {
        question: 'תמיד? מתי זה לא מסתבך אפילו קצת?',
        answer: 'היו תקופות שזה היה קל יותר, בעיקר כשלא היה לחץ.',
        summary: 'לא תמיד: תלוי בעומס ובלחץ.'
      },
      'Modal Operator': {
        question: 'מה בדיוק מונע ממך להתחייב?',
        answer: 'הפחד שאאבד חופש ושאעשה טעות.',
        summary: 'המניעה: פחד מאובדן חופש וטעות.'
      },
      'Cause & Effect': {
        question: 'איך בדיוק נחנק גורם למסתבך?',
        answer: 'כשאני נחנק אני מתרחק, ואז הצד השני לוחץ ונוצר ריב.',
        summary: 'נחנק -> התרחקות -> לחץ -> ריב.'
      }
    },
    insight: 'הבנתי שהטריגר המרכזי הוא תחושת החנק, לא עצם המחויבות.'
  }
];

const state = {
  data: null,
  queue: [],
  index: 0,
  current: null,
  screen: 'onboarding',
  step: 'context',
  selectedRow: 0,
  wrongRow: 0,
  identifyAttempts: 0,
  identifySolved: false,
  asked: {},
  questionChat: [],
  landingCursor: 0,
  landingVisible: [],
  debriefOpen: false,
  roundScore: 0,
  progress: null,
  prefs: null,
  toastTimer: 0,
  els: null
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

function safeText(v, fallback = '') {
  const text = String(v || '').trim();
  return text || String(fallback || '').trim();
}

function normKey(v) {
  return String(v || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function parseRow(v) {
  if (typeof v === 'number') return v >= 1 && v <= 5 ? v : 0;
  const text = String(v || '').trim();
  if (/^[1-5]$/.test(text)) return Number(text);
  if (/^row[1-5]$/i.test(text)) return Number(text.replace(/[^\d]/g, ''));
  return 0;
}

function shuffle(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function defaultQuestion(cat) {
  const q = {
    'Lost Performative': 'לפי מי זה נכון/לא נכון?',
    'Assumptions': 'איזו הנחה סמויה חייבת להיות נכונה כאן?',
    'Mind Reading': 'איך אתה יודע מה האדם השני חושב/מרגיש?',
    'Universal Quantifier': 'תמיד/אף פעם? מתי זה לא נכון?',
    'Modal Operator': 'מה מונע ממך? מה יקרה אם כן?',
    'Cause & Effect': 'איך בדיוק X גורם ל-Y?',
    'Nominalisations': 'כשאתה אומר את המילה הזו - מה קורה בפועל?',
    'Identity Predicates': 'מי אתה נהיה כשאתה אומר "אני X"?',
    'Complex Equivalence': 'איך X אומר בהכרח Y?',
    'Comparative Deletion': 'יותר/פחות ביחס למה?',
    'Time & Space Predicates': 'מתי ואיפה בדיוק זה קורה?',
    'Lack of Referential Index': 'מי בדיוק? על מי זה נאמר?',
    'Non-referring nouns': 'מה זה בדיוק? תן דוגמה מוחשית.',
    'Sensory Predicates': 'איך אתה יודע - מה ראית/שמעת/הרגשת?',
    'Unspecified Verbs': 'מה האדם עושה בפועל? צעד-צעד.'
  };
  return q[cat] || 'מה השאלה המדויקת שכדאי לשאול כאן?';
}

function categoryColor(index) {
  return SLOT_META[index]?.color || '#1D9E75';
}

function extractThemeName(title) {
  const raw = safeText(title);
  const parts = raw.split('|').map((part) => part.trim()).filter(Boolean);
  return parts[1] || parts[0] || raw || 'השורה הזו';
}

function shortSentence(text, max = 120) {
  const compact = safeText(text).replace(/\s+/g, ' ');
  return compact.length > max ? `${compact.slice(0, max - 1).trim()}…` : compact;
}

function splitSentence(text) {
  return safeText(text)
    .split(/(?<=[.!?…])\s+/)
    .map((part) => safeText(part))
    .filter(Boolean);
}

function speakerLabel(from) {
  const key = normKey(from);
  if (key === 'therapist') return 'מטפל/ת';
  if (key === 'client') return 'מטופל/ת';
  if (key === 'narrator' || key === 'system') return 'מערכת';
  return '';
}

function normalizeMap(payload) {
  const from = payload?.triplesMap || {};
  const rows = {};

  if (from.rows && typeof from.rows === 'object' && !Array.isArray(from.rows)) {
    Object.entries(from.rows).forEach(([rowKey, cats]) => {
      const row = parseRow(rowKey);
      if (!row || !Array.isArray(cats)) return;
      rows[String(row)] = cats.map((item) => safeText(item)).filter(Boolean);
    });
  }

  if (!Object.keys(rows).length) return JSON.parse(JSON.stringify(DEFAULT_TRIPLES_MAP));

  const allCats = Object.values(rows).flat();
  const pickCat = (raw) => allCats.find((cat) => normKey(cat) === normKey(raw)) || safeText(raw);

  const categoryToRow = {};
  Object.entries(from.categoryToRow || {}).forEach(([cat, row]) => {
    const picked = pickCat(cat);
    const parsed = parseRow(row);
    if (picked && parsed) categoryToRow[picked] = parsed;
  });
  Object.entries(rows).forEach(([rowKey, cats]) => {
    cats.forEach((cat) => {
      if (!categoryToRow[cat]) categoryToRow[cat] = Number(rowKey);
    });
  });

  const labelsHe = {};
  Object.entries(from.labelsHe || {}).forEach(([cat, label]) => {
    const picked = pickCat(cat);
    if (picked && safeText(label)) labelsHe[picked] = safeText(label);
  });
  Object.keys(categoryToRow).forEach((cat) => {
    if (!labelsHe[cat]) labelsHe[cat] = DEFAULT_TRIPLES_MAP.labelsHe[cat] || cat;
  });

  const rowTitlesHe = {};
  const rowInsightsHe = {};
  Object.keys(rows).forEach((rowKey) => {
    rowTitlesHe[rowKey] = DEFAULT_TRIPLES_MAP.rowTitlesHe[rowKey] || `שלשה ${rowKey}`;
    rowInsightsHe[rowKey] = DEFAULT_TRIPLES_MAP.rowInsightsHe[rowKey] || '';
  });
  Object.entries(from.rowTitlesHe || {}).forEach(([rowKey, title]) => {
    const parsed = parseRow(rowKey);
    if (parsed && safeText(title)) rowTitlesHe[String(parsed)] = safeText(title);
  });
  Object.entries(from.rowInsightsHe || {}).forEach(([rowKey, insight]) => {
    const parsed = parseRow(rowKey);
    if (parsed && safeText(insight)) rowInsightsHe[String(parsed)] = safeText(insight);
  });

  return { rows, categoryToRow, labelsHe, rowTitlesHe, rowInsightsHe };
}

function pickScenarioText(raw) {
  const keys = ['target', 'sentence', 'clientSentence', 'client_sentence', 'text', 'client_text'];
  for (const key of keys) {
    const value = raw?.[key];
    if (Array.isArray(value)) {
      const joined = value.map((item) => safeText(item)).filter(Boolean).join(' ').trim();
      if (joined) return joined;
    }
    const text = safeText(value);
    if (text) return text;
  }
  return 'משפט לתרגול';
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

function normalizeContextEntry(entry, fallbackText, highlight = false) {
  if (typeof entry === 'string') {
    return { from: 'client', text: safeText(entry, fallbackText), highlight };
  }
  const from = safeText(entry?.from, highlight ? 'client' : 'narrator');
  const text = safeText(entry?.text, fallbackText);
  if (!text) return null;
  return {
    from,
    text,
    highlight: !!entry?.highlight || highlight,
    label: safeText(entry?.label, highlight ? '← המשפט לעבודה' : '')
  };
}

function normalizeLandingEntry(entry) {
  if (typeof entry === 'string') return { from: 'client', text: safeText(entry) };
  const from = safeText(entry?.from, 'client');
  const text = safeText(entry?.text);
  if (!text) return null;
  return { from, text };
}

function normalizeDebriefItem(entry, fallbackIcon) {
  if (typeof entry === 'string') {
    return { icon: fallbackIcon, bold: '', text: safeText(entry) };
  }
  const text = safeText(entry?.text);
  if (!text) return null;
  return {
    icon: safeText(entry?.icon, fallbackIcon),
    bold: safeText(entry?.bold),
    text
  };
}

function defaultContext(sentence, rowMeta) {
  const parts = splitSentence(sentence);
  const leadLine = parts.length > 1 ? parts[0] : 'זה יושב עליי כבר כמה זמן.';
  const secondLine = parts.length > 1
    ? 'וכל פעם שאני חוזר/ת לזה, זה נהיה עוד יותר חד.'
    : `זה מתקשר לי ישר ל-${extractThemeName(rowMeta.title)}.`;
  return [
    { from: 'narrator', text: `שיחת טיפול. המטופל/ת מתאר/ת משפט טעון סביב ${extractThemeName(rowMeta.title)}.` },
    { from: 'client', text: safeText(leadLine, 'זה יושב עליי כבר כמה זמן.') },
    { from: 'client', text: safeText(secondLine, 'וכל פעם שאני חוזר/ת לזה, זה נהיה עוד יותר חד.') },
    { from: 'client', text: sentence, highlight: true, label: '← המשפט לעבודה' }
  ];
}

function buildTriple(raw, rowCats, labelsHe) {
  const explicitTriple = raw?.triple && typeof raw.triple === 'object' ? raw.triple : null;
  return SLOT_META.map((slotMeta, index) => {
    const fallbackCat = rowCats[index] || `slot_${index + 1}`;
    const block = explicitTriple?.[slotMeta.key] || getAnswerByCat(raw?.answers, fallbackCat) || {};
    const explicitCategory = safeText(block?.category, fallbackCat);
    const answerBlock = getAnswerByCat(raw?.answers, explicitCategory) || getAnswerByCat(raw?.answers, fallbackCat) || {};
    const category = safeText(explicitCategory, fallbackCat);
    return {
      slot: slotMeta.key,
      color: slotMeta.color,
      category,
      labelHe: safeText(labelsHe[category], labelsHe[fallbackCat] || category),
      question: safeText(block?.question || answerBlock?.question, defaultQuestion(category)),
      response: safeText(block?.response || block?.answer || answerBlock?.answer, '...'),
      summary: safeText(block?.summary || answerBlock?.summary, block?.response || block?.answer || answerBlock?.answer || '...')
    };
  });
}

function defaultWrongHint(rowMeta, triple) {
  return `חפש/י את המשפחה של "${extractThemeName(rowMeta.title)}": ${triple.map((item) => item.labelHe).join(' · ')}.`;
}

function defaultLanding(scenario, rowMeta) {
  const [left, center, right] = scenario.triple;
  const theme = extractThemeName(rowMeta.title);
  return [
    { from: 'label', text: 'שיקוף' },
    {
      from: 'therapist',
      text: `אני שומע/ת שכאן יש ${shortSentence(left.summary, 70)}, שמתחת לזה יושב גם ${shortSentence(center.summary, 70)}, ושמזה נבנית עוד מסקנה של ${shortSentence(right.summary, 70)}.`
    },
    { from: 'client', text: '[שתיקה קצרה]' },
    { from: 'client', text: 'כן... כששמים את זה ככה, אני שומע/ת כמה מהר זה נסגר עליי מבפנים.' },
    { from: 'label', text: 'ריפריימינג' },
    {
      from: 'therapist',
      text: `אולי זה לא פסק דין עלייך, אלא דרך ישנה שהמחשבה מנסה להגן דרכה על ${theme}.`
    },
    { from: 'client', text: '...' },
    { from: 'client', text: safeText(scenario.insight, 'זה פותח לי דרך אחרת להסתכל על זה.') },
    { from: 'label', text: 'שאלת המשך' },
    {
      from: 'therapist',
      text: `מה היית רוצה לבדוק עכשיו, כששלושת החלקים של ${theme} כבר על השולחן?`
    },
    {
      from: 'client',
      text: 'אני רוצה להישאר רגע עם זה, ולבדוק מה קורה אם אני לא רץ/ה מיד לאותה מסקנה.'
    }
  ];
}

function defaultDebrief(scenario, rowMeta) {
  const names = scenario.triple.map((item) => item.labelHe).join(' · ');
  return [
    {
      icon: '🧩',
      bold: '3 שאלות מאותה שורה',
      text: `פתחו יחד את ${names} בתוך "${extractThemeName(rowMeta.title)}".`
    },
    {
      icon: '🪞',
      bold: 'שיקוף',
      text: 'אסף את שלושת החלקים בלי לתקן מהר ובלי להתווכח עם החוויה.'
    },
    {
      icon: '🔄',
      bold: 'ריפריימינג',
      text: 'הזיז את המסגור מפסק דין סגור לאפשרות שאפשר לבדוק מחדש.'
    },
    {
      icon: '🧭',
      bold: 'שאלת המשך',
      text: 'החזירה בחירה וסוכנות למה שהמטופל/ת רוצה לבדוק עכשיו.'
    },
    {
      icon: '🌱',
      bold: 'תוצאה',
      text: safeText(scenario.insight, rowMeta.insight || 'המשפט התחיל להיפתח במקום להישאר מסקנה סגורה.')
    }
  ];
}

function normalizeScenario(raw, index, triplesMap) {
  if (!raw || typeof raw !== 'object') return null;
  let targetRow = parseRow(raw.targetRow || raw.target_row || raw.correct_row || raw.rowId || raw.row_id);
  const directCategory = safeText(raw.correctCategory || raw.correct_category);
  if (!targetRow && directCategory) {
    const entry = Object.entries(triplesMap.categoryToRow).find(([cat]) => normKey(cat) === normKey(directCategory));
    if (entry) targetRow = Number(entry[1]) || 0;
  }
  if (!targetRow || !triplesMap.rows[String(targetRow)]?.length) return null;

  const rowCats = triplesMap.rows[String(targetRow)] || [];
  const rowMeta = {
    title: safeText(triplesMap.rowTitlesHe?.[String(targetRow)], DEFAULT_TRIPLES_MAP.rowTitlesHe[String(targetRow)] || `שלשה ${targetRow}`),
    insight: safeText(triplesMap.rowInsightsHe?.[String(targetRow)], DEFAULT_TRIPLES_MAP.rowInsightsHe[String(targetRow)] || '')
  };
  const sentence = pickScenarioText(raw);
  const triple = buildTriple(raw, rowCats, triplesMap.labelsHe || {});

  const contextSource = Array.isArray(raw.context) && raw.context.length
    ? raw.context.map((entry, entryIndex) => normalizeContextEntry(entry, entryIndex === 0 ? sentence : '')).filter(Boolean)
    : defaultContext(sentence, rowMeta).map((entry) => normalizeContextEntry(entry, sentence, !!entry.highlight)).filter(Boolean);
  const hasHighlighted = contextSource.some((entry) => entry.highlight);
  const context = hasHighlighted
    ? contextSource
    : [...contextSource, normalizeContextEntry({ from: 'client', text: sentence, highlight: true, label: '← המשפט לעבודה' }, sentence, true)].filter(Boolean);

  const landing = (Array.isArray(raw.landing) ? raw.landing : defaultLanding({ triple, insight: raw.insight }, rowMeta))
    .map((entry) => normalizeLandingEntry(entry))
    .filter(Boolean);

  const debrief = (Array.isArray(raw.debrief) ? raw.debrief : defaultDebrief({ triple, insight: raw.insight }, rowMeta))
    .map((entry, entryIndex) => normalizeDebriefItem(entry, ['🧩', '🪞', '🔄', '🧭', '🌱'][entryIndex] || '•'))
    .filter(Boolean);

  return {
    id: safeText(raw.id || raw.scenarioId || raw.scenario_id, `lt_scn_${index + 1}`),
    targetRow,
    theme: extractThemeName(rowMeta.title),
    rowTitle: rowMeta.title,
    rowInsight: rowMeta.insight,
    context,
    target: safeText(raw.target, sentence),
    wrongHint: safeText(raw.wrong_hint || raw.wrongHint, defaultWrongHint(rowMeta, triple)),
    triple,
    landing,
    debrief,
    insight: safeText(raw.insight, 'מעניין... כשהמשפט נפתח דרך כל השלשה, התמונה נעשית מדויקת יותר.')
  };
}

function normalizeData(payload) {
  const triplesMap = normalizeMap(payload || {});
  const scenarios = (Array.isArray(payload?.scenarios) ? payload.scenarios : [])
    .map((item, index) => normalizeScenario(item, index, triplesMap))
    .filter(Boolean);

  if (!scenarios.length) {
    return {
      version: '1.0.0',
      language: 'he',
      triplesMap: JSON.parse(JSON.stringify(DEFAULT_TRIPLES_MAP)),
      scenarios: FALLBACK_SCENARIOS.map((item, index) => normalizeScenario(item, index, DEFAULT_TRIPLES_MAP)).filter(Boolean)
    };
  }

  return {
    version: safeText(payload?.version, '1.0.0'),
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
  } catch (error) {
    console.warn('Cannot load living triples data, fallback in use.', error);
    return normalizeData({ triplesMap: DEFAULT_TRIPLES_MAP, scenarios: FALLBACK_SCENARIOS });
  }
}

function loadProgress() {
  const base = { played: 0, totalScore: 0, bestRound: 0, lastPlayedAt: null };
  try {
    const raw = localStorage.getItem(LIVING_TRIPLES_STORAGE_KEY);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) || {}) };
  } catch {
    return base;
  }
}

function saveProgress() {
  if (!state.progress) return;
  localStorage.setItem(LIVING_TRIPLES_STORAGE_KEY, JSON.stringify(state.progress));
}

function loadPrefs() {
  const base = { onboardingDone: false };
  try {
    const raw = localStorage.getItem(LIVING_TRIPLES_PREFS_KEY);
    if (!raw) return base;
    return { ...base, ...(JSON.parse(raw) || {}) };
  } catch {
    return base;
  }
}

function savePrefs() {
  if (!state.prefs) return;
  localStorage.setItem(LIVING_TRIPLES_PREFS_KEY, JSON.stringify(state.prefs));
}

function currentStepIndex() {
  return Math.max(0, STEP_META.findIndex((item) => item.key === state.step));
}

function getRowMeta(row) {
  const parsed = parseRow(row);
  const rowKey = String(parsed || '');
  const map = state.data?.triplesMap || DEFAULT_TRIPLES_MAP;
  return {
    row: parsed,
    title: safeText(map.rowTitlesHe?.[rowKey], DEFAULT_TRIPLES_MAP.rowTitlesHe[rowKey] || `שלשה ${rowKey}`),
    insight: safeText(map.rowInsightsHe?.[rowKey], DEFAULT_TRIPLES_MAP.rowInsightsHe[rowKey] || ''),
    categories: (map.rows?.[rowKey] || []).map((cat, index) => ({
      category: cat,
      labelHe: safeText(map.labelsHe?.[cat], cat),
      color: categoryColor(index)
    }))
  };
}

function showToast(text, tone = 'info') {
  const toast = state.els.toast;
  if (!toast) return;
  toast.textContent = safeText(text);
  toast.className = `ltv2-toast ${tone}`;
  toast.classList.remove('hidden');
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, 1800);
}

function addScore(points) {
  state.roundScore += Number(points || 0);
}

function resetRoundState() {
  state.step = 'context';
  state.selectedRow = 0;
  state.wrongRow = 0;
  state.identifyAttempts = 0;
  state.identifySolved = false;
  state.asked = {};
  state.questionChat = [];
  state.landingCursor = 0;
  state.landingVisible = [];
  state.debriefOpen = false;
  state.roundScore = 0;
}

function loadCurrentScenario() {
  if (!state.queue.length) {
    state.queue = shuffle([...(state.data?.scenarios || [])]);
    state.index = 0;
  }
  state.current = state.queue[state.index] || state.data?.scenarios?.[0] || null;
  resetRoundState();
}

function beginPractice() {
  state.screen = 'practice';
  state.prefs.onboardingDone = true;
  savePrefs();
  if (!state.current) loadCurrentScenario();
  render();
}

function showOnboarding() {
  state.screen = 'onboarding';
  render();
}

function resetProfile() {
  state.prefs.onboardingDone = false;
  savePrefs();
  showToast('הפרופיל אופס. פתיחת ההדרכה תחזור בפעם הבאה.', 'info');
  showOnboarding();
}

function openMap() {
  if (!state.els.mapModal) return;
  state.els.mapModal.classList.remove('hidden');
  state.els.mapModal.removeAttribute('hidden');
  document.body.classList.add('screen-guide-open');
}

function closeMap() {
  if (!state.els.mapModal) return;
  state.els.mapModal.classList.add('hidden');
  state.els.mapModal.setAttribute('hidden', '');
  document.body.classList.remove('screen-guide-open');
}

function renderMap() {
  if (!state.els.mapContent || !state.data?.triplesMap) return;
  const rows = Object.keys(state.data.triplesMap.rows).map(Number).sort((a, b) => a - b);
  state.els.mapContent.innerHTML = `
    <div class="ltv3-map-grid">
      ${rows.map((row) => {
        const rowMeta = getRowMeta(row);
        return `
          <article class="ltv3-map-row">
            <div class="ltv3-map-row-head">
              <span class="ltv3-map-row-index">${row}</span>
              <div>
                <strong>${esc(extractThemeName(rowMeta.title))}</strong>
                <p>${esc(rowMeta.insight)}</p>
              </div>
            </div>
            <div class="ltv3-map-row-cells">
              ${rowMeta.categories.map((cat) => `
                <span class="ltv3-map-chip" style="--ltv3-cat:${esc(cat.color)};">
                  <strong>${esc(cat.labelHe)}</strong>
                  <small>${esc(cat.category)}</small>
                </span>
              `).join('')}
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

function advanceStep(stepKey) {
  state.step = stepKey;
  render();
}

function selectRow(row) {
  if (!state.current || state.step !== 'identify') return;
  const parsed = parseRow(row);
  state.selectedRow = parsed;
  if (parsed === state.current.targetRow) {
    state.identifySolved = true;
    state.wrongRow = 0;
    addScore(10);
    awardXP(10);
    if (state.identifyAttempts === 0) {
      addScore(5);
      awardXP(5);
    }
    showToast('נכון!', 'info');
  } else {
    state.identifyAttempts += 1;
    state.wrongRow = parsed;
    showToast('עדיין לא. חפש/י את המשפחה הנכונה.', 'danger');
  }
  render();
}

function prepareQuestions() {
  if (!state.current || !state.identifySolved) return;
  state.asked = {};
  state.current.triple.forEach((item) => {
    state.asked[item.slot] = false;
  });
  advanceStep('questions');
}

function allQuestionsAsked() {
  return state.current?.triple?.every((item) => state.asked[item.slot]) || false;
}

function askQuestion(slotKey) {
  if (!state.current || state.step !== 'questions') return;
  const item = state.current.triple.find((entry) => entry.slot === slotKey);
  if (!item || state.asked[item.slot]) return;
  state.asked[item.slot] = true;
  state.questionChat.push(
    { from: 'therapist', text: item.question, category: item.labelHe, color: item.color },
    { from: 'client', text: item.response, category: item.labelHe }
  );
  addScore(10);
  awardXP(5);
  if (allQuestionsAsked()) {
    addScore(20);
    awardXP(20);
    awardStars(1);
    showToast('3/3 הושלמו', 'info');
  }
  render();
  queueChatScroll('#ltv3-questions-chat');
}

function beginLanding() {
  if (!allQuestionsAsked()) return;
  state.landingCursor = 0;
  state.landingVisible = [];
  state.debriefOpen = false;
  advanceStep('landing');
}

function revealNextLandingLine() {
  if (!state.current || state.step !== 'landing') return;
  const next = state.current.landing[state.landingCursor];
  if (!next) return;
  state.landingVisible.push(next);
  state.landingCursor += 1;
  render();
  queueChatScroll('#ltv3-landing-chat');
}

function openDebrief() {
  if (!state.current || state.step !== 'landing') return;
  state.debriefOpen = true;
  render();
}

function retryScene() {
  if (!state.current) return;
  resetRoundState();
  render();
}

function nextScenario() {
  state.progress.played += 1;
  state.progress.totalScore += Number(state.roundScore || 0);
  state.progress.bestRound = Math.max(Number(state.progress.bestRound || 0), Number(state.roundScore || 0));
  state.progress.lastPlayedAt = new Date().toISOString();
  saveProgress();

  state.index += 1;
  if (state.index >= state.queue.length) {
    state.queue = shuffle([...(state.data?.scenarios || [])]);
    state.index = 0;
  }
  loadCurrentScenario();
  render();
}

function buildProgressMarkup() {
  const activeIndex = currentStepIndex();
  return `
    <div class="ltv3-progress-shell">
      ${STEP_META.map((step, index) => `
        <div class="ltv3-progress-item ${index <= activeIndex ? 'is-reached' : ''}${index === activeIndex ? ' is-current' : ''}">
          <span class="ltv3-progress-dot" aria-hidden="true"></span>
          <span>${esc(step.label)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function buildChatMarkup(items, { allowHighlight = false } = {}) {
  return items.map((item) => {
    const from = normKey(item.from);
    if (from === 'label' || from === 't_label') {
      return `<div class="ltv3-section-label">${esc(item.text)}</div>`;
    }
    if (from === 'narrator' || from === 'system') {
      return `<div class="ltv3-bubble ltv3-bubble--narrator">${esc(item.text)}</div>`;
    }
    const isTherapist = from === 'therapist';
    const bubbleClass = isTherapist ? 'ltv3-bubble--therapist' : 'ltv3-bubble--client';
    const highlightClass = allowHighlight && item.highlight ? ' is-target' : '';
    const label = speakerLabel(item.from);
    return `
      <article class="ltv3-bubble ${bubbleClass}${highlightClass}">
        ${label ? `<span class="ltv3-bubble-sender">${esc(label)}</span>` : ''}
        <p class="ltv3-bubble-text">${esc(item.text)}</p>
        ${allowHighlight && item.highlight ? `<span class="ltv3-target-tag">${esc(item.label || '← המשפט לעבודה')}</span>` : ''}
      </article>
    `;
  }).join('');
}

function buildOnboardingMarkup() {
  return `
    <section class="ltv3-onboarding-card">
      <p class="ltv3-kicker">שלשות חיות</p>
      <h2>הקשר → זיהוי → 3 שאלות → שיקוף</h2>
      <p class="ltv3-lead">המשפט לא נפתח דרך הסבר תיאורטי, אלא דרך שיחת WhatsApp טיפולית: קודם רואים הקשר, אחר כך בוחרים שורה, ואז שואלים את כל שלוש השאלות עד שנוצרת נחיתה.</p>
      <ol class="ltv3-onboarding-list">
        <li>קוראים את ההקשר ורואים איזה משפט מסומן לעבודה.</li>
        <li>מזהים את השורה הנכונה מתוך 5 משפחות קומפקטיות.</li>
        <li>שואלים את כל 3 השאלות של אותה שורה בתוך שיחת WhatsApp.</li>
        <li>חושפים שיקוף, ריפריימינג ושאלת המשך, ואז רואים מה קרה כאן.</li>
      </ol>
      <div class="ltv3-inline-actions">
        <button type="button" class="btn btn-primary" data-action="start-practice">התחל תרגול</button>
        <button type="button" class="btn btn-secondary" data-action="open-map">מפת השלשות</button>
        <button type="button" class="btn btn-secondary" data-action="reset-profile">שנה פרופיל</button>
      </div>
      <p class="ltv3-mini-stats">הושלמו עד עכשיו: <strong>${Number(state.progress?.played || 0)}</strong> · שיא נקודות: <strong>${Number(state.progress?.bestRound || 0)}</strong></p>
    </section>
  `;
}

function buildContextStage() {
  return `
    <section class="ltv3-stage-card">
      <div class="ltv3-stage-head">
        <p class="ltv3-kicker">שלב 1</p>
        <h3>הקשר</h3>
        <p>המשפט לעבודה כבר מסומן בתוך השיחה. קודם קוראים את הרגע, ורק אחר כך מזהים את השורה.</p>
      </div>
      <div class="ltv3-chat chat-bg">
        ${buildChatMarkup(state.current.context, { allowHighlight: true })}
      </div>
      <div class="ltv3-inline-actions">
        <button type="button" class="btn btn-primary" data-action="go-identify">זיהוי ההפרה ←</button>
      </div>
    </section>
  `;
}

function buildIdentifyStage() {
  const rows = Object.keys(state.data?.triplesMap?.rows || {}).map(Number).sort((a, b) => a - b);
  const feedbackTone = state.identifySolved ? 'success' : state.wrongRow ? 'danger' : 'info';
  const feedbackText = state.identifySolved
    ? 'נכון! זו המשפחה הפעילה במשפט. עכשיו פותחים את שלוש השאלות.'
    : state.wrongRow
      ? state.current.wrongHint
      : 'בחר/י את המשפחה המתאימה למשפט המסומן.';
  return `
    <section class="ltv3-stage-card">
      <div class="ltv3-stage-head">
        <p class="ltv3-kicker">שלב 2</p>
        <h3>זיהוי</h3>
        <p>כאן בוחרים שורה אחת בלבד. אם טעית, מקבלים רמז ומנסים שוב.</p>
      </div>
      <section class="ltv3-target-card">
        <span class="ltv3-target-kicker">המשפט לעבודה</span>
        <p>${esc(state.current.target)}</p>
      </section>
      <div class="ltv3-row-list">
        ${rows.map((row) => {
          const meta = getRowMeta(row);
          const isCorrect = state.identifySolved && row === state.current.targetRow;
          const isWrong = !state.identifySolved && row === state.wrongRow;
          const joined = meta.categories.map((cat) => cat.labelHe).join(' · ');
          return `
            <button
              type="button"
              class="ltv3-row-button${isCorrect ? ' is-correct' : ''}${isWrong ? ' is-wrong' : ''}"
              data-action="pick-row"
              data-row="${row}"
            >
              <span class="ltv3-row-number">${row}</span>
              <span class="ltv3-row-copy">
                <strong>${esc(extractThemeName(meta.title))}</strong>
                <small>${esc(joined)}</small>
              </span>
            </button>
          `;
        }).join('')}
      </div>
      <p class="ltv3-feedback is-${feedbackTone}">${esc(feedbackText)}</p>
      ${state.identifySolved ? `
        <div class="ltv3-inline-actions">
          <button type="button" class="btn btn-primary" data-action="go-questions">לשלוש השאלות ←</button>
        </div>
      ` : ''}
    </section>
  `;
}

function buildTripleGrid() {
  return `
    <div class="ltv3-triple-grid">
      ${state.current.triple.map((item) => {
        const done = !!state.asked[item.slot];
        return `
          <div class="ltv3-triple-cell ${done ? 'is-done' : 'is-pending'}" style="--ltv3-slot:${esc(item.color)};">
            <strong>${esc(item.labelHe)}</strong>
            <span>${done ? '✓ נשאלה' : 'ממתינה'}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function buildQuestionStage() {
  const askedCount = state.current.triple.filter((item) => state.asked[item.slot]).length;
  return `
    <section class="ltv3-stage-card">
      <div class="ltv3-stage-head">
        <p class="ltv3-kicker">שלב 3</p>
        <h3>3 שאלות</h3>
        <p>צריך לשאול את כל שלוש השאלות של אותה שורה. כל לחיצה מוסיפה שאלה ירוקה ותשובת מטופל לבנה.</p>
      </div>
      <section class="ltv3-target-card is-compact">
        <span class="ltv3-target-kicker">המשפט לעבודה</span>
        <p>${esc(state.current.target)}</p>
      </section>
      ${buildTripleGrid()}
      <div id="ltv3-questions-chat" class="ltv3-chat chat-bg">
        ${state.questionChat.length ? buildChatMarkup(state.questionChat) : '<div class="ltv3-empty-chat">הצ\'אט עוד ריק. בחר/י את השאלה הראשונה.</div>'}
      </div>
      <div class="ltv3-question-list">
        ${state.current.triple.map((item) => {
          const done = !!state.asked[item.slot];
          return `
            <button
              type="button"
              class="ltv3-question-btn${done ? ' is-done' : ''}"
              style="--ltv3-slot:${esc(item.color)};"
              data-action="ask-question"
              data-slot="${esc(item.slot)}"
              ${done ? 'disabled' : ''}
            >
              <span class="ltv3-question-cat">${esc(item.labelHe)}</span>
              <strong>${esc(item.question)}</strong>
              <small>${done ? 'נשאלה' : 'לחץ/י כדי לשאול'}</small>
            </button>
          `;
        }).join('')}
      </div>
      <p class="ltv3-feedback">${askedCount}/3 שאלות נשאלו</p>
      ${allQuestionsAsked() ? `
        <div class="ltv3-inline-actions">
          <button type="button" class="btn btn-primary" data-action="go-landing">שיקוף + סיום ←</button>
        </div>
      ` : ''}
    </section>
  `;
}

function buildLandingStage() {
  const allLandingShown = state.landingCursor >= state.current.landing.length;
  const allChat = [...state.questionChat, ...state.landingVisible];
  return `
    <section class="ltv3-stage-card">
      <div class="ltv3-stage-head">
        <p class="ltv3-kicker">שלב 4</p>
        <h3>שיקוף + נחיתה</h3>
        <p>כאן לא כותבים. חושפים את השיחה הודעה אחרי הודעה, ואז רואים מה קרה כאן.</p>
      </div>
      <section class="ltv3-target-card is-compact">
        <span class="ltv3-target-kicker">המשפט שנפתח</span>
        <p>${esc(state.current.target)}</p>
      </section>
      <div id="ltv3-landing-chat" class="ltv3-chat chat-bg">
        ${buildChatMarkup(allChat)}
      </div>
      <div class="ltv3-inline-actions">
        ${!allLandingShown ? '<button type="button" class="btn btn-primary" data-action="next-landing-line">הודעה הבאה</button>' : ''}
        ${allLandingShown && !state.debriefOpen ? '<button type="button" class="btn btn-primary" data-action="open-debrief">מה קרה כאן? ←</button>' : ''}
      </div>
      ${state.debriefOpen ? `
        <section class="ltv3-debrief">
          <h4>מה קרה כאן?</h4>
          <div class="ltv3-debrief-items">
            ${state.current.debrief.map((item) => `
              <article class="ltv3-debrief-item">
                <span class="ltv3-debrief-icon">${esc(item.icon)}</span>
                <div>
                  ${item.bold ? `<strong>${esc(item.bold)}</strong>` : ''}
                  <p>${esc(item.text)}</p>
                </div>
              </article>
            `).join('')}
          </div>
          <div class="ltv3-inline-actions">
            <button type="button" class="btn btn-secondary" data-action="retry-scene">נסה שוב</button>
            <button type="button" class="btn btn-primary" data-action="next-scene">משפט הבא ←</button>
          </div>
        </section>
      ` : ''}
    </section>
  `;
}

function buildPracticeMarkup() {
  const completed = Number(state.progress?.played || 0);
  return `
    <section class="ltv3-practice-shell">
      <div class="ltv3-topbar">
        <div class="ltv3-pill-row">
          <span class="ltv3-pill">תרחיש <strong>${state.index + 1}</strong>/<strong>${state.queue.length || state.data.scenarios.length}</strong></span>
          <span class="ltv3-pill">נקודות <strong>${state.roundScore}</strong></span>
          <span class="ltv3-pill">הושלמו <strong>${completed}</strong></span>
        </div>
        <div class="ltv3-pill-row">
          <button type="button" class="btn btn-secondary" data-action="open-map">מפת השלשות</button>
          <button type="button" class="btn btn-secondary" data-action="retry-scene">נסה שוב</button>
          <button type="button" class="btn btn-secondary" data-action="reset-profile">שנה פרופיל</button>
        </div>
      </div>
      ${buildProgressMarkup()}
      ${state.step === 'context' ? buildContextStage() : ''}
      ${state.step === 'identify' ? buildIdentifyStage() : ''}
      ${state.step === 'questions' ? buildQuestionStage() : ''}
      ${state.step === 'landing' ? buildLandingStage() : ''}
    </section>
  `;
}

function buildShellMarkup() {
  return `
    <div class="ltv3-shell">
      ${state.screen === 'onboarding' ? buildOnboardingMarkup() : buildPracticeMarkup()}
    </div>
  `;
}

function render() {
  if (!state.els.root) return;
  state.els.root.innerHTML = buildShellMarkup();
}

function queueChatScroll(selector) {
  window.requestAnimationFrame(() => {
    const node = document.querySelector(selector);
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  });
}

function handleRootClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.getAttribute('data-action') || '';
  if (action === 'start-practice') return void beginPractice();
  if (action === 'open-map') return void openMap();
  if (action === 'reset-profile') return void resetProfile();
  if (action === 'go-identify') return void advanceStep('identify');
  if (action === 'pick-row') return void selectRow(button.getAttribute('data-row'));
  if (action === 'go-questions') return void prepareQuestions();
  if (action === 'ask-question') return void askQuestion(button.getAttribute('data-slot') || '');
  if (action === 'go-landing') return void beginLanding();
  if (action === 'next-landing-line') return void revealNextLandingLine();
  if (action === 'open-debrief') return void openDebrief();
  if (action === 'retry-scene') return void retryScene();
  if (action === 'next-scene') return void nextScenario();
}

function bindEvents() {
  state.els.root.addEventListener('click', handleRootClick);
  state.els.mapModal?.addEventListener('click', (event) => {
    if (event.target === state.els.mapModal) closeMap();
  });
  state.els.closeMapBtn?.addEventListener('click', closeMap);
  state.els.openMapTopBtn?.addEventListener('click', openMap);
  state.els.resetProfileTopBtn?.addEventListener('click', resetProfile);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMap();
  });
}

function collectElements() {
  return {
    root: document.getElementById('ltv2-root'),
    mapModal: document.getElementById('ltv2-map-modal'),
    mapContent: document.getElementById('ltv2-map-content'),
    closeMapBtn: document.getElementById('ltv2-close-map-btn'),
    openMapTopBtn: document.getElementById('ltv2-open-map-top'),
    resetProfileTopBtn: document.getElementById('ltv2-reset-profile-top'),
    toast: document.getElementById('ltv2-toast')
  };
}

async function setupLivingTriplesModule() {
  state.els = collectElements();
  if (!state.els.root) return;

  state.progress = loadProgress();
  state.prefs = loadPrefs();
  state.data = await loadData();

  if (!Array.isArray(state.data?.scenarios) || !state.data.scenarios.length) {
    state.data = normalizeData({ triplesMap: DEFAULT_TRIPLES_MAP, scenarios: FALLBACK_SCENARIOS });
  }

  loadCurrentScenario();
  state.screen = state.prefs.onboardingDone ? 'practice' : 'onboarding';
  renderMap();
  bindEvents();
  render();
}

window.setupLivingTriplesModule = setupLivingTriplesModule;
