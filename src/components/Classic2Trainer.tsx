import React, { useEffect, useRef, useState } from 'react';

export type CategoryId =
  | 'cause_effect'
  | 'complex_equivalence'
  | 'mind_reading'
  | 'lost_performative'
  | 'universal_quantifier'
  | 'modal_necessity'
  | 'nominalization'
  | 'unspecified_verb'
  | 'time_space_context'
  | 'sensory_vak';

export type StoryTypeId = 'work' | 'relationship' | 'family' | 'study';
export type StoryFilterId = StoryTypeId | 'all';

export type Step = 'chooseCategory' | 'selectTile' | 'chooseQuestion' | 'dialogue' | 'nextStep';

export interface StoryTile {
  id: string;
  text: string;
  tags: CategoryId[];
  line: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  isGood: boolean;
  feedbackIfBad?: string;
  generatesClientAnswer: string;
}

export interface Scenario {
  id: string;
  title: string;
  storyType: StoryTypeId;
  storyTypeLabel: string;
  storyTiles: StoryTile[];
  categoriesAvailable: CategoryId[];
  questionsByCategory: Record<CategoryId, QuestionOption[]>;
}

type Feedback = { tone: 'info' | 'success' | 'error'; message: string };

type DialogueTurn = {
  id: string;
  categoryId: CategoryId;
  tileId: string;
  therapist: string;
  client: string;
  mapUpdate: string;
  loopIndex: number;
};

type Machine = {
  step: Step;
  selectedCategory: CategoryId | null;
  selectedTileId: string | null;
  selectedQuestionId: string | null;
  tileAttempts: number;
  questionAttempts: number;
  lastFeedback: Feedback | null;
  dialogueTurns: DialogueTurn[];
  questionDeck: QuestionOption[];
  loopIndex: number;
  nextActionMessage: string;
  activeDirection: 'same' | 'neighbor' | 'counter' | null;
  usedGoodQuestionIds: string[];
};

type CategoryMeta = {
  id: CategoryId;
  label: string;
  family: 'Deletion' | 'Distortion' | 'Generalization' | 'Extension';
  breenCell: string;
  tileHint: string;
  mapUpdateLine: string;
  nextLikely: CategoryId[];
};

const PHILOSOPHY_COPY = 'זה לא טיפול מלא. זה מנוע לצעד הבא: מזהים קטגוריה אחת, שואלים שאלה מדויקת, מעדכנים את מבנה השטח לכיוון מבנה העומק, ובוחרים צעד המשך.';
const BAD_QUESTION_DEFAULT = 'שאלה טובה, אבל לא מקדמת את המידע שחיפשנו.';

const STORY_TYPE_LABELS: Record<StoryFilterId, string> = {
  all: 'כל הסיפורים',
  work: 'עבודה',
  relationship: 'זוגיות',
  family: 'משפחה',
  study: 'לימודים'
};

const FAMILY_LABELS_HE: Record<CategoryMeta['family'], string> = {
  Deletion: 'מחיקה',
  Distortion: 'עיוות',
  Generalization: 'הכללה',
  Extension: 'הרחבה'
};

const STEP_LABELS_HE: Record<Step, string> = {
  chooseCategory: 'בחירת קטגוריה',
  selectTile: 'בחירת קטע',
  chooseQuestion: 'בחירת שאלה',
  dialogue: 'דיאלוג',
  nextStep: 'צעד הבא'
};

const CATEGORIES: CategoryMeta[] = [
  { id: 'cause_effect', label: 'CE / סיבה–תוצאה', family: 'Distortion', breenCell: 'DIS', tileHint: "חפש/י קשר סיבתי או 'כי/אז/ממילא'.", mapUpdateLine: 'המפה עודכנה: מעבר מגורל למנגנון.', nextLikely: ['complex_equivalence', 'universal_quantifier'] },
  { id: 'complex_equivalence', label: 'CEq / שקילות מורכבת', family: 'Distortion', breenCell: 'DIS', tileHint: "חפש/י 'X אומר Y'.", mapUpdateLine: 'המפה עודכנה: מעבר ממשמעות קשיחה לאלטרנטיבות.', nextLikely: ['mind_reading', 'cause_effect'] },
  { id: 'mind_reading', label: 'MR / קריאת מחשבות', family: 'Distortion', breenCell: 'DIS', tileHint: 'חפש/י הנחה על מה האחר חושב/מרגיש בלי ראיות.', mapUpdateLine: 'המפה עודכנה: מעבר מהנחת כוונה לראיות.', nextLikely: ['complex_equivalence', 'cause_effect'] },
  { id: 'lost_performative', label: 'LP / אובדן מבצע הערכה', family: 'Generalization', breenCell: 'GEN', tileHint: "חפש/י 'לא מקצועי/לא בסדר' בלי 'לפי מי'.", mapUpdateLine: 'המפה עודכנה: מעבר משיפוט סמוי לקריטריונים.', nextLikely: ['modal_necessity', 'universal_quantifier'] },
  { id: 'universal_quantifier', label: 'UQ / כמת אוניברסלי', family: 'Generalization', breenCell: 'GEN', tileHint: "חפש/י 'תמיד/אף פעם/ממילא/כולם'.", mapUpdateLine: 'המפה עודכנה: מעבר מהכללה לתנאים.', nextLikely: ['cause_effect', 'modal_necessity'] },
  { id: 'modal_necessity', label: 'MN / חייב-צריך', family: 'Generalization', breenCell: 'GEN', tileHint: "חפש/י 'חייב/צריך/מוכרח'.", mapUpdateLine: 'המפה עודכנה: מעבר מכלל קשיח לבחירה.', nextLikely: ['lost_performative', 'universal_quantifier'] },
  { id: 'nominalization', label: 'NOM / נומינליזציה', family: 'Distortion', breenCell: 'DIS', tileHint: 'חפש/י שם פעולה קפוא (למשל פאדיחות/כישלון).', mapUpdateLine: 'המפה עודכנה: מעבר מתווית קפואה לתהליך.', nextLikely: ['unspecified_verb', 'cause_effect'] },
  { id: 'unspecified_verb', label: 'UV / פועל לא מפורט', family: 'Deletion', breenCell: 'DEL', tileHint: "חפש/י פועל בלי 'איך בדיוק'.", mapUpdateLine: 'המפה עודכנה: מעבר מפועל עמום לצעדים.', nextLikely: ['nominalization', 'modal_necessity'] },
  { id: 'time_space_context', label: 'CTX / זמן-מרחב-הקשר', family: 'Extension', breenCell: 'CTX', tileHint: "חפש/י מתי/איפה/באיזה הקשר (למשל 'אתמול', 'בישיבה').", mapUpdateLine: 'המפה עודכנה: נוסף הקשר זמן-מקום.', nextLikely: ['cause_effect', 'sensory_vak'] },
  { id: 'sensory_vak', label: 'VAK / פרדיקטים חושיים', family: 'Extension', breenCell: 'VAK', tileHint: 'חפש/י מילים של ראייה/שמיעה/תחושה/הרגשה.', mapUpdateLine: 'המפה עודכנה: נוספו נתונים חושיים.', nextLikely: ['time_space_context', 'unspecified_verb'] }
];

