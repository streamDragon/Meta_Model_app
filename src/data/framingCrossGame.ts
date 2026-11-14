export type Direction = 'west' | 'north' | 'east' | 'south';
export type Topic = 'problem' | 'goal' | 'resource';
export type Option = { id:string; text:string; good:boolean; reply?:string; finding?:string; feeling?:string; certainty?:number };
export type Mission = { direction:Direction; label:string; coach:string; options:Option[] };
export const directions:Record<Direction,{title:string;short:string;arrow:string}> = {
 west:{title:'תקדימים וציפיות',short:'מה קדם לכך?',arrow:'←'},
 north:{title:'מפת העולם',short:'איזו משמעות?',arrow:'↑'},
 east:{title:'השלכות ורווחים',short:'לאן זה מוביל?',arrow:'→'},
 south:{title:'דוגמאות ופרטים',short:'מה קרה בפועל?',arrow:'↓'}
};
export const topics:Record<Topic,{label:string;statement:string}> = {
 problem:{label:'בעיה',statement:'היא לא ענתה להודעה שלי. זה אומר שלא אכפת לה ממני, אז הפסקתי ליזום.'},
 goal:{label:'מטרה',statement:'אני רוצה קשר שיש בו הדדיות, ולא להיות תמיד היחיד שיוזם.'},
 resource:{label:'משאב',statement:'כשאני מרגיש בטוח, אני יודע להגיד בצורה ישירה מה חשוב לי בקשר.'}
};
/* Author-written simulated client: neither factual diagnosis nor AI-generated response. */
export const missions:Mission[]=[
 {direction:'east',label:'השלכות',coach:'נבדוק את הענף המזרחי: אילו השלכות יש לדפוס הזה?',options:[
  {id:'e1',text:'אם תמשיך להפסיק ליזום, מה לדעתך יקרה לקשר?',good:true,reply:'אני חושש שנדבר פחות ופחות, ובסוף הקשר פשוט ייעלם.',finding:'חושש שהקשר ייעלם אם לא ייזום',feeling:'פחד ועצב',certainty:7},
  {id:'e2',text:'מה יכול להיות המחיר של ההתרחקות בעוד חודש?',good:true,reply:'אהיה בודד יותר, ואולי כבר יהיה קשה לחזור לדבר.',finding:'צופה בדידות והתרחקות',feeling:'בדידות ודאגה',certainty:8},
  {id:'e3',text:'מה בדיוק כתבת לה?',good:false},
  {id:'e4',text:'למה אתה חושב שהיא חייבת לענות?',good:false}
 ]},
 {direction:'west',label:'תקדימים',coach:'עכשיו נבחן מה קדם למסקנה: ניסיון קודם וציפיות.',options:[
  {id:'w1',text:'איזה מקרה בעבר מזכיר לך את השתיקה הזאת?',good:true,reply:'בעבר כתבתי לה והיא חזרה אליי רק אחרי יומיים. זה הזכיר לי קשר קודם שבו רק אני יזמתי.',finding:'ניסיון קודם של מענה מאוחר ויוזמה חד־צדדית',feeling:'פגיעה ועייפות',certainty:9},
  {id:'w2',text:'איזו תגובה ציפית לקבל כשההודעה נשלחה?',good:true,reply:'ציפיתי להודעה קצרה באותו יום. בעיניי זה משהו בסיסי בקשר.',finding:'ציפה למענה באותו יום',feeling:'אכזבה',certainty:9},
  {id:'w3',text:'מה תהיה ההשלכה אם תמשיך כך?',good:false},
  {id:'w4',text:'איך הרגשת בגוף כשפתחת את הטלפון?',good:false}
 ]},
 {direction:'north',label:'מפת העולם',coach:'נעלה לצפון: מה חשוב לאדם ומה נותן למסקנה שלו משמעות?',options:[
  {id:'n1',text:'מה הופך מענה להודעה לסימן כל כך חשוב בעיניך?',good:true,reply:'בשבילי קשר טוב פירושו הדדיות. כשמישהו לא עונה, זה מרגיש כאילו אני לא משמעותי.',finding:'מפרש מענה כסימן לחשיבות והדדיות',feeling:'פגיעות ועצב',certainty:10},
  {id:'n2',text:'מה אתה מנסה לשמור עליו כשאתה מפסיק ליזום?',good:true,reply:'אני מנסה לשמור על הכבוד שלי ולא לחוות דחייה נוספת, למרות שאני רוצה קרבה.',finding:'ההימנעות נועדה להגן מדחייה',feeling:'הקלה מהולה בגעגוע',certainty:9},
  {id:'n3',text:'מתי בדיוק התקבלה ההודעה האחרונה שלה?',good:false},
  {id:'n4',text:'איך היחסים ייראו בעוד שנה?',good:false}
 ]},
 {direction:'south',label:'דוגמאות ועובדות',coach:'נרד לדרום: נקבל תיאור ספציפי, כמו צילום וידאו, בלי לפרש.',options:[
  {id:'s1',text:'מה בדיוק כתבת, ומתי, ומה הייתה התגובה?',good:true,reply:'אתמול בערב כתבתי: "רוצה להיפגש השבוע?" מאז אין תגובה. לא שלחתי עוד.',finding:'נשלחה אתמול הודעה אחת ללא מענה',feeling:'כיווץ בבטן ודריכות',certainty:10},
  {id:'s2',text:'תוכל לתת דוגמה קונקרטית אחרת למפגש שלכם?',good:true,reply:'לפני שבועיים נפגשנו, צחקנו ודיברנו הרבה. הרגשתי שהיא שמחה לראות אותי.',finding:'במפגש קודם הייתה קרבה ושיחה נעימה',feeling:'שמחה ובלבול',certainty:9},
  {id:'s3',text:'מה לדעתך צריך להיות בקשר טוב?',good:false},
  {id:'s4',text:'מה אתה מפחד שיקרה בעתיד?',good:false}
 ]}
];
export const challenges:Option[]=[
 {id:'c1',good:true,text:'מה בדיוק באי־המענה מוכיח שלא אכפת לה?',reply:'אני לא באמת יודע מה הסיבה. חיברתי בין השתיקה לבין חוסר אכפתיות.',finding:'מבחין בין העובדה לפרשנות'},
 {id:'c2',good:true,text:'היו מקרים שבהם לא ענו מיד ובכל זאת היה אכפת?',reply:'כן, אפילו אני לפעמים עונה מאוחר לאנשים חשובים. לא חשבתי על זה ככה.',finding:'מזהה יוצאים מן הכלל'},
 {id:'c3',good:false,text:'אתה לא חושב שאתה מגזים לגמרי?'},
 {id:'c4',good:false,text:'באיזו שעה בדיוק שלחת את ההודעה?'}
];
export const feelingPrompts=['מה אתה מרגיש ביחס למה שתיארת?','איזה רגש עולה בך עכשיו ביחס לזה?','איך אתה חווה את הדבר הזה מבפנים?'];
export const certaintyPrompts=['מאחד עד עשר, עד כמה אתה עומד מאחורי זה?','כמה זה נכון מבחינתך, בסולם של 1 עד 10?','עד כמה אתה משוכנע בטענה הזאת כרגע?'];
export const coachPraise=['מצוין. השאלה חושפת עוד מידע במפה.','נכון. זה כיוון טוב, ויש עוד שאלות טובות אפשריות.','יפה. לכל אחת משתי השאלות המתאימות יש ניואנס אחר.'];
export function shuffle<T>(array:readonly T[]):T[]{const a=[...array];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function band(n:number|null){return n===null?'unknown':n>=8?'high':n>=5?'medium':'low';}
