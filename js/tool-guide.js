(() => {
  'use strict';
  const script = document.currentScript;
  const key = script && script.dataset.tool;
  const guides = {
    iceberg: ['תבניות עומק', 'להבחין בין המשפט שנאמר לבין ההשלמה שניתנה בדוגמה.', 'בחר תבנית, בדוק את ההשלמה ונסח שאלה שמחזירה מידע; אל תניח שההשלמה נכונה לגבי אדם אמיתי.', 'שאלת בירור אחת המבוססת על ההקשר.', 'categories'],
    scenario: ['תרגול סצנות', 'לבחור תגובה לפי מטרת השיחה והעיתוי.', 'קרא את ההקשר לפני הבחירה, השווה את המשוב ונסה לשים לב מה השאלה עושה לשיחה.', 'הסבר לבחירה בתגובה, ולא רק תשובה נכונה.', 'conversation'],
    breen: ['טבלת תבניות Breen', 'להתמצא בטבלת התבניות לפי שם או דוגמת משפט.', 'התחל במצב למידה לפני שימוש בזמן או מבחן. הטבלה הזו נפרדת מרמות הקשר–התנהגות–יכולת–אמונה–זהות.', 'הבחנה בין תבניות ומיקומן בטבלה.', 'categories'],
    morpher: ['שינוי ניסוח', 'לראות איך ניסוח אחר משנה את המידע והאפשרויות במשפט.', 'קרא את משפט המקור, בחר שינוי אחד ובדוק מה נשמר ומה נוסף. שינוי ניסוח אינו שינוי בעובדות.', 'שני ניסוחים והבחנה במה שהשתנה.', 'conversation'],
    triples: ['שלשות חיות', 'להבחין בין תבניות קשורות בתוך ההקשר של התרגיל.', 'קרא את המשפט וההשוואה בין האפשרויות. הסתמך על הנתונים שניתנו, ולא על ניחוש כוונות.', 'הבחנה מנומקת בין אפשרויות קשורות.', 'practice'],
    verb: ['פירוק פעולה עמומה', 'לפרט מה בפועל עושים כשאומרים פועל כללי.', 'פתח פועל אחד, פרט את המידע החסר והשווה את הגרסה המפורטת למקור.', 'תיאור פעולה ברור שאפשר להבין או לבצע.', 'blueprint'],
    radar: ['בירור הקשר', 'לברר למי, מתי ובאיזה מצב המשפט מתייחס.', 'קרא מקרה, בחר שאלת הקשר אחת ובדוק איזה מידע היא מוסיפה.', 'מידע מסוים שחסר לפני פירוש או עצה.', 'conversation'],
    classic: ['תרגול תבניות שמור', 'העמקה בזיהוי תבניות, לצד המסלול הראשי.', 'התחל במסלול הראשי אם התפריטים כאן אינם מוכרים. ההתקדמות בכלי השמור עשויה להישמר בנפרד.', 'זיהוי דפוס ושאלה אפשרית לבירור.', 'practice'],
    prism: ['מעבדת פריזמות שמורה', 'להשוות עדשות נוספות לגרסה הראשית.', 'לתרגול על משפט משלך, עבור למעבדת הפריזמות הראשית. העדשות הן אפשרויות לבדיקה, ולא אבחון.', 'בחירת נקודת בירור לפי משפט והקשר.', 'prismlab']
  };
  const guide = guides[key];
  if (!guide || !script || document.getElementById('supplementary-tool-guide')) return;
  const root = new URL('../', script.src);
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('css/tool-guide.css', root).href; document.head.append(css);
  const header = document.createElement('header'); header.id = 'supplementary-tool-guide'; header.dir = 'rtl';
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', 'מסלול התרגול');
  const name = document.createElement('strong'); name.textContent = guide[0]; nav.append(name);
  for (const [label, hash] of [['לתוכנית התרגול', 'home'], ['למסלול הראשי', guide[4]]]) {
    const a = document.createElement('a'); a.textContent = label; a.href = new URL(`index.html#${hash}`, root).href; nav.append(a);
  }
  const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'מתי משתמשים ומה מתרגלים כאן?'; details.append(summary);
  for (const [label, text] of [['מתי', guide[1]], ['איך', guide[2]], ['תוצר', guide[3]]]) { const p = document.createElement('p'); p.textContent = `${label}: ${text}`; details.append(p); }
  header.append(nav, details); document.body.prepend(header);
})();