const CAT: Record<CategoryId, CategoryMeta> = CATEGORIES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {} as Record<CategoryId, CategoryMeta>);

const g = (id: string, text: string, a: string): QuestionOption => ({ id, text, isGood: true, generatesClientAnswer: a });
const b = (id: string, text: string, why: string): QuestionOption => ({ id, text, isGood: false, feedbackIfBad: why, generatesClientAnswer: '' });

const SCENARIO: Scenario = {
  id: 'work-meeting-loop',
  storyType: 'work',
  storyTypeLabel: 'עבודה',
  title: 'Classic 2 · סיפור הקשר רחב (עבודה/ישיבה)',
  storyTiles: [
    { id: 't1', text: 'אתמול', tags: ['time_space_context'], line: 1 },
    { id: 't2', text: 'בעבודה', tags: ['time_space_context'], line: 1 },
    { id: 't3', text: 'המנהל עבר לידי', tags: ['time_space_context', 'sensory_vak'], line: 1 },
    { id: 't4', text: 'בלי להגיד שלום.', tags: ['mind_reading', 'sensory_vak'], line: 1 },
    { id: 't5', text: 'באותו רגע', tags: ['time_space_context'], line: 2 },
    { id: 't6', text: 'הרגשתי שאני שקוף.', tags: ['complex_equivalence', 'sensory_vak'], line: 2 },
    { id: 't7', text: 'אם הוא לא אומר שלום', tags: ['complex_equivalence', 'mind_reading'], line: 3 },
    { id: 't8', text: 'זה אומר', tags: ['complex_equivalence'], line: 3 },
    { id: 't9', text: 'שהוא לא מעריך אותי.', tags: ['complex_equivalence', 'mind_reading'], line: 3 },
    { id: 't10', text: 'ואז כל היום לא רציתי לדבר בישיבה,', tags: ['cause_effect', 'time_space_context'], line: 4 },
    { id: 't11', text: 'כי ממילא זה לא יעזור.', tags: ['cause_effect', 'universal_quantifier'], line: 4 },
    { id: 't12', text: 'אמרתי לעצמי שאני חייב לשתוק', tags: ['modal_necessity'], line: 5 },
    { id: 't13', text: 'כדי לא לעשות פאדיחות,', tags: ['cause_effect', 'nominalization'], line: 5 },
    { id: 't14', text: 'כי זה פשוט לא מקצועי מצידי.', tags: ['lost_performative'], line: 5 },
    { id: 't15', text: 'בסוף אמרתי שאני לא מצליח להסביר מה אני צריך.', tags: ['unspecified_verb'], line: 6 }
  ],
  categoriesAvailable: CATEGORIES.map((c) => c.id),
  questionsByCategory: {
    cause_effect: [
      g('ce1', 'איך בדיוק מה שקרה שם הוביל להחלטה לשתוק?', 'אני מסיק שאין טעם, ואז נסגר עוד לפני שאני מנסה.'),
      g('ce2', 'מה קורה אצלך בין מה שהוא עשה לבין "לא לדבר"?', 'יש לי פירוש מהיר שהוא כבר לא פתוח אליי ואז אני מוותר.'),
      g('ce3', 'היה מצב דומה ובכל זאת דיברת? מה היה שונה?', 'כן, כשהגעתי מוכן עם נקודה אחת קצרה כן דיברתי.'),
      b('ce4', 'פשוט תדבר יותר באומץ.', 'קפיצה לפתרון לפני בירור המנגנון.'),
      b('ce5', 'למה אתה רגיש לזה?', 'שאלת למה כללית לא מפרקת סיבתיות.'),
      b('ce6', 'נשמע שאתה חסר ביטחון.', 'פרשנות במקום בירור מנגנון.')
    ],
    complex_equivalence: [
      g('cx1', 'איך בדיוק "לא אמר שלום" אומר "לא מעריך אותי"?', 'אצלי שלום הוא סימן לכבוד, אז אני מחבר ביניהם.'),
      g('cx2', 'מה עוד זה יכול לומר חוץ מ"לא מעריך אותי"?', 'שהוא ממהר או טרוד, ולא בהכרח שזה קשור אליי.'),
      g('cx3', 'איזה סימן כן היה מספיק לך כדי לדעת שיש הערכה?', 'אם בישיבה הוא היה מבקש ממני דעה זה היה מרגיש אחרת.'),
      b('cx4', 'אל תיקח את זה אישית.', 'עצה מרגיעה, לא בדיקת השקילות.'),
      b('cx5', 'אז הוא כנראה אדם קר.', 'מגדיל פרשנות במקום לדייק.'),
      b('cx6', 'מה אתה מרגיש בגוף?', 'שאלה רגשית טובה, אבל לא מטא-מודל מדויק כאן.')
    ],
    mind_reading: [
      g('mr1', 'איך אתה יודע שהוא לא מעריך אותך? מה הראיה?', 'אין לי משפט שלו, אני נשען על ההתעלמות באותו רגע.'),
      g('mr2', 'איזו התנהגות ספציפית שלו פירשת כחוסר הערכה?', 'הוא עבר קרוב בלי קשר עין ובלי שלום.'),
      g('mr3', 'מה עוד יכול להסביר את ההתנהגות בלי להניח מה הוא חושב?', 'אולי הוא היה לחוץ או שקוע במשהו דחוף.'),
      b('mr4', 'אולי באמת הוא לא מעריך אותך.', 'מאשר את ההנחה במקום לבדוק ראיות.'),
      b('mr5', 'למה אתה צריך ממנו הערכה?', 'שאלה אחרת, לא דיוק על קריאת מחשבות.'),
      b('mr6', 'תשאל אם הוא אוהב אותך.', 'קפיצה לפתרון/עצה לפני דיוק.')
    ],
    lost_performative: [
      g('lp1', 'לפי מי זה "לא מקצועי"?', 'בעיקר לפי כלל פנימי שפיתחתי לעצמי.'),
      g('lp2', 'מה הקריטריון שלך ל"מקצועי" כאן?', 'לא להראות היסוס ולא לדבר בלי משהו חד.'),
      g('lp3', 'יש אדם מקצועי בעיניך שהיה פועל אחרת?', 'כן, יש מנהלת ששואלת שאלות גם בלי ודאות מלאה.'),
      b('lp4', 'זה באמת לא מקצועי.', 'מחזק שיפוט במקום לברר מקור/קריטריון.'),
      b('lp5', 'מי אשם בזה?', 'שאלת אשמה לא מחזירה קריטריון.'),
      b('lp6', 'תהיה פחות ביקורתי.', BAD_QUESTION_DEFAULT)
    ],
    universal_quantifier: [
      g('uq1', '"ממילא זה לא יעזור" — תמיד זה לא עוזר?', 'לא תמיד. לפעמים כשאני מוכן מראש זה כן עוזר.'),
      g('uq2', 'באילו מצבים דווקא כן יש סיכוי שזה יעזור?', 'כששואלים אותי ישירות או כשיש לי ניסוח קצר.'),
      g('uq3', 'כמה פעמים בפועל זה לא עזר לאחרונה?', 'אם אני סופר, היו גם ישיבות שבהן כן קידמתי משהו.'),
      b('uq4', 'אל תגיד תמיד/אף פעם.', 'הטפה לשונית במקום שאלה מדויקת.'),
      b('uq5', 'למה אתה פסימי?', 'פרשנות אישיותית במקום חיפוש יוצאי דופן.'),
      b('uq6', 'זה פשוט שלילי לחשוב ככה.', 'מוסרנות/שיפוט.')
    ],
    modal_necessity: [
      g('mn1', 'מה יקרה אם לא תשתוק בישיבה?', 'אני מפחד שיחשבו שאני לא מספיק חד.'),
      g('mn2', 'מי אומר שאתה חייב לשתוק כדי להישאר מקצועי?', 'אף אחד לא אמר. זה כלל פנימי שלי.'),
      g('mn3', 'יש מצב שמותר לך לדבר גם בלי ודאות מלאה?', 'אולי אם אנסח את זה כשאלה, זה כן אפשרי.'),
      b('mn4', 'ברור שאתה חייב, אחרת ידרכו עליך.', 'מחזק את המודאל במקום לבדוק אותו.'),
      b('mn5', 'פשוט תדבר, מה הבעיה?', 'קפיצה לפתרון זה צוין! אבל חסר בירור של הכלל.'),
      b('mn6', 'איך זה מרגיש להיות חייב?', 'רגשי, לא בודק בחירה/כלל.')
    ],
    nominalization: [
      g('no1', 'כשאתה אומר "פאדיחות" — מה בדיוק היה קורה?', 'הייתי מתבלבל, עוצר, ומפרש מבטים כביקורת.'),
      g('no2', 'איך תזהה בזמן אמת שזו "פאדיחה"?', 'אם יקטעו אותי מהר או אם אאבד לגמרי את הנקודה.'),
      g('no3', 'מי עושה מה בתוך ה"פאדיחות" שאתה מדמיין?', 'אני מדבר, הם שותקים, ואני מפרש את השקט לרעה.'),
      b('no4', 'תחשוב חיובי במקום פאדיחות.', 'עצה, לא פירוק ההפשטה לתהליך.'),
      b('no5', 'פאדיחות זה חלק מהחיים.', 'נורמליזציה כללית בלי דיוק.'),
      b('no6', 'למה אתה מפחד ממבוכה?', 'שאלת למה כללית.')
    ],
    unspecified_verb: [
      g('uv1', 'כשאתה אומר "לא מצליח להסביר" — איך אתה מנסה להסביר?', 'אני מתחיל מהר מדי ומאבד את הנקודה המרכזית.'),
      g('uv2', 'מה הצעד הראשון שלך כשאתה מנסה להסביר מה אתה צריך?', 'אני מתנצל קודם, ואז כבר יוצא מבולבל.'),
      g('uv3', 'אם היינו מצלמים וידאו של "להסביר" — מה היינו רואים?', 'מבט למטה, דיבור חלש, ושינוי ניסוח כמה פעמים.'),
      b('uv4', 'פשוט תהיה יותר ברור.', 'עצה במקום פירוק הפועל לצעדים.'),
      b('uv5', 'למה אתה לא מצליח להסביר?', '"למה" כללי לא מחזיר צעדים.'),
      b('uv6', 'זה כי אתה חסר ביטחון.', 'פרשנות + נומינליזציה במקום פירוק פועל.')
    ],
    time_space_context: [
      g('ctx1', 'כשאתה אומר "אתמול" — באיזה חלק של היום זה קרה בדיוק?', 'זה היה ממש לפני ישיבת הבוקר, כשכולם כבר היו בלחץ.'),
      g('ctx2', 'איפה בדיוק זה קרה — במסדרון, ליד החדר, או בתוך הישיבה?', 'במסדרון ליד חדר הישיבות, תוך כדי שכולם נכנסו פנימה.'),
      g('ctx3', 'באיזה הקשר זה קורה יותר — תחילת יום, מעבר בין פגישות, מול צוות?', 'בעיקר במעברים מהירים בתחילת יום, כשאין זמן לעצור.'),
      b('ctx4', 'עזוב זמן ומקום, העיקר מה אתה מרגיש.', 'רגש חשוב, אבל כרגע ביקשנו הקשר זמן/מקום.'),
      b('ctx5', 'אז מה הפתרון שלך לזה?', 'קפיצה לפתרון לפני בניית הקשר.'),
      b('ctx6', 'הוא פשוט לא מנומס.', 'שיפוט בלי לבנות הקשר.')
    ],
    sensory_vak: [
      g('vak1', 'מה אתה רואה/שומע/מרגיש בגוף ברגע שזה קורה?', 'אני רואה שהוא עובר מהר, לא שומע שלום, ומרגיש כיווץ בחזה.'),
      g('vak2', 'מה הסימן החושי הראשון שמפעיל אותך שם?', 'היעדר קשר העין והתחושה שהגוף נסגר מיד.'),
      g('vak3', 'אם נפריד ראייה/שמיעה/תחושה — מה יש בכל ערוץ?', 'ראייה: מעבר מהיר. שמיעה: שקט. תחושה: מתח וירידה באנרגיה.'),
      b('vak4', 'אז אתה רגיש מדי.', 'שיפוט אישיותי במקום פירוט חושי.'),
      b('vak5', 'למה אתה מרגיש ככה?', 'שאלת "למה" כללית, לא איסוף נתונים חושיים.'),
      b('vak6', 'תנשום עמוק וזה יעבור.', 'קפיצה לפתרון לפני דיוק החוויה.')
    ]
  }
};

