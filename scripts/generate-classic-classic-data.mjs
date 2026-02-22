import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();

const FAMILY_TO_BREEN_CELL = {
  deletion: 'DEL',
  distortion: 'DIS',
  generalization: 'GEN'
};

const FAMILY_LABEL_HE = {
  deletion: 'מחיקות',
  distortion: 'עיוותים',
  generalization: 'הכללות'
};

const PATTERNS = [
  {
    id: 'unspecified_noun',
    name: 'שם עצם לא מפורט',
    family: 'deletion',
    difficulty: 1,
    definition: 'נעשה שימוש בשם עצם כללי/עמום בלי להגדיר למה הכוונה בפועל.',
    problemLine: 'המפה נשארת עמומה ולכן קשה לדעת על מה באמת מדברים.',
    problemTags: ['ambiguity', 'low-specificity', 'diffuse-focus'],
    goalLine: 'להחזיר שם/מושג מדויק והגדרה תפעולית.',
    goalTargets: ['meaning', 'scope', 'referent'],
    examples: ['יש שם בעיה בתקשורת.', 'המצב הזה בלתי נסבל.', 'אני מרגיש התנגדות כל הזמן.'],
    focus: 'השם/המושג',
    probes: ['למה בדיוק אתה קורא כך?', 'מה זה אומר אצלך בפועל?', 'איזה דבר ספציפי זה?']
  },
  {
    id: 'unspecified_verb',
    name: 'פועל לא מפורט',
    family: 'deletion',
    difficulty: 1,
    definition: 'הפעולה נאמרת באופן כללי בלי ציון איך הפעולה מתבצעת.',
    problemLine: 'אין תיאור תהליכי ולכן אי אפשר להתערב או לבדוק מה קורה.',
    problemTags: ['process-hidden', 'missing-steps', 'unclear-action'],
    goalLine: 'להחזיר תיאור פעולה מפורט: מה בדיוק נעשה, צעד אחר צעד.',
    goalTargets: ['steps', 'behavior', 'sequence'],
    examples: ['ואז הוא פשוט פוגע בי.', 'אני מתפרק.', 'הם סוגרים אותי.'],
    focus: 'הפעולה',
    probes: ['מה הוא עושה בדיוק?', 'איך זה נראה בפועל?', 'מה קורה צעד-צעד?']
  },
  {
    id: 'simple_deletion',
    name: 'מחיקה פשוטה',
    family: 'deletion',
    difficulty: 1,
    definition: 'חלק מרכזי מהמשפט חסר (מי/מה/איפה/מתי/איך) ונדרש להשלים אותו.',
    problemLine: 'חסר מידע בסיסי ולכן המשמעות חלקית ולא ניתנת לבדיקה.',
    problemTags: ['missing-info', 'gap', 'incomplete-map'],
    goalLine: 'להשלים את הפרטים שנמחקו כדי לקבל תמונה שמישה.',
    goalTargets: ['who', 'what', 'when'],
    examples: ['זה קשה.', 'זה לא עובד.', 'זה פוגע.'],
    focus: 'החלק שנמחק',
    probes: ['מה בדיוק קשה?', 'מה לא עובד בדיוק?', 'מה פוגע במה?']
  },
  {
    id: 'comparative_deletion',
    name: 'השוואה חסרה',
    family: 'deletion',
    difficulty: 2,
    definition: 'מופיעה השוואה בלי סטנדרט השוואה ברור (למי/למה/באיזה מדד).',
    problemLine: 'נוצרת הערכה יחסית בלי קריטריון ולכן אי אפשר לבחון אותה.',
    problemTags: ['comparison', 'missing-standard', 'vague-judgment'],
    goalLine: 'להחזיר את מדד ההשוואה והייחוס המדויק.',
    goalTargets: ['compare-to', 'criterion', 'metric'],
    examples: ['אני פחות טוב מהם.', 'זה גרוע יותר.', 'היא יותר חזקה ממני בשיחות.'],
    focus: 'ההשוואה',
    probes: ['פחות טוב ביחס למה?', 'יותר גרוע לפי איזה מדד?', 'לעומת מי בדיוק?']
  },
  {
    id: 'lack_ref_index',
    name: 'חוסר אינדקס ייחוס',
    family: 'deletion',
    difficulty: 2,
    definition: 'נעשה שימוש בגורם לא מזוהה ("הם", "אנשים") בלי לציין מי בדיוק.',
    problemLine: 'הייחוס נשאר עמום ולכן קשה להגיב למקור הרלוונטי.',
    problemTags: ['who-unknown', 'vague-agent', 'diffuse-blame'],
    goalLine: 'לזהות מי/איזו קבוצה/אדם ספציפי נמצאים בהצהרה.',
    goalTargets: ['who', 'group', 'specific-person'],
    examples: ['הם לא נותנים לי מקום.', 'אנשים שופטים אותי.', 'כולם בעבודה נגד זה.'],
    focus: 'הגורם',
    probes: ['מי בדיוק הם?', 'איזה אנשים ספציפית?', 'מי בעבודה אמר את זה?']
  },
  {
    id: 'mind_reading',
    name: 'קריאת מחשבות',
    family: 'distortion',
    difficulty: 2,
    definition: 'אדם מציג ידיעה על מחשבות/כוונות של אחר בלי עדות ברורה.',
    problemLine: 'מסקנה פנימית מוצגת כעובדה ויוצרת תגובה לא נבדקת.',
    problemTags: ['assumption-about-other', 'inference', 'certainty'],
    goalLine: 'להבחין בין פרשנות לעדות ולבדוק על מה מבוססת הידיעה.',
    goalTargets: ['evidence', 'observable-cues', 'alternative-meaning'],
    examples: ['אני יודע שהיא חושבת שאני חלש.', 'הוא בטוח מזלזל בי.', 'הם חושבים שאני לא רציני.'],
    focus: 'הידיעה על האחר',
    probes: ['איך אתה יודע?', 'על מה אתה מבסס את זה?', 'מה ראית/שמעת בפועל?']
  },
  {
    id: 'cause_effect',
    name: 'סיבה ותוצאה',
    family: 'distortion',
    difficulty: 2,
    definition: 'מוצג קשר סיבתי קשיח בין אירוע אחד לבין תוצאה פנימית/חיצונית.',
    problemLine: 'נוצר רצף סיבתי חד-כיווני שמקטין בחירה ואפשרויות.',
    problemTags: ['causal-chain', 'loss-of-choice', 'oversimplification'],
    goalLine: 'לפרק את השרשרת ולברר את הצעדים המתווכים בקשר.',
    goalTargets: ['mechanism', 'sequence', 'mediation'],
    examples: ['כשshe שותקת זה הורס את הקשר.', 'ההודעה שלו מורידה אותי.', 'הלחץ הזה משתק אותי.'],
    focus: 'הקשר הסיבתי',
    probes: ['איך בדיוק X גורם ל-Y?', 'מה קורה באמצע?', 'אילו שלבים מחברים בין זה לזה?']
  },
  {
    id: 'complex_equivalence',
    name: 'שקילות מורכבת',
    family: 'distortion',
    difficulty: 3,
    definition: 'שני דברים שונים מוצגים כשווי-משמעות ("אם X אז זה אומר Y").',
    problemLine: 'אירוע יחיד מקבל משמעות מוחלטת שלא בהכרח נובעת ממנו.',
    problemTags: ['meaning-assignment', 'interpretation', 'fusion'],
    goalLine: 'לבדוק לפי איזה כלל X מקבל את המשמעות Y ואילו פירושים נוספים קיימים.',
    goalTargets: ['meaning-rule', 'criteria', 'alternatives'],
    examples: ['אם היא איחרה זה אומר שלא אכפת לה.', 'אם הוא לא ענה מיד אז הוא כועס.', 'הוא שתק, כלומר הוא מסכים.'],
    focus: 'המשמעות המיוחסת',
    probes: ['איך זה אומר את זה?', 'לפי איזה כלל?', 'מה עוד זה יכול לומר?']
  },
  {
    id: 'presuppositions',
    name: 'הנחות מוקדמות',
    family: 'distortion',
    difficulty: 3,
    definition: 'השאלה/הטענה מניחה מראש עובדה או מסגרת שלא נבדקה.',
    problemLine: 'הנחת יסוד סמויה מנהלת את השיח בלי בחינה מפורשת.',
    problemTags: ['hidden-assumption', 'framing', 'implicit-premise'],
    goalLine: 'לחשוף את מה שמונח מראש ולבדוק אם הוא בהכרח נכון.',
    goalTargets: ['premise', 'assumption', 'frame'],
    examples: ['מתי תפסיק להרוס את זה?', 'איך אתקדם אם כבר מאוחר מדי?', 'מי יכעס כשאגיד לא?'],
    focus: 'ההנחה הסמויה',
    probes: ['מה מונח כאן מראש?', 'מי אמר שזה נכון?', 'האם המסגרת הזו מחייבת?']
  },
  {
    id: 'nominalization',
    name: 'נומינליזציה',
    family: 'distortion',
    difficulty: 2,
    definition: 'תהליך/פעולה מוצגים כשם עצם סטטי, כאילו זו ישות קבועה.',
    problemLine: 'התהליך קופא לשם מופשט ולכן קשה לשנותו או למדוד אותו.',
    problemTags: ['frozen-process', 'abstract-noun', 'reification'],
    goalLine: 'להחזיר את השם לפועל/התנהגות שניתן לצפות ולשנות.',
    goalTargets: ['process', 'behavior', 'actors'],
    examples: ['יש בינינו ניתוק.', 'התקשורת נהרסה.', 'יש חוסר אמון מוחלט.'],
    focus: 'התהליך שקפא',
    probes: ['מה קורה בפועל?', 'מי עושה מה?', 'איך נראה התהליך הזה ביום-יום?']
  },
  {
    id: 'universal_quantifiers',
    name: 'כמתים כוללניים',
    family: 'generalization',
    difficulty: 1,
    definition: 'שימוש במילים כוללניות כמו תמיד/אף פעם/כולם/כלום.',
    problemLine: 'יוצרת הכללה קשיחה שמוחקת יוצאי דופן ואפשרויות שינוי.',
    problemTags: ['always-never', 'rigidity', 'exceptions-missing'],
    goalLine: 'למצוא יוצאי דופן ותנאים שבהם ההצהרה לא מתקיימת.',
    goalTargets: ['exceptions', 'frequency', 'conditions'],
    examples: ['זה תמיד קורה לי.', 'אף אחד לא מקשיב.', 'כולם נגדי.'],
    focus: 'ההכללה',
    probes: ['תמיד?', 'אף פעם אין יוצא דופן?', 'מתי זה כן שונה?']
  },
  {
    id: 'modal_necessity',
    name: 'מודל הכרח',
    family: 'generalization',
    difficulty: 2,
    definition: 'שפה של חובה/הכרח ("חייב", "אסור", "מוכרח") שמציגה כלל קשיח.',
    problemLine: 'נוצרת תחושת כפייה שמסתירה בחירה, מחיר ואפשרויות חלופיות.',
    problemTags: ['must', 'rules', 'constraint'],
    goalLine: 'לברר מי קבע את הכלל, מה יקרה אם לא, ומה המחיר/הרווח.',
    goalTargets: ['rule-source', 'consequence', 'choice'],
    examples: ['אני חייב להסכים.', 'אסור לי לטעות.', 'אני מוכרח לרצות את כולם.'],
    focus: 'כלל ההכרח',
    probes: ['מה יקרה אם לא?', 'מי קבע שחייב?', 'מה מונע ממך לבחור אחרת?']
  },
  {
    id: 'modal_possibility',
    name: 'מודל אפשרות/אי-יכולת',
    family: 'generalization',
    difficulty: 2,
    definition: 'הצהרה על יכולת/אי-יכולת/אפשרות כאילו היא קבועה וכוללת.',
    problemLine: 'מייצרת זהות של יכולת מוגבלת במקום מצב תלוי הקשר.',
    problemTags: ['can-cannot', 'capability', 'learned-limit'],
    goalLine: 'לבדוק באילו תנאים זה אפשרי/לא אפשרי ומה חסר כרגע.',
    goalTargets: ['conditions', 'resources', 'exceptions'],
    examples: ['אני לא יכול לדבר מול קהל.', 'אי אפשר לבקש את זה.', 'אני לא מסוגל להירגע.'],
    focus: 'גבול היכולת',
    probes: ['לא יכול בכלל או כרגע?', 'מתי זה כן אפשרי?', 'מה חסר כדי שתוכל?']
  },
  {
    id: 'lost_performative',
    name: 'שיפוט חסר מקור',
    family: 'generalization',
    difficulty: 2,
    definition: 'שיפוט ערכי מוצג כאמת כללית בלי לציין מי שופט ולפי מה.',
    problemLine: 'שיפוט נשמע אובייקטיבי למרות שהוא תלוי קריטריון/מקור.',
    problemTags: ['judgment', 'missing-source', 'criteria-hidden'],
    goalLine: 'להחזיר מקור לשיפוט ואת הקריטריון שעל פיו הוא נקבע.',
    goalTargets: ['judge', 'criterion', 'standard'],
    examples: ['זה לא הוגן.', 'זה לא ראוי.', 'זה פשוט לא בסדר.'],
    focus: 'השיפוט',
    probes: ['לפי מי זה לא הוגן?', 'לפי איזה קריטריון?', 'מי קובע מה ראוי?']
  },
  {
    id: 'rules_generalization',
    name: 'הכללת כללים',
    family: 'generalization',
    difficulty: 3,
    definition: 'הסקת כלל רחב מניסיון חלקי ("במערכת הזו תמיד...").',
    problemLine: 'כלל נבנה על מעט דוגמאות ומגביל תגובה עתידית.',
    problemTags: ['rule-formation', 'overlearning', 'prediction'],
    goalLine: 'לבדוק את בסיס הכלל, ההקשר, והאם יש נתונים שסותרים אותו.',
    goalTargets: ['evidence-base', 'scope', 'counterexamples'],
    examples: ['אם אני נפתח אנשים מנצלים.', 'בכל ריב עדיף לשתוק.', 'כשאני מבקש עזרה זה תמיד מסתבך.'],
    focus: 'הכלל',
    probes: ['על סמך אילו מקרים?', 'האם יש מקרים הפוכים?', 'באיזה הקשר זה כן/לא נכון?']
  }
];

