import { useState } from 'react';
import {
  analyseHiddenBeliefs, safetyRequiresReferral,
  HIDDEN_BELIEF_TYPES, type BeliefHypothesis, type HypothesisReview,
} from './hiddenBeliefEngine';
import './hiddenBelief.css';

type Mode = 'transcript' | 'training';
const DEMO_LINES = [
  "My father calls every night and criticizes how I raise my kids.",
  "After the call I shout at the kids and hate myself.",
  "I think I'm an okay father. Most days.",
  "When Abba says something, it's like what I think stops counting. As if his voice is the real one.",
  "Just once I wish he'd see me.",
];
const MOSES_EXAMPLE = DEMO_LINES.join('\n');

export function HiddenBeliefXrayPage() {
  const [mode, setMode] = useState<Mode>('transcript');
  const [text, setText] = useState('');
  const [nonverbal, setNonverbal] = useState('');
  const [question, setQuestion] = useState('');
  const [intuition, setIntuition] = useState('');
  const [findings, setFindings] = useState<BeliefHypothesis[]>([]);
  const [reviews, setReviews] = useState<Record<number, HypothesisReview>>({});
  const [analysed, setAnalysed] = useState(false);
  const [showRows, setShowRows] = useState(false);
  const [example, setExample] = useState(false);
  const risky = safetyRequiresReferral(text);
  const canAnalyse = text.trim().length > 15 && !risky;

  const clear = () => {
    setText(''); setNonverbal(''); setQuestion(''); setIntuition('');
    setFindings([]); setReviews({}); setAnalysed(false); setExample(false);
  };
  const run = () => {
    if (!canAnalyse) return;
    const hypotheses = analyseHiddenBeliefs({ text, nonverbal });
    setFindings(hypotheses); setReviews({}); setAnalysed(true);
  };
  const loadDemo = () => {
    setText(MOSES_EXAMPLE); setNonverbal(''); setQuestion('');
    setIntuition('הרגשתי שלביקורת של אבא יש משמעות גדולה במיוחד.');
    setAnalysed(false); setFindings([]); setReviews({}); setExample(true);
  };

  return (
    <main className="hbx-page" dir="rtl">
      <header className="hbx-heading">
        <span className="hbx-eyebrow">מעבדת מטה־מודל · השערות על קשרים בין משפטים</span>
        <h2>רנטגן אמונות נסתרות</h2>
        <p>לפעמים שני משפטים נראים סותרים. ננסה לנסח את המשמעות שאולי מקשרת ביניהם, ואז לבדוק אותה עם האדם, לא לקבוע אותה במקומו.</p>
      </header>

      <div className="hbx-mode" role="group" aria-label="בחירת מצב אימון">
        <button type="button" aria-pressed={mode === 'transcript'} className={mode === 'transcript' ? 'active' : ''} onClick={() => { setMode('transcript'); setAnalysed(false); }}>🔍 חקר טקסט</button>
        <button type="button" aria-pressed={mode === 'training'} className={mode === 'training' ? 'active' : ''} onClick={() => { setMode('training'); setAnalysed(false); }}>🧠 אימון מטפל</button>
      </div>

      <section className="hbx-entry" aria-label="חומר האימון">
        <div className="hbx-entry-head">
          <strong>{mode === 'training' ? 'מה נאמר בשיחה?' : 'מה האדם אמר?'}</strong>
          <div className="hbx-controls">
            <button type="button" className="hbx-link" onClick={loadDemo}>נסה מקרה לדוגמה</button>
            <button type="button" className="hbx-link" onClick={clear}>נקה הכול</button>
          </div>
        </div>
        <label htmlFor="hbx-transcript" className="hbx-small">הדבק כמה משפטים. רצוי משפט אחד בכל שורה. ללא שמות ופרטים מזהים.</label>
        <textarea id="hbx-transcript" rows={7} maxLength={14000} value={text} onChange={e => {setText(e.target.value);setAnalysed(false);setExample(false);}} placeholder={'לדוגמה:\nאני חושב שאני בסדר.\nאבל כשאבא מבקר אותי אני מתפרץ.'} />
        <details className="hbx-details">
          <summary>+ תצפית גופנית, אם נמסרה</summary>
          <label htmlFor="hbx-nonverbal">מה האדם דיווח או מה נצפה? לא להסיק מכך אבחנה.</label>
          <textarea id="hbx-nonverbal" value={nonverbal} rows={2} onChange={e => setNonverbal(e.target.value)} placeholder="למשל: סיפר שהכתפיים התכווצו" />
        </details>
        {mode === 'training' && <div className="hbx-training">
          <label htmlFor="hbx-question">מה שאלת?</label>
          <input id="hbx-question" value={question} onChange={e=>setQuestion(e.target.value)} placeholder="השאלה ששאלתי היתה..." />
          <label htmlFor="hbx-intuition">למה שאלת דווקא את זה?</label>
          <input id="hbx-intuition" value={intuition} onChange={e=>setIntuition(e.target.value)} placeholder="הרגשתי שיש כאן משהו..." />
          <p>אחרי הניתוח השווה את השאלה שלך להשערה. ההתאמה אינה נבדקת אוטומטית.</p>
        </div>}
        {risky && <div role="alert" className="hbx-alert">הטקסט עשוי לתאר סיכון לפגיעה. הכלי עוצר כאן: יש לברר את הבטיחות בעזרת איש מקצוע מוסמך, ובסכנה מיידית לפנות לשירותי החירום המקומיים.</div>}
        <div className="hbx-privacy">🔒 הטקסט נבדק מקומית בדפדפן. אינו נשלח למודל שפה, אינו נרשם ואינו נשמר. בניקוי או ברענון הוא נמחק.</div>
        <button type="button" className="hbx-primary" disabled={!canAnalyse} onClick={run}>גלה השערות אפשריות</button>
      </section>

      {analysed && <section className="hbx-results" aria-live="polite">
        <div className="hbx-results-heading">
          <div><span className="hbx-eyebrow">בדיקה לשונית מקומית, לא קריאת מחשבות</span><h3>{findings.length ? `${findings.length} השערות לבדיקה` : 'לא זוהה קשר ברור'}</h3></div>
          <button className="hbx-link" type="button" onClick={() => setShowRows(v=>!v)}>{showRows?'הסתר מיפוי':'מיפוי לתבניות ברין'}</button>
        </div>
        {!findings.length && <p className="hbx-empty">לא נמצאו סימנים מספיקים לפי הכללים המצומצמים של הכלי. זה לא אומר שאין משמעות נסתרת. אפשר להוסיף תיאור של האירוע, הפרשנות והתגובה, או לבחור דוגמה.</p>}
        {findings.map((finding,index) => {
          const review = reviews[index] ?? 'hypothesis';
          return <article className="hbx-card" key={index}>
            <div className="hbx-card-top"><span className="hbx-pill">השערה בלבד</span><span className="hbx-tag">{HIDDEN_BELIEF_TYPES[finding.type]}</span></div>
            <h4>{finding.hidden_belief}</h4>
            <div className="hbx-equation"><small>הקשר שעשוי להסביר</small><p>{finding.missing_link_sentence}</p></div>
            <details className="hbx-details">
              <summary>על סמך מה?</summary>
              {finding.evidence.map((ev,i)=><blockquote key={i} dir="auto">{ev.quote}</blockquote>)}
              <p>{finding.confidence_reason}</p>
            </details>
            <div className="hbx-next"><small>שאלה אחת לבירור</small><strong>{finding.question_to_surface_it}</strong></div>
            <p className="hbx-body-prompt">🫁 {finding.body_check_prompt}</p>
            {showRows && <p className="hbx-row-note">{finding.breen_row === null ? 'שורת ברין: לא משויכת' : `שורת ברין (מיפוי זמני לבדיקה): ${finding.breen_row}`}</p>}
            <div className="hbx-review"><span>אחרי בירור עם האדם:</span>
              {([['confirmed','מתאים'],['rejected','לא מתאים'],['unsure','לא בטוח']] as const).map(([value,label])=>
                <button key={value} type="button" aria-pressed={review===value} onClick={()=>setReviews(prev=>({...prev,[index]:value}))}>{label}</button>)}
            </div>
            {review !== 'hypothesis' && <p className="hbx-review-note">{review==='confirmed'?'סומן כמתאים לפי בירור המשתמש, לא כאבחנה.':review==='rejected'?'ההשערה נדחתה. כדאי לחפש אפשרות אחרת.':'נותר סימן שאלה; אין צורך להכריע.'}</p>}
          </article>;
        })}
        {mode === 'training' && findings.length > 0 && <aside className="hbx-reflection">
          <strong>החשיבה שלך כמטפל</strong>
          <p><b>השאלה:</b> {question.trim() || 'לא הוזנה שאלה'}</p>
          <p><b>האינטואיציה:</b> {intuition.trim() || 'לא הוזן הסבר'}</p>
          <p>בדוק אם השאלה שלך חקרה את הקשר המוצע, עקפה אותו או הקדימה את התזמון. אין כאן שיפוט אוטומטי של איכות השאלה.</p>
        </aside>}
        {!example && <p className="hbx-small">הכלי מזהה רק סימנים לשוניים מוגדרים. הוא עשוי להחמיץ קשרים, ואינו יודע מה האדם באמת מאמין.</p>}
      </section>}
      <footer className="hbx-disclaimer">מיועד ללמידה ולהדרכה, לא לאבחון, לטיפול אוטומטי או להסיק אמונות על אנשים ללא אימות עמם. שמות הקטגוריות ומיפוי שורות ברין עדיין טעונים אישור של בעל הפרויקט.</footer>
    </main>
  );
}