const SCENARIOS: Scenario[] = [
  SCENARIO,
  {
    id: 'relationship-evening-loop',
    storyType: 'relationship',
    storyTypeLabel: 'זוגיות',
    title: 'Classic 2 · סיפור הקשר רחב (זוגיות/ערב)',
    storyTiles: [
      { id: 'r1', text: 'אתמול בערב', tags: ['time_space_context'], line: 1 },
      { id: 'r2', text: 'בבית', tags: ['time_space_context'], line: 1 },
      { id: 'r3', text: 'היא נכנסה', tags: ['sensory_vak', 'time_space_context'], line: 1 },
      { id: 'r4', text: 'ולא הסתכלה עליי.', tags: ['mind_reading', 'sensory_vak'], line: 1 },
      { id: 'r5', text: 'זה הרגיש דחייה.', tags: ['complex_equivalence', 'sensory_vak'], line: 2 },
      { id: 'r6', text: 'אם היא שקטה', tags: ['complex_equivalence'], line: 3 },
      { id: 'r7', text: 'זה אומר שהיא כועסת עליי.', tags: ['complex_equivalence', 'mind_reading'], line: 3 },
      { id: 'r8', text: 'ואז אני חייב להתרחק', tags: ['modal_necessity', 'cause_effect'], line: 4 },
      { id: 'r9', text: 'כי אחרת תהיה דרמה.', tags: ['cause_effect', 'universal_quantifier'], line: 4 },
      { id: 'r10', text: 'אני לא מצליח לדבר נורמלי ברגעים כאלה.', tags: ['unspecified_verb'], line: 5 },
      { id: 'r11', text: 'זה פשוט לא מכבד.', tags: ['lost_performative', 'nominalization'], line: 5 }
    ],
    categoriesAvailable: CATEGORIES.map((c) => c.id),
    questionsByCategory: SCENARIO.questionsByCategory
  },
  {
    id: 'study-exam-loop',
    storyType: 'study',
    storyTypeLabel: 'לימודים',
    title: 'Classic 2 · סיפור הקשר רחב (לימודים/מבחן)',
    storyTiles: [
      { id: 's1', text: 'בלילה לפני המבחן', tags: ['time_space_context'], line: 1 },
      { id: 's2', text: 'אני יושב מול החומר', tags: ['time_space_context', 'sensory_vak'], line: 1 },
      { id: 's3', text: 'ולא מצליח להתרכז.', tags: ['unspecified_verb', 'sensory_vak'], line: 1 },
      { id: 's4', text: 'אם אני לא קולט מהר', tags: ['complex_equivalence'], line: 2 },
      { id: 's5', text: 'זה אומר שאני לא בנוי לזה.', tags: ['complex_equivalence', 'mind_reading'], line: 2 },
      { id: 's6', text: 'ואז אני חייב לפתור עוד ועוד שאלות', tags: ['modal_necessity', 'cause_effect'], line: 3 },
      { id: 's7', text: 'כי אחרת בטוח אכשל.', tags: ['cause_effect', 'universal_quantifier'], line: 3 },
      { id: 's8', text: 'כל העסק הזה מרגיש כישלון.', tags: ['nominalization', 'sensory_vak'], line: 4 },
      { id: 's9', text: 'זה לא רציני לעצור לנוח.', tags: ['lost_performative'], line: 4 }
    ],
    categoriesAvailable: CATEGORIES.map((c) => c.id),
    questionsByCategory: SCENARIO.questionsByCategory
  },
  {
    id: 'family-morning-loop',
    storyType: 'family',
    storyTypeLabel: 'משפחה',
    title: 'Classic 2 · סיפור הקשר רחב (משפחה/בוקר)',
    storyTiles: [
      { id: 'f1', text: 'כל בוקר לפני בית ספר', tags: ['time_space_context', 'universal_quantifier'], line: 1 },
      { id: 'f2', text: 'אני אומר לו להזדרז', tags: ['unspecified_verb'], line: 1 },
      { id: 'f3', text: 'והוא עושה פרצוף.', tags: ['sensory_vak', 'mind_reading'], line: 1 },
      { id: 'f4', text: 'זה אומר שהוא מזלזל בי.', tags: ['complex_equivalence', 'mind_reading'], line: 2 },
      { id: 'f5', text: 'ואז אני חייב להרים קול', tags: ['modal_necessity', 'cause_effect'], line: 3 },
      { id: 'f6', text: 'כי אחרת שום דבר לא זז.', tags: ['cause_effect', 'universal_quantifier'], line: 3 },
      { id: 'f7', text: 'אחרי זה יש אווירה לא טובה בבית.', tags: ['nominalization', 'lost_performative'], line: 4 }
    ],
    categoriesAvailable: CATEGORIES.map((c) => c.id),
    questionsByCategory: SCENARIO.questionsByCategory
  }
];