function makeGoodQuestions(pattern) {
  const base = [
    `מה בדיוק אתה מתכוון ב-${pattern.focus}?`,
    pattern.probes[0],
    pattern.probes[1],
    pattern.probes[2],
    `באיזה הקשר זה קורה?`,
    `מתי זה לא קורה כך?`,
    `מי/מה מעורב בזה בדיוק?`,
    `איך זה נראה/נשמע/מתבצע בפועל?`,
    `מה הנתון החסר שהכי חשוב לברר כאן?`
  ];
  return base.slice(0, 8).map((text, index) => ({
    id: `${pattern.id}_gq_${index + 1}`,
    text
  }));
}

function makeTrapQuestions(pattern) {
  const traps = [
    {
      text: 'ומה זה אומר עליך כאדם?',
      reason: 'זו העמקה לזהות/משמעות רחבה מדי, ולא מחזירה קודם את המידע החסר של התבנית.'
    },
    {
      text: 'מי אשם בזה לדעתך?',
      reason: 'השאלה מזיזה להאשמה במקום לברר את מבנה ההפרה הספציפית.'
    },
    {
      text: 'למה אתה לא פשוט מפסיק עם זה?',
      reason: 'זו שאלה שיפוטית/פתרונית מוקדמת שלא מדייקת את המפה.'
    },
    {
      text: 'איך הילדות שלך קשורה לזה?',
      reason: 'ייתכן שרלוונטי בהמשך, אבל לא זו שאלת מטה-מודל ראשונה להפרה הנוכחית.'
    },
    {
      text: 'מה הדבר הכי גרוע שיכול לקרות?',
      reason: 'זו שאלה של תרחיש/חרדה, לא בהכרח מחזירה את המידע הלשוני החסר.'
    },
    {
      text: 'אז אתה בעצם אומר שאין תקווה?',
      reason: 'זו הקצנה/פרפרזה רגשית ולא דיוק של התבנית עצמה.'
    },
    {
      text: 'מה לדעתך הצד השני צריך לעשות?',
      reason: 'הפניית מוקד לפתרון חיצוני לפני שהוגדר המידע החסר בתבנית.'
    },
    {
      text: 'האם אתה מוכן להתחייב לשינוי עכשיו?',
      reason: 'זו שאלה חוזית/מוטיבציונית; בשלב זה המטרה היא בירור לשוני-מיפוי.'
    },
    {
      text: 'מה הערך הכי חשוב לך בחיים?',
      reason: 'שאלת ערכים כללית מדי ביחס לדיוק מקומי של ההפרה.'
    }
  ];

  return traps.slice(0, 8).map((trap, index) => ({
    id: `${pattern.id}_tq_${index + 1}`,
    text: trap.text,
    reason: trap.reason
  }));
}

