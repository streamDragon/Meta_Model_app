import { CANONICAL_BREEN_GRID_RTL, CANONICAL_BREEN_ORDER, type CanonicalBreenCode } from '../../config/canonicalBreenOrder';

export type BreenCellFamily = 'distortion' | 'generalization' | 'deletion' | 'extra';
export type BreenLabMode = 'build' | 'complete' | 'quick';
export type BreenLabSessionMode = 'learning' | 'test';
export type BreenLabPromptType = 'name' | 'example' | 'mixed';
export type BreenLabDifficulty = 1 | 2 | 3;

export interface BreenTableCell {
  id: CanonicalBreenCode;
  heTitle: string;
  enTitle: string;
  shortCode: string;
  family: BreenCellFamily;
  familyHe: string;
  row: number;
  col: number;
  positionIndex: number;
  rowLabelHe: string;
  helperLine: string;
  exampleLines: string[];
  aliases: string[];
}

export interface BreenLabModeCard {
  id: BreenLabMode;
  heTitle: string;
  subtitle: string;
  body: string;
}

const ROW_LABELS = [
  'פירוש, שקילות וסיבתיות',
  'הנחות ושמות פעולה',
  'חוקים, הכרח ואפשרות',
  'חורים במידע ובהשוואה',
  'מיקום, הקשר וחישה'
] as const;

const FAMILY_META: Record<BreenCellFamily, { he: string; tone: string }> = {
  distortion: { he: 'עיוות', tone: 'distortion' },
  generalization: { he: 'הכללה', tone: 'generalization' },
  deletion: { he: 'מחיקה', tone: 'deletion' },
  extra: { he: 'עוד קטגוריות', tone: 'extra' }
};

