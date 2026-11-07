import type { ConversationScenario } from './conversationSkills';
import workConversation from '../../assets/images/scenario-trainer/scenes/boss-feedback__cover.webp';
import relationshipConversation from '../../assets/images/scenario-trainer/scenes/relationships-talk__cover.webp';
import presentationConversation from '../../assets/images/scenario-trainer/scenes/work-client-update__cover.webp';
import studyConversation from '../../assets/images/prismlab/book-simple-deletion.webp';
import repairConversation from '../../assets/images/scenario-trainer/scenes/couple-shutdown__04-response.webp';
import boundaryConversation from '../../assets/images/scenario-trainer/scenes/couple-shutdown__cover.webp';

/**
 * Lightweight, authored presentation layer for the conversation gym.
 * The script is separated from answer quality: pictures and theory help
 * orient the learner but never imply how a real person will respond.
 */
export interface ConversationMoment {
  speakerLine?: string;
  question?: string;
  theory: {
    title: string;
    cue: string;
    detail: string;
  };
}
export interface ConversationPresentation {
  image: string;
  moments: [ConversationMoment, ConversationMoment];
}

export const CONVERSATION_PRESENTATION: Record<string, ConversationPresentation> = {
  meeting: {
    image: workConversation,
    moments: [
      {
        theory: {
          title: 'מהכללה לחוויה',
          cue: 'לפני שבודקים אם באמת ״אף אחד״ לא מקשיב, מבררים מה האדם חווה.',
          detail: 'שאלת מטה־מודל על הכללה יכולה להיות שימושית, אבל לא תמיד היא הצעד הראשון. שיקוף החוויה יוצר בסיס לבירור בהמשך.',
        },
      },
      {
        speakerLine: 'אני בעיקר צריך לפרוק עכשיו.',
        question: 'איך תמשיך את השיחה?',
        theory: {
          title: 'צ׳אנק־אפ לכוונה',
          cue: 'מה הוא רוצה מהשיחה כרגע? להוציא את מה שיושב עליו, לא לקבל תוכנית.',
          detail: 'עולים רגע מעל פרטי האירוע כדי לזהות את מטרת השיחה. כשמישהו מבקש הקשבה, אפשר להציע פשוט להקשיב ולדחות פתרונות.',
        },
      },
    ],
  },
  reply: {
    image: relationshipConversation,
    moments: [
      {
        theory: {
          title: 'להפריד עובדה מפרשנות',
          cue: '״לא ענתה״ הוא אירוע. ״לא אכפת לה״ הוא פירוש שעדיין לא נבדק.',
          detail: 'במטה־מודל מחזירים את השיחה למידע שחסר. לא מחליפים את הפירוש של האדם בפירוש שהמצאנו בעצמנו.',
        },
      },
      {
        speakerLine: 'כשאין תשובה, אני מרגישה שאני לא חשובה.',
        question: 'מה כדאי לברר עכשיו?',
        theory: {
          title: 'משמעות והשפעה',
          cue: 'אחרי שהבנו את המשמעות שלה, אפשר לבדוק איך היא משפיעה על מה שהיא עושה.',
          detail: 'לא מתווכחים עם הרגש ולא קובעים שהמשמעות שגויה. שואלים ברשות מה משתנה בהתנהגות כשהמחשבה הזו מופיעה.',
        },
      },
    ],
  },
  presentation: {
    image: presentationConversation,
    moments: [
      {
        theory: {
          title: 'לברר ״לא יכול״',
          cue: 'במקום להבטיח שהוא מסוגל, שאל באילו תנאים הקושי מופיע.',
          detail: '״לא יכול״ יכול לבטא מגבלה ממשית או חוויה מסוימת. בירור תנאים, הקשרים ויוצאי דופן עוזר לדייק בלי לבטל את הקושי.',
        },
      },
      {
        speakerLine: 'עם שני עמיתים אני מסוגל.',
        question: 'מה תציע כדי להתקדם?',
        theory: {
          title: 'לזהות משאב קיים',
          cue: 'מצאנו מצב שבו קל יותר. אפשר לבחון מה מתוכו ניתן להעביר למצגת.',
          detail: 'יוצא דופן הוא מידע על תנאים מסייעים, לא הוכחה שאין בעיה. מציעים לבדוק את ההבדלים בהסכמה ולא כופים מבחן.',
        },
      },
    ],
  },
  study: {
    image: studyConversation,
    moments: [
      {
        theory: {
          title: 'מכוונה לפעולה קטנה',
          cue: '״ללמוד יותר״ הוא כיוון. צריך להפוך אותו לצעד שאפשר לנסות.',
          detail: 'מבררים זמן אפשרי ופעולה קטנה שנמצאת בשליטת האדם. הצעה היא נקודת פתיחה למשא ומתן, לא הוראה.',
        },
      },
      {
        speakerLine: 'אוכל ללמוד ביום שלישי, אחרי ארוחת הערב.',
        question: 'מה חסר כדי שהצעד יהיה ברור?',
        theory: {
          title: 'איך נדע שזה קרה?',
          cue: 'זמן כבר יש. עכשיו צריך להגדיר מה עושים ואיך בודקים שהניסיון התאים.',
          detail: 'צעד עובד טוב יותר כשיש לו תוכן, התחלה ואפשרות לבדיקה. כך אפשר ללמוד ממה שקרה במקום לשפוט את האדם.',
        },
      },
    ],
  },
  repair: {
    image: repairConversation,
    moments: [
      {
        theory: {
          title: 'לתקן לפני שממשיכים',
          cue: 'אם האדם מרגיש שלא הבנת, זו אינפורמציה חשובה יותר מהשאלה שתכננת.',
          detail: 'עוצרים, מכירים בכך שאולי פספסנו משהו ומזמינים אותו לומר מה היה חשוב לו. אין צורך להגן על השיטה או על הכוונה שלנו.',
        },
      },
      {
        speakerLine: 'אני רק רוצה שתהיה איתי רגע.',
        question: 'איך תגיב לבקשה שלו?',
        theory: {
          title: 'צ׳אנק־אפ לכיוון הכוונה',
          cue: 'מה הבקשה שמתחת למילים? להיות איתו ולהקשיב, לא לפתור או לחקור.',
          detail: 'עולים מרמת השאלה והטכניקה לרמת הכוונה: מה האדם מבקש שיקרה ביניכם עכשיו? כשזו נוכחות, עוצרים את הבירור ומכבדים את הקצב שלו.',
        },
      },
    ],
  },
  boundary: {
    image: boundaryConversation,
    moments: [
      {
        theory: {
          title: 'מטרה לפני טכניקה',
          cue: 'הוא ביקש לחשוב על גבול. תפקידך להבין מה חשוב לו לשמור.',
          detail: 'בירור חלופות אינו מחייב לפרש מחדש את האדם האחר, לסלוח לו או לשקול קשר. מתחילים מהמטרה ומהבחירה של הדובר.',
        },
      },
      {
        speakerLine: 'אני רוצה להימנע מוויכוח נוסף.',
        question: 'איך תרחיב אפשרויות בלי לפגוע בגבול?',
        theory: {
          title: 'להרחיב אפשרויות בתוך הגבול',
          cue: 'אפשר לשקול כמה דרכי פעולה, בלי לוותר על הגבול שבחר.',
          detail: 'כשמגדירים מראש מה אינו רצוי, מחפשים אפשרויות התואמות את ההחלטה. לא מחייבים עימות או פגישה כדי ״לפתור״ את הסיפור.',
        },
      },
    ],
  },
};

export function getConversationPresentation(scenario: ConversationScenario): ConversationPresentation | undefined {
  return CONVERSATION_PRESENTATION[scenario.id];
}