function makeProblemOptions(pattern) {
  const distractors = [
    'נוצר תיאור עשיר ומדויק שמאפשר פעולה מיידית.',
    'השפה מגדילה מגוון בחירה ומצמצמת הכללה.',
    'נוצרת בהירות מלאה לגבי מי/מה/איך ולכן אין צורך בשאלה נוספת.',
    'הבעיה המרכזית כאן היא רק רגש חזק, לא מבנה המפה.',
    'ההצהרה כבר כוללת קריטריון מדויק ונתוני בדיקה מלאים.'
  ];
  const correctIndex = (pattern.id.length + pattern.difficulty) % 5;
  const options = [];
  let distractorIndex = 0;
  for (let i = 0; i < 5; i += 1) {
    if (i === correctIndex) {
      options.push({
        id: `${pattern.id}_problem_${i + 1}`,
        text: pattern.problemLine,
        correct: true
      });
    } else {
      options.push({
        id: `${pattern.id}_problem_${i + 1}`,
        text: distractors[distractorIndex % distractors.length],
        correct: false
      });
      distractorIndex += 1;
    }
  }
  return options;
}

function makeGoalOptions(pattern) {
  const distractors = [
    'לשכנע את המטופל מיד שהפרשנות שלו שגויה.',
    'לתת פתרון מהיר לפני שיש פרטים ברורים.',
    'להוכיח מי צודק בדיון במקום לברר מידע.',
    'להרגיע רגש בלבד בלי לגעת במבנה השפה.',
    'לעבור נושא כדי לא להעמיס בשאלה מדויקת.'
  ];
  const correctIndex = (pattern.name.length + pattern.difficulty) % 5;
  const options = [];
  let distractorIndex = 0;
  for (let i = 0; i < 5; i += 1) {
    if (i === correctIndex) {
      options.push({
        id: `${pattern.id}_goal_${i + 1}`,
        text: pattern.goalLine,
        correct: true
      });
    } else {
      options.push({
        id: `${pattern.id}_goal_${i + 1}`,
        text: distractors[distractorIndex % distractors.length],
        correct: false
      });
      distractorIndex += 1;
    }
  }
  return options;
}