const CELL_META: Record<CanonicalBreenCode, Omit<BreenTableCell, 'id' | 'row' | 'col' | 'positionIndex' | 'rowLabelHe'>> = {
  MR: {
    heTitle: 'קריאת מחשבה',
    enTitle: 'Mind Reading',
    shortCode: 'MR',
    family: 'distortion',
    familyHe: FAMILY_META.distortion.he,
    helperLine: 'חפש/י משפט שבו מישהו מוצג כאילו כבר ידוע מה הוא חושב או מרגיש.',
    exampleLines: [
      'הוא לא ענה לי, אז ברור שהוא כועס.',
      'היא בטח חושבת שאני לא מספיק טובה.',
      'הם כבר החליטו שאין לי מה לתרום.'
    ],
    aliases: ['מיינד רידינג', 'יודע מה הוא חושב', 'יודע מה היא מרגישה']
  },
  CEq: {
    heTitle: 'שקילות מורכבת',
    enTitle: 'Complex Equivalence',
    shortCode: 'CEq',
    family: 'distortion',
    familyHe: FAMILY_META.distortion.he,
    helperLine: 'חפש/י מקום שבו אירוע אחד מתורגם למשמעות כוללת אחרת.',
    exampleLines: [
      'אם היא שקטה, זה אומר שלא אכפת לה.',
      'הוא איחר לפגישה, וזה מוכיח שאני לא חשוב.',
      'אם קשה לי לדבר, זה סימן שאני חלש.'
    ],
    aliases: ['שקילות', 'זה אומר ש', 'זה מוכיח ש']
  },
  CE: {
    heTitle: 'סיבתיות',
    enTitle: 'Cause and Effect',
    shortCode: 'CE',
    family: 'distortion',
    familyHe: FAMILY_META.distortion.he,
    helperLine: 'חפש/י משפט שבו דבר אחד מוצג כאילו הוא גורם ישיר לאחר.',
    exampleLines: [
      'המצב בבית הורס אותי.',
      'הטון שלו מכניס אותי ללחץ.',
      'כל ההערות האלה גורמות לי להיסגר.'
    ],
    aliases: ['סיבה תוצאה', 'גורם', 'הורס אותי']
  },
  PRE: {
    heTitle: 'הנחת מוקדמת',
    enTitle: 'Presupposition',
    shortCode: 'PRE',
    family: 'distortion',
    familyHe: FAMILY_META.distortion.he,
    helperLine: 'חפש/י שאלה או קביעה שכבר מניחה משהו כאילו הוא אמת.',
    exampleLines: [
      'מתי כבר תפסיק לאכזב?',
      'למה שוב בחרת להתרחק?',
      'איך נחזור להיות נורמליים?'
    ],
    aliases: ['פרסופוזיציה', 'כבר מניח', 'מתי כבר']
  },
  NOM: {
    heTitle: 'נומינליזציה',
    enTitle: 'Nominalization',
    shortCode: 'NOM',
    family: 'distortion',
    familyHe: FAMILY_META.distortion.he,
    helperLine: 'חפש/י תהליך חי שהפך לשם עצם קפוא.',
    exampleLines: [
      'הקשר בינינו קפוא.',
      'יש פה דחייה חזקה באוויר.',
      'כל הבית מלא מתח.'
    ],
    aliases: ['שם פעולה', 'קיפאון', 'מתח', 'דחייה']
  },
  LP: {
    heTitle: 'אבדן מצביע',
    enTitle: 'Lost Performative',
    shortCode: 'LP',
    family: 'generalization',
    familyHe: FAMILY_META.generalization.he,
    helperLine: 'חפש/י שיפוט או קביעה בלי מי קובע ועל סמך מה.',
    exampleLines: [
      'זה פשוט לא ראוי.',
      'זה לא מקצועי.',
      'לא נכון לדבר ככה.'
    ],
    aliases: ['לפי מי', 'שיפוט חסר מקור', 'אבודן מצביע']
  },
  UQ: {
    heTitle: 'כמת אוניברסלי',
    enTitle: 'Universal Quantifier',
    shortCode: 'UQ',
    family: 'generalization',
    familyHe: FAMILY_META.generalization.he,
    helperLine: 'חפש/י תמיד, אף פעם, כולם, שום דבר, או ממילא.',
    exampleLines: [
      'אף אחד אף פעם לא באמת נשאר.',
      'כולם תמיד מסתכלים עליי.',
      'ממילא זה אף פעם לא עובד.'
    ],
    aliases: ['תמיד', 'אף פעם', 'כולם', 'ממילא']
  },
  MN: {
    heTitle: 'מודאל הכרח',
    enTitle: 'Modal Necessity',
    shortCode: 'MN',
    family: 'generalization',
    familyHe: FAMILY_META.generalization.he,
    helperLine: 'חפש/י חייב, צריך, מוכרח, אין ברירה.',
    exampleLines: [
      'אני חייב לדעת מראש.',
      'צריך לשתוק פה.',
      'אין לי ברירה אלא להסכים.'
    ],
    aliases: ['חייב', 'צריך', 'אין ברירה', 'מוכרח']
  },
  MP: {
    heTitle: 'מודאל אפשרות',
    enTitle: 'Modal Possibility',
    shortCode: 'MP',
    family: 'generalization',
    familyHe: FAMILY_META.generalization.he,
    helperLine: 'חפש/י לא יכול, אי אפשר, אפשר או לא מצליח.',
    exampleLines: [
      'אני לא יכול לדבר על זה.',
      'אי אפשר להשתנות באמת.',
      'אני לא מצליח כרגע להיפתח.'
    ],
    aliases: ['לא יכול', 'אי אפשר', 'אפשר', 'לא מצליח']
  },
  UV: {
    heTitle: 'פועל לא מפורט',
    enTitle: 'Unspecified Verb',
    shortCode: 'UV',
    family: 'deletion',
    familyHe: FAMILY_META.deletion.he,
    helperLine: 'חפש/י פועל עמום שמבקש "איך בדיוק?".',
    exampleLines: [
      'הכול פשוט נסגר.',
      'הוא מתנהג אליי לא טוב.',
      'אני לא מצליח להסביר את זה.'
    ],
    aliases: ['איך בדיוק', 'פועל חסר', 'לא מצליח', 'מתנהג']
  },
  UN: {
    heTitle: 'ייחוס חסר',
    enTitle: 'Unspecified Noun',
    shortCode: 'UN',
    family: 'deletion',
    familyHe: FAMILY_META.deletion.he,
    helperLine: 'חפש/י הם, מישהו, אנשים, או גורם לא מזוהה.',
    exampleLines: [
      'הם תמיד לוחצים עליי.',
      'מישהו כבר ידאג לזה.',
      'אנשים לא באמת מבינים אותי.'
    ],
    aliases: ['מי בדיוק', 'הם', 'מישהו', 'אנשים']
  },
  COMP: {
    heTitle: 'השוואה חסרה',
    enTitle: 'Comparison',
    shortCode: 'COMP',
    family: 'deletion',
    familyHe: FAMILY_META.deletion.he,
    helperLine: 'חפש/י יותר, פחות, טוב יותר, בלי ביחס למה.',
    exampleLines: [
      'אני יותר חלש מכולם.',
      'היום היה קר יותר.',
      'אני רוצה להיות נורמלי יותר.'
    ],
    aliases: ['יותר', 'פחות', 'יחס למה']
  },
  DEL: {
    heTitle: 'מחיקה',
    enTitle: 'Deletion',
    shortCode: 'DEL',
    family: 'deletion',
    familyHe: FAMILY_META.deletion.he,
    helperLine: 'חפש/י קביעה שחסר בה מידע בסיסי כדי להבין מה באמת קורה.',
    exampleLines: [
      'זה פשוט לא עובד.',
      'זה מסוכן.',
      'זה לא טוב.'
    ],
    aliases: ['חסר מידע', 'מה בדיוק', 'זה לא עובד']
  },
  CTX: {
    heTitle: 'הקשר',
    enTitle: 'Context',
    shortCode: 'CTX',
    family: 'extra',
    familyHe: FAMILY_META.extra.he,
    helperLine: 'חפש/י זמן, מקום או מצב שממקמים את המשפט בתוך סצנה.',
    exampleLines: [
      'אתמול במסדרון לפני הישיבה הכול התכווץ.',
      'בבית בשעות הערב זה קורה יותר.',
      'דווקא ליד אנשים זה מתחיל.'
    ],
    aliases: ['זמן', 'מקום', 'מצב', 'הקשר']
  },
  VAK: {
    heTitle: 'חושי',
    enTitle: 'Sensory Channel',
    shortCode: 'VAK',
    family: 'extra',
    familyHe: FAMILY_META.extra.he,
    helperLine: 'חפש/י מה נראה, נשמע או מורגש בגוף ובחושים.',
    exampleLines: [
      'אני שומע את הטון הזה ישר בגוף.',
      'ראיתי את המבט שלו ונסגרתי.',
      'יש לי תחושה פיזית של כיווץ בחזה.'
    ],
    aliases: ['ראייה', 'שמיעה', 'תחושה', 'חושי', 'VAK']
  }
};

