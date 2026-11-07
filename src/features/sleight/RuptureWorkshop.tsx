import { useState } from 'react';

type ScenarioId = 'attack' | 'stuck' | 'withdrawal' | 'overjoin' | 'overload';
type Option = { title: string; line: string; response: string; feedback: string; suitable: boolean };
type Scenario = { label: string; person: string; explanation: string; options: readonly Option[] };

const SCENARIOS: Record<ScenarioId, Scenario> = {
  attack: {
    label: 'אתה מתקיף אותי',
    person: 'די, אני מרגיש שאתה רק מנסה להוכיח שאני טועה. אני כבר לא רוצה לענות.',
    explanation: 'עימות גלוי: האדם מסמן שהדרך שבה מאתגרים אותו פוגעת בקשר.',
    options: [
      { title: 'להכיר בקרע', line: 'אני רואה שהשאלות שלי הרגישו כמו התקפה. בוא נדבר רגע על מה שקרה בינינו.', response: 'כן. חשבתי שאתה מחפש איך לתפוס אותי.', feedback: 'מעבר מהתווכחות על הטענה לבירור התהליך יכול לפתוח אפשרות לתיקון.', suitable: true },
      { title: 'לקחת אחריות', line: 'נראה שהתקדמתי מהר מדי. לא בדקתי איתך אם רמת האתגור הזאת מתאימה.', response: 'טוב שאתה שם לב לזה. זה היה יותר מדי בשבילי.', feedback: 'אחריות על הקצב אינה מחייבת להסכים עם כל טענה של האדם.', suitable: true },
      { title: 'להחזיר לו באותו מטבע', line: 'אבל גם אתה מתקיף אותי עכשיו, אז אולי תראה שאתה עושה בדיוק אותו דבר?', response: 'אתה שוב מתווכח איתי. אני מסיים כאן.', feedback: 'החלה עצמית בשיא קרע עלולה להיחוות כהתקפה נוספת.', suitable: false },
    ],
  },
  stuck: {
    label: 'זה לא מקדם אותי',
    person: 'כל הזמן אותן שאלות. מה בעצם יצא לי מכל זה?',
    explanation: 'אי־הסכמה על המשימה או על מטרת השיחה אינה בהכרח התנגדות לשינוי.',
    options: [
      { title: 'לברר את מטרת המפגש', line: 'יכול להיות שאיבדנו את המטרה שלך. מה ייחשב בעיניך התקדמות מועילה היום?', response: 'אני רוצה לדעת מה להגיד לחתן שלי בפעם הבאה.', feedback: 'חוזרים להגדרת תוצאה משותפת במקום להוסיף עוד שאלות מאותו סוג.', suitable: true },
      { title: 'להציע שינוי דרך', line: 'אני חושב שנשארנו יותר מדי בבירור. מתאים לך לעבור לתרגול שיחה מעשי?', response: 'כן, בדיוק. לא רציתי עוד ניתוח.', feedback: 'הובלה אחרי הצטרפות כוללת רשות ותיאום מטרה.', suitable: true },
      { title: 'לייחס את הביקורת להגנה', line: 'זה שאתה אומר שאין התקדמות מוכיח שאתה מפחד באמת להשתנות.', response: 'אני מנסה להסביר לך משהו ואתה לא מקשיב.', feedback: 'לא נכון לפרש ביקורת תקפה על התהליך כהוכחה להגנות של האדם.', suitable: false },
    ],
  },
  withdrawal: {
    label: 'הוא נסגר ומסכים',
    person: 'טוב, אתה צודק. מה שתגיד.',
    explanation: 'נסיגה או הסכמה מרצה: שקט והסכמה אינם ראיה לשינוי אמונה.',
    options: [
      { title: 'לבדוק מה קורה', line: 'אני שם לב שהשיחה נעשתה קצרה מאוד. אולי פספסתי משהו? איך זה מרגיש לך?', response: 'התעייפתי. הרגשתי שכל תשובה שלי נפסלת.', feedback: 'שאלה פתוחה יכולה לגלות קרע שלא היה נשמע ככעס.', suitable: true },
      { title: 'לתת רשות לא להסכים', line: 'אתה ממש לא צריך להסכים איתי. אפשר לעצור או לומר מה לא היה נכון עבורך.', response: 'טוב לשמוע. אני עדיין חושב שיש באיחור חוסר כבוד.', feedback: 'השבת חופש הבחירה חשובה יותר מהצגת ניצחון בוויכוח.', suitable: true },
      { title: 'לסגור כהצלחה', line: 'נהדר, סוף סוף הבנת! בוא נסיים כאן.', response: 'בסדר.', feedback: 'הסכמה שטחית עלולה להסתיר התרחקות במקום תובנה.', suitable: false },
    ],
  },
  overjoin: {
    label: 'אתה רק חוזר עליי',
    person: 'כל הזמן אתה מסכים איתי. לא באתי רק כדי לשמוע שוב את מה שאני כבר יודע.',
    explanation: 'הצטרפות מוגזמת: הקשבה משקפת אינה תחליף לתנועה כשהאדם מבקש כיוון חדש.',
    options: [
      { title: 'להכיר בתקיעות', line: 'נכון, שיקפתי הרבה אבל כמעט לא הצעתי משהו חדש. בוא ננסה לשנות כיוון.', response: 'בדיוק. רציתי שתביא גם את החשיבה שלך.', feedback: 'אפשר לתקן חוסר התקדמות בלי לבטל את החשיבות של תיקוף קודם.', suitable: true },
      { title: 'לתאם את רמת האתגור', line: 'מתאים לך שאאתגר עכשיו את ההנחה שלך קצת יותר, או שנעבור לפתרון מעשי?', response: 'תאתגר, אבל תישאר מדויק.', feedback: 'הובלה מותאמת מתחילה בהסכמה מפורשת על האופן שבו ממשיכים.', suitable: true },
      { title: 'לתקף שוב', line: 'אני שומע אותך, וזו באמת הרגשה קשה מאוד.', response: 'הנה, שוב אותו דבר בדיוק.', feedback: 'גם תיקוף יכול להפוך לבלתי מועיל אם הוא מתעלם מבקשת האדם.', suitable: false },
    ],
  },
  overload: {
    label: 'הוא מוצף',
    person: 'אני לא מצליח לחשוב עכשיו. כל זה יותר מדי בשבילי.',
    explanation: 'עומס רגשי או קוגניטיבי דורש עצירה, התאמה לקצב ובדיקה של יכולת ההמשך.',
    options: [
      { title: 'להציע הפסקה', line: 'נעצור את השאלות. נוכל לשבת רגע בשקט או לסיים להיום, מה עדיף לך?', response: 'עדיף לי לעצור עכשיו ולחזור לזה בפעם אחרת.', feedback: 'הפסקה היא בחירה לגיטימית; לא מזרזים פתרון כשיש הצפה.', suitable: true },
      { title: 'לתת מקום לחוויה', line: 'זה הרבה כרגע. אין צורך לפתור את זה עכשיו ואפשר להחליט יחד מה מתאים.', response: 'תודה. הייתי צריך רגע בלי לחץ.', feedback: 'תיקוף והחזרת בחירה יכולים להפחית עומס.', suitable: true },
      { title: 'להמשיך עוד קצת', line: 'דווקא עכשיו אנחנו מתקרבים לפריצת דרך. רק עוד שאלה אחת.', response: 'ביקשתי לעצור. אני הולך.', feedback: 'אסור להפוך את ההצפה להצדקה ללחוץ יותר.', suitable: false },
    ],
  },
};