function makePatternRecord(pattern) {
  const family = pattern.family;
  return {
    id: pattern.id,
    name: pattern.name,
    family,
    difficulty: pattern.difficulty,
    breenCellId: FAMILY_TO_BREEN_CELL[family],
    definition: pattern.definition,
    problem: {
      oneLiner: pattern.problemLine,
      tags: pattern.problemTags
    },
    goal: {
      oneLiner: pattern.goalLine,
      dataTargets: pattern.goalTargets
    },
    goodQuestions: makeGoodQuestions(pattern),
    trapQuestions: makeTrapQuestions(pattern),
    problemOptions: makeProblemOptions(pattern),
    goalOptions: makeGoalOptions(pattern),
    examples: pattern.examples
  };
}

function buildPatternsJson() {
  return {
    metadata: {
      app: 'Classic Classic',
      version: '0.1.0',
      locale: 'he-IL',
      description: 'Meta Model Trainer — Breen-table anchored drill (MVP dataset)'
    },
    breenTable: {
      version: 'placeholder-v0',
      cells: [
        { id: 'DEL', label: 'DEL', labelHe: FAMILY_LABEL_HE.deletion, family: 'deletion' },
        { id: 'DIS', label: 'DIS', labelHe: FAMILY_LABEL_HE.distortion, family: 'distortion' },
        { id: 'GEN', label: 'GEN', labelHe: FAMILY_LABEL_HE.generalization, family: 'generalization' }
      ]
    },
    patterns: PATTERNS.map(makePatternRecord)
  };
}