const POSITION_LOOKUP = new Map<CanonicalBreenCode, { row: number; col: number }>();
CANONICAL_BREEN_GRID_RTL.forEach((row, rowIndex) => {
  row.forEach((code, colIndex) => {
    POSITION_LOOKUP.set(code, { row: rowIndex + 1, col: colIndex + 1 });
  });
});

export const BREEN_TABLE_CELLS: BreenTableCell[] = CANONICAL_BREEN_ORDER.map((code, index) => {
  const position = POSITION_LOOKUP.get(code);
  if (!position) throw new Error(`Missing Breen position for ${code}`);
  return {
    id: code,
    ...CELL_META[code],
    row: position.row,
    col: position.col,
    positionIndex: index,
    rowLabelHe: ROW_LABELS[position.row - 1]
  };
});

export const BREEN_TABLE_CELL_MAP: Record<CanonicalBreenCode, BreenTableCell> = BREEN_TABLE_CELLS.reduce((acc, cell) => {
  acc[cell.id] = cell;
  return acc;
}, {} as Record<CanonicalBreenCode, BreenTableCell>);

export const BREEN_TABLE_MODE_CARDS: BreenLabModeCard[] = [
  {
    id: 'build',
    heTitle: 'בנייה',
    subtitle: 'בוחרים תבנית, ואז מניחים אותה במקום שלה על המפה.',
    body: 'זה המצב שבונה תחושת כיוון: מה יושב איפה, ואילו אזורים כבר הופכים מוכרים.'
  },
  {
    id: 'complete',
    heTitle: 'השלמה',
    subtitle: 'משלימים חורים מתוך אפשרויות קצרות ומחדדים דיוק.',
    body: 'הטבלה כמעט מלאה, והעבודה היא לראות מה חסר ולסגור את הפער בלי ללכת לאיבוד.'
  },
  {
    id: 'quick',
    heTitle: 'איתור מהיר',
    subtitle: 'רואים שם או דוגמה, ומגיבים למקום הנכון בזמן אמת.',
    body: 'זה המצב שמלמד שליפה תחת לחץ עדין, עם ניקוד, רצף ותגובה מיידית.'
  }
];

export function getBreenTableCell(code: CanonicalBreenCode): BreenTableCell {
  return BREEN_TABLE_CELL_MAP[code];
}

export function familyCodes(family: BreenCellFamily): CanonicalBreenCode[] {
  return BREEN_TABLE_CELLS.filter((cell) => cell.family === family).map((cell) => cell.id);
}

export function formatModeLabel(mode: BreenLabMode): string {
  return BREEN_TABLE_MODE_CARDS.find((card) => card.id === mode)?.heTitle || mode;
}

export function formatSessionModeLabel(mode: BreenLabSessionMode): string {
  return mode === 'test' ? 'מבחן' : 'לימוד';
}

export function formatPromptTypeLabel(type: BreenLabPromptType): string {
  if (type === 'name') return 'שם תבנית';
  if (type === 'example') return 'דוגמת משפט';
  return 'מעורב';
}
