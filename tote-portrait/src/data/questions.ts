import type { Question } from '../types';

export const questions: Question[] = [
  {
    id: 'q1',
    text: 'איפה/מתי זה קורה הכי הרבה? (אירוע אחד ספציפי)',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 1,
  },
  {
    id: 'q2',
    text: 'מה קרה ממש רגע לפני שזה התחיל?',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 2,
  },
  {
    id: 'q3',
    text: 'איך אתה יודע שזה קורה? מה בדיוק רואים/שומעים/מרגישים?',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 3,
  },
  {
    id: 'q4',
    text: 'מה הצעד הראשון שאתה עושה כשזה מתחיל?',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 4,
  },
  {
    id: 'q5',
    text: 'ומה קורה אחר כך? (צעד שני)',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 5,
  },
  {
    id: 'q6',
    text: 'ואז מה? (צעד שלישי)',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 6,
  },
  {
    id: 'q7',
    text: 'מה עוצר אותך מלהמשיך/לצאת מזה? מה מפחיד/מה הכלל?',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 7,
  },
  {
    id: 'q8',
    text: 'מה קורה אוטומטית גם בלי החלטה? (גוף/רגש/מחשבה)',
    predicateTypes: ['Process', 'State'],
    suggestedSlotId: 8,
  },
  {
    id: 'q9',
    text: "איך נראה 'Exit' קטן? מה ייחשב התקדמות מינימלית?",
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 9,
  },
  {
    id: 'q10',
    text: "אם היית מצלמה—מה הייתי רואה שאתה עושה כשזה 'קורה'?",
    predicateTypes: ['State'],
    suggestedSlotId: 3,
  },
  {
    id: 'q11',
    text: 'תקוע ביחס למה? איזו פעולה/החלטה/יעד לא מתקדמים?',
    predicateTypes: ['State'],
    suggestedSlotId: 1,
  },
  {
    id: 'q12',
    text: 'מי עושה את זה אחרת? מה הוא עושה במקום?',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 4,
  },
  {
    id: 'q13',
    text: 'מה צריך לקרות כדי שזה לא יקרה? (תנאי מונע)',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 7,
  },
  {
    id: 'q14',
    text: 'מה היה חשוב לך להשיג דרך זה? (כוונה/ערך)',
    predicateTypes: ['Action', 'Process', 'State'],
    suggestedSlotId: 7,
  },
  {
    id: 'q15',
    text: 'מה הסימן הראשון הכי קטן שזה מתחיל?',
    predicateTypes: ['Process', 'State'],
    suggestedSlotId: 2,
  },
];