function buildCopyJson() {
  return {
    locale: 'he-IL',
    metaModelPurpose: 'מטה-מודל עוזר לנו לזהות איפה המפה הלשונית חסרה/מעוותת/מוכללת, ולהחזיר מידע מדויק שמרחיב בחירה.',
    problemDefinition: '“בעיה” כאן היא לא בעיית חיים כללית, אלא מה המבנה הלשוני יוצר במפה: עמימות, קביעה לא בדוקה, או כלל קשיח.',
    goalDefinition: '“מטרה / Data Target” היא איזה מידע חסר אנחנו רוצים להחזיר כדי לדייק את המפה (מי/מה/איך/לפי מה/באילו תנאים).',
    learningMode: 'מצב למידה: אפשר לעצור, לקבל רמז, לראות הסבר, ולנסות שוב עד שמדייקים.',
    examMode: 'מצב מבחן: זמן רץ, בלי רמזים/הסברים תוך כדי. בסוף מקבלים דו״ח ביצועים ודפוסים חלשים.'
  };
}

async function main() {
  const patternsPath = path.join(ROOT, 'data', 'metaModelPatterns.he.json');
  const copyPath = path.join(ROOT, 'data', 'copy.he.json');

  const patternsPayload = JSON.stringify(buildPatternsJson(), null, 2);
  const copyPayload = JSON.stringify(buildCopyJson(), null, 2);

  await writeFile(patternsPath, patternsPayload, 'utf8');
  await writeFile(copyPath, copyPayload, 'utf8');

  console.log(`Wrote ${patternsPath}`);
  console.log(`Wrote ${copyPath}`);
}

main().catch((error) => {
  console.error('Failed generating Classic Classic data:', error);
  process.exitCode = 1;
});
