import { useMemo, useState } from 'react';
import { analyzeThought } from './cbtEngine';

const BELIEF_TYPES = [
  { id: 'cause', label: 'סיבה', cue: /כי|בגלל|גורם/ },
  { id: 'meaning', label: 'משמעות', cue: /זה אומר|סימן/ },
  { id: 'identity', label: 'זהות', cue: /אני כזה|אני פשוט|אני אדם/ },
  { id: 'capability', label: 'יכולת', cue: /לא מסוגל|אין לי יכולת/ },
  { id: 'belonging', label: 'שייכות', cue: /לא ירצו|דחייה|שייכ/ },
  { id: 'safety', label: 'ביטחון', cue: /סכנה|אסון|שליטה/ },
  { id: 'worth', label: 'ערך עצמי', cue: /לא שווה|כישלון/ },
  { id: 'morality', label: 'מוסר', cue: /רע|אסור|לא בסדר/ },
  { id: 'control', label: 'שליטה', cue: /לשלוט|לא אשלוט/ },
] as const;

function detectBeliefType(text: string) {
  return BELIEF_TYPES.find((type) => type.cue.test(text)) ?? BELIEF_TYPES[0];
}

export function BeliefLens() {
  const [statement, setStatement] = useState('אם שתקתי בפגישה, זה אומר שאני חלש.');
  const analysis = useMemo(() => analyzeThought(statement), [statement]);
  const belief = detectBeliefType(statement);
  const logicalLevel = belief.id === 'identity' ? 'זהות' : belief.id === 'capability' ? 'יכולת' : 'אמונה / ערך';

  return (
    <div className="cbt-two-column">
      <section className="cbt-panel">
        <span className="cbt-kicker">עדשת אמונה</span>
        <h3>מפרידים בין מה קרה, מה זה אומר, ומי אני בתוך זה.</h3>
        <label htmlFor="belief-statement">משפט אמונה</label>
        <textarea id="belief-statement" value={statement} onChange={(e) => setStatement(e.target.value)} rows={4} />
        <div className="cbt-belief-type">
          <small>סוג אמונה משוער</small>
          <strong>{belief.label}</strong>
          <span>רמה לוגית: {logicalLevel}</span>
        </div>
      </section>
      <section className="cbt-panel">
        <h3>שאלות לפי העדשה</h3>
        <article className="cbt-mini-card">
          <strong>CBT</strong>
          <p>איזו ראיה תומכת בזה, ואיזו ראיה מסבכת את זה?</p>
        </article>
        <article className="cbt-mini-card">
          <strong>Meta Model</strong>
          <p>{analysis.generatedQuestions[0] ?? 'מה בדיוק נאמר או קרה?'}</p>
        </article>
        <article className="cbt-mini-card">
          <strong>אזהרת רמה</strong>
          <p>
            {logicalLevel === 'זהות'
              ? 'זה נשמע כמו משפט ברמת זהות. לא כדאי לפתור אותו רק בעצת פעולה; קודם נפריד בין מה עשיתי לבין מי אני.'
              : 'אפשר להתחיל בבדיקת מידע חסר ובניסוי התנהגותי קטן.'}
          </p>
        </article>
      </section>
    </div>
  );
}