export function RuptureWorkshop({ onReturn, onStop }: { onReturn: () => void; onStop: () => void }) {
  const [scenarioId, setScenarioId] = useState<ScenarioId>('attack');
  const [choiceIndex, setChoiceIndex] = useState<number | null>(null);
  const [check, setCheck] = useState<'continue' | 'pause' | 'stop' | null>(null);
  const scenario = SCENARIOS[scenarioId];
  const option = choiceIndex === null ? null : scenario.options[choiceIndex];

  return <div className="som-scrim">
    <section className="som-rupture som-workshop som-rupture-full" role="dialog" aria-modal="true" aria-label="סדנת פיצוצים והתנגדויות">
      <div className="som-workshop-header">
        <div><small>סדנת פיצוצים והתנגדויות · אימון עצמאי</small><h2>כשהשיחה נשברת, מה תעשה?</h2></div>
        <button className="btn btn-secondary" type="button" onClick={onReturn}>חזרה</button>
      </div>
      <p>לפני שמשנים עוד אמונה בודקים אם הקושי הוא בטענה, במשימה או בקשר.</p>
      <div className="som-rupture-case-tabs" role="group" aria-label="סוג ההתנגדות">
        {(Object.keys(SCENARIOS) as ScenarioId[]).map(id =>
          <button key={id} type="button" aria-pressed={scenarioId === id} onClick={() => { setScenarioId(id); setChoiceIndex(null); setCheck(null); }}>{SCENARIOS[id].label}</button>
        )}
      </div>
      <div className="som-rupture-speech"><small>האדם אומר</small><blockquote>{scenario.person}</blockquote></div>
      <p>{scenario.explanation}</p>
      <h3>בחר איך תגיב</h3>
      <div className="som-rupture-options">
        {scenario.options.map((item, i) =>
          <button type="button" key={item.title} disabled={choiceIndex !== null} onClick={() => { setChoiceIndex(i); setCheck(null); }}>
            <strong>{item.title}</strong><span>״{item.line}״</span>
          </button>
        )}
      </div>
      {option && <div className="som-rupture-result" role="status">
        <strong>{option.suitable ? 'אפשרות מתאימה לתיקון התהליך' : 'התגובה עלולה להחריף את ההתנגדות'}</strong>
        <p>{option.feedback}</p>
        <div className="som-rupture-speech"><small>התגובה המדומה</small><blockquote>{option.response}</blockquote></div>
        <h3>מה נכון עכשיו?</h3>
        <div className="som-rupture-actions">
          <button className="btn btn-secondary" type="button" onClick={() => setCheck('continue')}>לבדוק אם מתאים להמשיך</button>
          <button className="btn btn-secondary" type="button" onClick={() => setCheck('pause')}>להציע הפסקה</button>
          <button className="btn btn-secondary" type="button" onClick={() => setCheck('stop')}>לסיים את השיחה</button>
        </div>
        {check && <div className="som-rupture-check">
          <p>{check === 'continue'
            ? '״האם מתאים לך שנמשיך יחד, או שאתה מעדיף דרך אחרת?״ לא מניחים אוטומטית שהקשר תוקן.'
            : check === 'pause'
              ? '״אפשר לקחת הפסקה. לא חייבים לפתור עכשיו.״ יש לכבד את התשובה.'
              : '״נוכל לסיים כאן להיום ולבדוק בהמשך איך תרצה להמשיך.״ בשיחה אמיתית צריך לוודא סיום בטוח.'}</p>
          <button className="btn btn-primary" type="button" onClick={check === 'stop' ? onStop : onReturn}>{check === 'stop' ? 'לסיים' : 'חזרה לשיחה'}</button>
        </div>}
        <button className="btn btn-secondary" type="button" onClick={() => { setChoiceIndex(null); setCheck(null); }}>נסה תגובה אחרת</button>
      </div>}
      <p className="som-rupture-smallprint">תרגול דיאלוג עם דמויות בדיוניות; תגובות אינן ניבוי של בני אדם. אפשר לתרגל בחירה בהפסקה או אי־הסכמה, ולא רק שכנוע.</p>
    </section>
  </div>;
}