const INITIAL: Machine = {
  step: 'chooseCategory', selectedCategory: null, selectedTileId: null, selectedQuestionId: null,
  tileAttempts: 0, questionAttempts: 0, lastFeedback: null, dialogueTurns: [], questionDeck: [],
  loopIndex: 0, nextActionMessage: '', activeDirection: null, usedGoodQuestionIds: []
};

const css = `
.c2{direction:rtl;font-family:"Assistant","Heebo","Noto Sans Hebrew","Segoe UI",sans-serif;background:radial-gradient(circle at 10% 0%,#dbeafe 0,#f8fafc 45%,#ecfeff 100%);color:#0f172a;border:1px solid #dbe7f5;border-radius:18px;padding:14px;max-width:1160px;margin:0 auto}
.c2 *{box-sizing:border-box}.c2-layout{display:grid;grid-template-columns:320px 1fr;gap:12px}.c2-panel{background:#ffffffd9;border:1px solid #dbe7f5;border-radius:14px;box-shadow:0 12px 28px rgba(15,23,42,.06)}
.c2-side{padding:12px;position:sticky;top:8px;align-self:start}.c2-main{padding:12px}.c2 h1,.c2 h2,.c2 h3,.c2 p{margin:0}.c2-sub{margin-top:6px;color:#475569;font-size:.9rem;line-height:1.35}
.c2-philo-btn{margin-top:10px;width:100%;border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;border-radius:12px;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;font-weight:900;cursor:pointer}
.c2-philo-avatar{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:999px;background:#fff;border:1px solid #bfdbfe;font-size:1.05rem}
.c2-quote{margin-top:10px;border:1px solid #bfdbfe;background:#eff6ff;border-radius:10px;padding:10px;font-size:.84rem;line-height:1.35;color:#1e3a8a}.c2-quote strong{display:block;margin-bottom:4px}
.c2-cats{display:grid;gap:8px;margin-top:10px}.c2-cat{border:1px solid #dbe7f5;background:#fff;border-radius:12px;padding:10px;text-align:right;cursor:pointer}.c2-cat:hover{border-color:#93c5fd;background:#f8fbff}.c2-cat.active{border-color:#2563eb;background:#eff6ff;box-shadow:0 0 0 2px rgba(37,99,235,.12)}.c2-cat.off{opacity:.78}
.c2-cat-top{display:flex;justify-content:space-between;gap:8px;direction:ltr}.c2-pill{border-radius:999px;background:#e2e8f0;padding:2px 8px;font-size:.72rem;font-weight:800}.c2-mini{color:#64748b;font-size:.74rem;margin-top:4px}
.c2-info{margin-top:10px;border:1px solid #c7d2fe;background:#eef2ff;color:#3730a3;border-radius:10px;padding:9px 10px;font-weight:700;line-height:1.3}.c2-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.c2-chip{border:1px solid #dbe7f5;background:#fff;border-radius:999px;padding:6px 10px;font-weight:700;font-size:.8rem}
.c2-storybar{margin-top:10px;border:1px solid #dbe7f5;background:#fff;border-radius:12px;padding:10px;display:grid;gap:8px}.c2-storybar-top{display:flex;flex-wrap:wrap;gap:8px;justify-content:space-between;align-items:center}.c2-story-actions{display:flex;flex-wrap:wrap;gap:8px}.c2-filter-row{display:flex;flex-wrap:wrap;gap:6px}
.c2-loop{margin-top:10px;border:1px dashed #93c5fd;background:#f8fbff;border-radius:12px;padding:10px}.c2-track{margin-top:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.c2-track span{border:1px solid #dbe7f5;background:#fff;border-radius:10px;padding:8px;text-align:center;font-weight:800;font-size:.76rem}.c2-track span.a{border-color:#2563eb;background:#dbeafe;color:#1d4ed8}
.c2-grid{margin-top:12px;display:grid;grid-template-columns:1.2fr .9fr;gap:12px}.c2-card{border:1px solid #dbe7f5;border-radius:12px;background:#fff;padding:12px}.c2-card h3{font-size:1rem;margin-bottom:8px}
.c2-line{display:flex;gap:8px;align-items:flex-start;margin-bottom:8px}.c2-line-label{width:52px;color:#64748b;font-size:.75rem;padding-top:6px}.c2-line-tiles{flex:1;display:flex;flex-wrap:wrap;gap:6px}.c2-tile{border:1px solid #dbe7f5;background:#f8fafc;border-radius:12px;padding:8px 10px;font-weight:700;cursor:pointer;line-height:1.25}.c2-tile:hover:not(:disabled){border-color:#93c5fd;background:#eff6ff}.c2-tile:disabled{opacity:.75;cursor:not-allowed}.c2-tile.sel{border-color:#2563eb;background:#dbeafe}.c2-tile.ok{border-color:#059669;background:#ecfdf5}.c2-tile.bad{border-color:#dc2626;background:#fef2f2}
.c2-fb{margin-top:12px;border-radius:10px;padding:10px 12px;font-weight:700;line-height:1.35}.c2-fb.info{background:#eef2ff;border:1px solid #c7d2fe;color:#3730a3}.c2-fb.success{background:#ecfdf5;border:1px solid #a7f3d0;color:#065f46}.c2-fb.error{background:#fef2f2;border:1px solid #fecaca;color:#991b1b}
.c2-qs{display:grid;gap:8px;margin-top:10px}.c2-q{border:1px solid #dbe7f5;background:#fff;border-radius:12px;padding:10px 12px;text-align:right;font-weight:700;line-height:1.35;cursor:pointer}.c2-q:hover{border-color:#93c5fd;background:#f8fbff}.c2-q.sel{border-color:#2563eb;box-shadow:0 0 0 2px rgba(37,99,235,.12)}
.c2-turn{border:1px solid #dbe7f5;border-radius:12px;padding:10px;background:#fff;margin-top:8px}.c2-turn-l{color:#64748b;font-size:.74rem;font-weight:800}.c2-turn-t{margin-top:4px;font-weight:700;line-height:1.35}.c2-map{margin-top:6px;color:#0f766e;font-weight:800;font-size:.82rem}
.c2-actions{margin-top:10px;display:flex;gap:8px;flex-wrap:wrap}.c2-btn{border:0;border-radius:12px;padding:10px 12px;font-weight:800;cursor:pointer}.c2-btn:disabled{opacity:.55;cursor:not-allowed}.c2-btn.p{background:#2563eb;color:#fff}.c2-btn.s{background:#e2e8f0;color:#0f172a}.c2-btn.g{background:#fff;border:1px solid #bfdbfe;color:#1d4ed8}
.c2-next{margin-top:12px;border:1px solid #c7d2fe;background:linear-gradient(180deg,#fff,#f8fbff);border-radius:12px;padding:12px}.c2-next p{margin-top:8px;line-height:1.35}.c2-next blockquote{margin:10px 0 0;padding:8px 10px;border-inline-start:4px solid #3b82f6;background:#eff6ff;border-radius:8px;color:#1e3a8a;font-size:.86rem}
.c2-dirs{display:grid;gap:8px;margin-top:10px}.c2-dir{border:1px solid #dbe7f5;background:#fff;border-radius:12px;padding:10px;text-align:right;font-weight:800;cursor:pointer}.c2-dir.active{border-color:#2563eb;background:#eff6ff}.c2-note{margin-top:10px;border:1px solid #dbe7f5;background:#f8fafc;border-radius:10px;padding:10px;line-height:1.35;color:#334155}
@media (max-width:960px){.c2-layout,.c2-grid{grid-template-columns:1fr}.c2-side{position:static}.c2-storybar-top{align-items:flex-start}}
`;

