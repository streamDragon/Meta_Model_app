export const CONVERSATION_SKILLS = [
  { id: 'attune', title: 'הקשבה ושיקוף', detail: 'להכיר בחוויה בלי לקבוע מה נכון עבור האדם.' },
  { id: 'goal', title: 'מטרה והסכמה', detail: 'לברר מה האדם מבקש מהשיחה לפני שמובילים אותה.' },
  { id: 'clarify', title: 'בירור המפה', detail: 'לבקש דוגמה ופרט במילים של הדובר.' },
  { id: 'meaning', title: 'משמעות והשפעה', detail: 'להבחין בין מה שקרה, משמעותו והתגובה אליו.' },
  { id: 'choice', title: 'הרחבת אפשרויות', detail: 'להציע בדיקה בהסכמה, בלי להכתיב מסקנה.' },
  { id: 'action', title: 'צעד ובדיקה', detail: 'לבחור פעולה קטנה שבשליטת האדם ולבדוק מה קרה.' },
  { id: 'repair', title: 'תזמון ותיקון', detail: 'לעצור כששאלה לא מתאימה, להכיר בכך ולחזור להקשבה.' },
] as const;
export type ConversationSkill = typeof CONVERSATION_SKILLS[number]['id'];
export type ResponseQuality = 'helpful' | 'mixed' | 'unhelpful';
export interface ConversationOption {
  id: string;
  text: string;
  quality: ResponseQuality;
  feedback: string;
  reply: string;
}
export interface ConversationTurn {
  skill: ConversationSkill;
  prompt: string;
  options: ConversationOption[];
}
export interface ConversationScenario {
  id: string;
  title: string;
  context: string;
  opening: string;
  principle: string;
  turns: ConversationTurn[];
  transferCue: string;
}