const lineGroups = (scenario: Scenario) => {
  const m = new Map<number, StoryTile[]>();
  scenario.storyTiles.forEach((t) => { if (!m.has(t.line)) m.set(t.line, []); m.get(t.line)!.push(t); });
  return Array.from(m.entries()).sort((a, b) => a[0] - b[0]);
};

const shuffle = <T,>(arr: T[]) => {
  const x = [...arr];
  for (let i = x.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
  return x;
};

const deckFor = (id: CategoryId) => {
  const list = SCENARIO.questionsByCategory[id];
  if (list.filter((q) => q.isGood).length !== 3) throw new Error(`Category ${id} must have 3 good questions`);
  return shuffle(list);
};

const scenarioHasCategory = (scenario: Scenario, categoryId: CategoryId) =>
  scenario.storyTiles.some((t) => t.tags.includes(categoryId));

const nextScenarioId = (currentId: string, filterId: StoryFilterId, selectedCategory?: CategoryId | null) => {
  const pool = SCENARIOS.filter((sc) => {
    const filterOk = filterId === 'all' || sc.storyType === filterId;
    const catOk = !selectedCategory || scenarioHasCategory(sc, selectedCategory);
    return filterOk && catOk;
  });
  if (!pool.length) return null;
  const idx = pool.findIndex((sc) => sc.id === currentId);
  if (idx < 0) return pool[0].id;
  return pool[(idx + 1) % pool.length].id;
};

const instructionFor = (step: Step, cat: CategoryId | null, scenario: Scenario) => {
  if (!cat || step === 'chooseCategory') return 'שלב 1: בחר/י קטגוריה, ואז אתר/י קטע מתאים בסיפור.';
  const label = CAT[cat].label;
  if (step === 'selectTile') {
    if (!scenarioHasCategory(scenario, cat)) return `בסיפור הזה אין דוגמה ברורה לקטגוריה ${label}. נסה/י להחליף סיפור.`;
    return `בחר/י קטע שמתאים לקטגוריה ${label}.`;
  }
  if (step === 'chooseQuestion') return `שלב 2: בחר/י שאלה מטא-מודלית מדויקת לקטגוריה ${label}.`;
  if (step === 'dialogue') return 'שלב 3: בדוק/י את תור הדיאלוג החדש ומה עודכן במפה.';
  return 'שלב 4: בחר/י כיוון לצעד הבא (אותה קטגוריה / שכנה / גבולות).';
};

export default function Classic2Trainer(): React.ReactElement {
  const [s, setS] = useState<Machine>(INITIAL);
  const [sound, setSound] = useState<'success' | 'fail' | null>(null);
  const [storyFilter, setStoryFilter] = useState<StoryFilterId>('all');
  const [scenarioId, setScenarioId] = useState<string>(SCENARIO.id);
  const [showPhilosopher, setShowPhilosopher] = useState<boolean>(false);
  const audioRef = useRef<AudioContext | null>(null);

  const scenario = SCENARIOS.find((sc) => sc.id === scenarioId) || SCENARIO;
  const rows = lineGroups(scenario);
  const currentCat = s.selectedCategory ? CAT[s.selectedCategory] : null;
  const lastTurn = s.dialogueTurns[s.dialogueTurns.length - 1] || null;
  const nextNeighbor = s.selectedCategory ? CAT[s.selectedCategory].nextLikely[0] : null;

  useEffect(() => {
    if (storyFilter === 'all' || scenario.storyType === storyFilter) return;
    const fallbackId = nextScenarioId(scenario.id, storyFilter, null);
    if (!fallbackId) return;
    setScenarioId(fallbackId);
    setS({ ...INITIAL });
  }, [storyFilter, scenario.id, scenario.storyType]);

  function tone(freq: number, ms: number, kind: OscillatorType) {
    const AC = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    if (!audioRef.current) audioRef.current = new AC();
    const ctx = audioRef.current;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + ms / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + ms / 1000);
  }

  function playSuccess() { setSound('success'); }
  function playFail() { setSound('fail'); }

  useEffect(() => {
    if (!sound) return;
    try {
      if (sound === 'success') { tone(740, 110, 'triangle'); setTimeout(() => tone(980, 90, 'triangle'), 90); }
      else tone(220, 130, 'sawtooth');
    } catch { /* noop */ }
    setSound(null);
  }, [sound]);

  const chooseCategory = (id: CategoryId) => {
    const hasExampleInStory = scenarioHasCategory(scenario, id);
    setS((p) => ({
      ...p,
      step: 'selectTile', selectedCategory: id, selectedTileId: null, selectedQuestionId: null,
      questionDeck: deckFor(id), activeDirection: null, nextActionMessage: '', usedGoodQuestionIds: [],
      lastFeedback: hasExampleInStory
        ? { tone: 'info', message: `נבחרה קטגוריה: ${CAT[id].label}. עכשיו סמן/י קטע מתאים בסיפור.` }
        : { tone: 'info', message: `נבחרה קטגוריה: ${CAT[id].label}. אין דוגמה ברורה בסיפור הזה — נסה/י \"סיפור מתאים לקטגוריה\".` }
    }));
  };

  const chooseTile = (tile: StoryTile) => {
    if (!s.selectedCategory || s.step !== 'selectTile') return;
    const ok = tile.tags.includes(s.selectedCategory);
    setS((p) => ({
      ...p,
      tileAttempts: p.tileAttempts + 1,
      selectedTileId: tile.id,
      step: ok ? 'chooseQuestion' : 'selectTile',
      lastFeedback: ok
        ? { tone: 'success', message: 'זיהוי טוב. עכשיו בחר/י שאלה מדויקת שתשיג מידע.' }
        : { tone: 'error', message: `עדיין לא. ${CAT[s.selectedCategory!].tileHint}` }
    }));
    ok ? playSuccess() : playFail();
  };

  const chooseQuestion = (q: QuestionOption) => {
    if (s.step !== 'chooseQuestion' || !s.selectedCategory || !s.selectedTileId) return;
    if (!q.isGood) {
      setS((p) => ({
        ...p,
        questionAttempts: p.questionAttempts + 1,
        selectedQuestionId: q.id,
        lastFeedback: { tone: 'error', message: q.feedbackIfBad || BAD_QUESTION_DEFAULT }
      }));
      playFail();
      return;
    }
    const turn: DialogueTurn = {
      id: `turn-${s.dialogueTurns.length + 1}`,
      categoryId: s.selectedCategory,
      tileId: s.selectedTileId,
      therapist: q.text,
      client: q.generatesClientAnswer,
      mapUpdate: CAT[s.selectedCategory].mapUpdateLine,
      loopIndex: s.loopIndex + 1
    };
    setS((p) => ({
      ...p,
      step: 'dialogue',
      questionAttempts: p.questionAttempts + 1,
      selectedQuestionId: q.id,
      dialogueTurns: [...p.dialogueTurns, turn],
      loopIndex: p.loopIndex + 1,
      usedGoodQuestionIds: [...p.usedGoodQuestionIds, q.id],
      lastFeedback: { tone: 'success', message: 'שאלה טובה. נוסף מידע חדש, ונפתח צעד המשך בדיאלוג.' }
    }));
    playSuccess();
  };

  const goNextStep = () => {
    if (s.step !== 'dialogue') return;
    setS((p) => ({ ...p, step: 'nextStep', activeDirection: null, nextActionMessage: '', lastFeedback: { tone: 'info', message: 'בחר/י כיוון להמשך החקירה.' } }));
  };

  const pickDirection = (d: 'same' | 'neighbor' | 'counter') => {
    if (s.step !== 'nextStep' || !s.selectedCategory) return;
    if (d === 'same') {
      const fresh = deckFor(s.selectedCategory).filter((q) => !(q.isGood && s.usedGoodQuestionIds.includes(q.id)));
      setS((p) => ({
        ...p,
        step: 'chooseQuestion', activeDirection: 'same', selectedQuestionId: null,
        questionDeck: fresh.length >= 6 ? fresh : deckFor(s.selectedCategory!),
        nextActionMessage: 'ממשיכים באותה קטגוריה כדי לדייק עוד מנגנון/קריטריון/תנאי.',
        lastFeedback: { tone: 'info', message: 'לולאה נוספת באותה קטגוריה: בחר/י שאלה נוספת.' }
      }));
      return;
    }
    if (d === 'neighbor') {
      const n = nextNeighbor;
      if (!n) return;
      setS((p) => ({
        ...p,
        step: 'selectTile', activeDirection: 'neighbor', selectedCategory: n,
        selectedTileId: null, selectedQuestionId: null, questionDeck: deckFor(n),
        nextActionMessage: `מעבר לקטגוריה שכנה: ${CAT[n].label}. עכשיו חפש/י קטע חדש.`,
        lastFeedback: { tone: 'info', message: `עברנו ל-${CAT[n].label}. בחר/י קטע מתאים בסיפור.` }
      }));
      return;
    }
    setS((p) => ({
      ...p,
      activeDirection: 'counter',
      nextActionMessage: 'חיפוש גבולות/יוצאי דופן: שאל/י מתי זה לא קורה, מה התנאים, ומה היה שונה. אפשר לעצור כאן או לפתוח לולאה חדשה.',
      lastFeedback: { tone: 'info', message: 'נבחר כיוון: גבולות / יוצאי דופן.' }
    }));
  };

  const reset = () => setS({ ...INITIAL });

  const switchStory = (mode: 'next' | 'matchCategory') => {
    const nextId = nextScenarioId(scenario.id, storyFilter, mode === 'matchCategory' ? s.selectedCategory : null);
    if (!nextId) {
      setS((p) => ({ ...p, lastFeedback: { tone: 'info', message: 'אין כרגע סיפור מתאים לפי הסינון/הקטגוריה.' } }));
      return;
    }
    setScenarioId(nextId);
    setS({ ...INITIAL });
  };

  const changeStoryFilter = (filterId: StoryFilterId) => {
    setStoryFilter(filterId);
    const nextId = nextScenarioId(scenario.id, filterId, null);
    if (nextId && nextId !== scenario.id) {
      setScenarioId(nextId);
      setS({ ...INITIAL });
    }
  };

  const loopKey = s.step === 'chooseCategory' || s.step === 'selectTile' ? 'i1' : s.step === 'chooseQuestion' ? 'ask' : s.step === 'dialogue' ? 'data' : 'i2';

  return (
    <div className="c2" dir="rtl" lang="he">
      <style>{css}</style>
      <div className="c2-layout">
        <aside className="c2-panel c2-side" aria-label="טבלת קטגוריות">
          <h2 style={{ fontSize: '1.18rem', fontWeight: 900 }}>Classic 2 · Structure of Magic</h2>
          <p className="c2-sub">סיפור רחב → קטגוריה → קטע → שאלה → דיאלוג → צעד הבא</p>
          <button type="button" className="c2-philo-btn" onClick={() => setShowPhilosopher((v) => !v)} aria-expanded={showPhilosopher}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="c2-philo-avatar" aria-hidden="true">🧙</span>
              <span>הפילוסוף (הפילוסופיה של הכלי)</span>
            </span>
            <span>{showPhilosopher ? '▾' : '▸'}</span>
          </button>
          {showPhilosopher && (
            <div className="c2-quote">
              <strong>למה הכלי הזה קיים?</strong>
              <div>{PHILOSOPHY_COPY}</div>
            </div>
          )}
          <div className="c2-cats" role="list" aria-label="קטגוריות לשוניות-לוגיות">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`c2-cat${s.selectedCategory === c.id ? ' active' : ''}${scenarioHasCategory(scenario, c.id) ? '' : ' off'}`}
                onClick={() => chooseCategory(c.id)}
                aria-pressed={s.selectedCategory === c.id}
              >
                <div className="c2-cat-top"><span className="c2-pill">{c.breenCell}</span><span className="c2-mini">{FAMILY_LABELS_HE[c.family]}</span></div>
                <div style={{ marginTop: 6, fontWeight: 800 }}>{c.label}</div>
                <div className="c2-mini">{scenarioHasCategory(scenario, c.id) ? 'יש דוגמה בסיפור' : 'אין דוגמה בסיפור הזה'}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="c2-panel c2-main" aria-label="זרימת אימון Classic 2">
          <h1 style={{ fontSize: '1.25rem', fontWeight: 900 }}>{scenario.title}</h1>
          <p className="c2-sub">מצב תרגול עם בחירת קטעים (RTL, מותאם מגע).</p>

          <div className="c2-storybar" aria-label="ניהול סיפורים">
            <div className="c2-storybar-top">
              <div>
                <div style={{ fontWeight: 900 }}>סיפור פעיל: {scenario.storyTypeLabel}</div>
                <div className="c2-mini">אפשר להחליף סיפור, לסנן לפי סוג סיפור, או למצוא סיפור מתאים לקטגוריה שבחרת.</div>
              </div>
              <div className="c2-story-actions">
                <button type="button" className="c2-btn s" onClick={() => switchStory('next')}>החלף סיפור</button>
                <button type="button" className="c2-btn g" onClick={() => switchStory('matchCategory')} disabled={!s.selectedCategory}>סיפור מתאים לקטגוריה</button>
              </div>
            </div>
            <div className="c2-filter-row">
              {(Object.keys(STORY_TYPE_LABELS) as StoryFilterId[]).map((fid) => (
                <button key={fid} type="button" className={`c2-btn ${storyFilter === fid ? 'p' : 's'}`} onClick={() => changeStoryFilter(fid)}>
                  {STORY_TYPE_LABELS[fid]}
                </button>
              ))}
            </div>
          </div>

          <div className="c2-info">{instructionFor(s.step, s.selectedCategory, scenario)}</div>

          <div className="c2-row">
            <span className="c2-chip">שלב: <strong>{STEP_LABELS_HE[s.step]}</strong></span>
            <span className="c2-chip">ניסיונות קטע: <strong>{s.tileAttempts}</strong></span>
            <span className="c2-chip">ניסיונות שאלה: <strong>{s.questionAttempts}</strong></span>
            <span className="c2-chip">לולאות: <strong>{s.loopIndex}</strong></span>
          </div>

          <div className="c2-loop" aria-label="אינדיקטור לולאה">
            <div style={{ fontWeight: 800, color: '#1e3a8a', fontSize: '.86rem' }}>לולאה רקורסיבית: זיהוי → שאלה → מידע חדש → זיהוי</div>
            <div className="c2-track">
              <span className={loopKey === 'i1' ? 'a' : ''}>זיהוי</span>
              <span className={loopKey === 'ask' ? 'a' : ''}>שאלה</span>
              <span className={loopKey === 'data' ? 'a' : ''}>מידע חדש</span>
              <span className={loopKey === 'i2' ? 'a' : ''}>זיהוי</span>
            </div>
          </div>

          <div className="c2-grid">
            <section className="c2-card" aria-label="חלון סיפור">
              <h3>חלון סיפור (הקשר רחב)</h3>
              {rows.map(([line, tiles]) => (
                <div key={line} className="c2-line">
                  <div className="c2-line-label">שורה {line}</div>
                  <div className="c2-line-tiles">
                    {tiles.map((t) => {
                      const sel = s.selectedTileId === t.id;
                      const good = sel && !!s.selectedCategory && t.tags.includes(s.selectedCategory) && s.step !== 'selectTile';
                      const bad = sel && !!s.selectedCategory && !t.tags.includes(s.selectedCategory) && s.lastFeedback?.tone === 'error';
                      const disabled = s.step !== 'selectTile';
                      return (
                        <button key={t.id} type="button" className={`c2-tile${sel ? ' sel' : ''}${good ? ' ok' : ''}${bad ? ' bad' : ''}`} onClick={() => chooseTile(t)} disabled={disabled}>
                          {t.text}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </section>

            <section className="c2-card" aria-label="סטטוס קטגוריה">
              <h3>סטטוס קטגוריה / ברין</h3>
              {currentCat ? (
                <>
                  <div style={{ fontWeight: 800 }}>{currentCat.label}</div>
                  <div className="c2-mini">{FAMILY_LABELS_HE[currentCat.family]} · קוד {currentCat.breenCell}</div>
                  <div className="c2-info" style={{ marginTop: 10 }}>{currentCat.tileHint}</div>
                </>
              ) : (
                <div className="c2-mini">בחר/י קטגוריה כדי להתחיל.</div>
              )}
            </section>
          </div>

          {s.lastFeedback && <div className={`c2-fb ${s.lastFeedback.tone}`}>{s.lastFeedback.message}</div>}

          {s.step === 'chooseQuestion' && s.selectedCategory && (
            <section className="c2-card" style={{ marginTop: 12 }} aria-label="בחירת שאלה">
              <h3>שלב 2 · בחירת השאלה המטא-מודלית הבאה</h3>
              <div className="c2-mini">יש 6 אפשרויות; בדיוק 3 טובות. ההתקדמות נעצרת עד בחירת שאלה טובה.</div>
              <div className="c2-qs">
                {s.questionDeck.map((q) => (
                  <button key={q.id} type="button" className={`c2-q${s.selectedQuestionId === q.id ? ' sel' : ''}`} onClick={() => chooseQuestion(q)}>
                    {q.text}
                  </button>
                ))}
              </div>
            </section>
          )}

          {s.step === 'dialogue' && lastTurn && (
            <section className="c2-card" style={{ marginTop: 12 }} aria-label="דיאלוג שנוצר">
              <h3>תור דיאלוג חדש</h3>
              <div className="c2-turn"><div className="c2-turn-l">שאלה (מטפל/ת)</div><div className="c2-turn-t">{lastTurn.therapist}</div></div>
              <div className="c2-turn"><div className="c2-turn-l">תשובת מטופל/ת</div><div className="c2-turn-t">{lastTurn.client}</div><div className="c2-map">{lastTurn.mapUpdate}</div></div>
              <div className="c2-actions">
                <button type="button" className="c2-btn p" onClick={goNextStep}>פתח צעד הבא</button>
                <button type="button" className="c2-btn s" onClick={() => setS((p) => ({ ...p, step: 'chooseQuestion' }))}>בחר/י שאלה אחרת</button>
              </div>
            </section>
          )}

          {s.step === 'nextStep' && (
            <section className="c2-next" aria-label="צעד הבא">
              <h3 style={{ fontSize: '1rem' }}>צעד הבא</h3>
              <p>זה לא טיפול מלא; זה מנוע לצעד הבא: לזהות קטגוריה אחת, לשאול שאלה מדויקת, ולעדכן את המפה.</p>
              <p>{nextNeighbor ? `קטגוריה שכנה מומלצת: ${CAT[nextNeighbor].label}.` : 'בחר/י כיוון המשך כדי להמשיך את הלולאה.'}</p>
              <blockquote>{PHILOSOPHY_COPY}</blockquote>
              <div className="c2-dirs">
                <button type="button" className={`c2-dir${s.activeDirection === 'same' ? ' active' : ''}`} onClick={() => pickDirection('same')}>1) להמשיך לדייק את אותה קטגוריה</button>
                <button type="button" className={`c2-dir${s.activeDirection === 'neighbor' ? ' active' : ''}`} onClick={() => pickDirection('neighbor')}>2) לעבור לקטגוריה שכנה</button>
                <button type="button" className={`c2-dir${s.activeDirection === 'counter' ? ' active' : ''}`} onClick={() => pickDirection('counter')}>3) לחפש גבולות / יוצאי דופן</button>
              </div>
              {s.nextActionMessage && <div className="c2-note">{s.nextActionMessage}</div>}
              <div className="c2-actions">
                <button type="button" className="c2-btn g" onClick={() => setS((p) => ({ ...p, step: 'selectTile', selectedTileId: null, selectedQuestionId: null, lastFeedback: { tone: 'info', message: 'לולאה חדשה באותו סיפור: בחר/י קטע.' } }))}>לולאה נוספת (אותו סיפור)</button>
                <button type="button" className="c2-btn s" onClick={reset}>איפוס</button>
              </div>
            </section>
          )}

          {s.dialogueTurns.length > 0 && (
            <section className="c2-card" style={{ marginTop: 12 }} aria-label="היסטוריית דיאלוג">
              <h3>היסטוריית דיאלוג</h3>
              {s.dialogueTurns.map((t) => (
                <div key={t.id} className="c2-turn">
                  <div className="c2-turn-l">לולאה #{t.loopIndex} · {CAT[t.categoryId].label}</div>
                  <div className="c2-turn-t"><strong>שאלה:</strong> {t.therapist}</div>
                  <div className="c2-turn-t" style={{ marginTop: 4 }}><strong>תשובה:</strong> {t.client}</div>
                  <div className="c2-map">{t.mapUpdate}</div>
                </div>
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

/*
README snippet:
- Add scenario: duplicate SCENARIO shape (storyTiles + questionsByCategory) and retag tiles.
- Add category: extend CategoryId + CATEGORIES + questionsByCategory[category].
- Keep exactly 3 good questions per category and 6-7 total options.
- Preserve the explicit step machine: chooseCategory -> selectTile -> chooseQuestion -> dialogue -> nextStep.
*/
