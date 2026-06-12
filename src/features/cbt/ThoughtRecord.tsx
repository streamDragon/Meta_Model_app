import { useState } from 'react';
import { analyzeThought } from './cbtEngine';

export function ThoughtRecord() {
  const [fields, setFields] = useState({
    event: '',
    thought: 'הם לא ענו לי, בטח לא רוצים אותי.',
    body: '',
    emotion: '',
    prediction: '',
    evidenceFor: '',
    evidenceAgainst: '',
    widerMap: '',
    experiment: '',
  });
  const analysis = analyzeThought(fields.thought);

  const update = (key: keyof typeof fields, value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="cbt-two-column">
      <section className="cbt-panel">
        <span className="cbt-kicker">יומן מחשבות מטה-מודלי</span>
        <h3>בודקים אם המחשבה צרה מדי, ישנה מדי או חסרה לה חתיכת מידע.</h3>
        <label htmlFor="record-event">מה קרה?</label>
        <input id="record-event" value={fields.event} onChange={(e) => update('event', e.target.value)} />
        <label htmlFor="record-thought">איזה משפט הופיע בראש?</label>
        <textarea id="record-thought" value={fields.thought} onChange={(e) => update('thought', e.target.value)} rows={3} />
        <label htmlFor="record-body">מה הגוף עשה?</label>
        <input id="record-body" value={fields.body} onChange={(e) => update('body', e.target.value)} />
        <label htmlFor="record-emotion">איזה רגש הופיע?</label>
        <input id="record-emotion" value={fields.emotion} onChange={(e) => update('emotion', e.target.value)} />
        <label htmlFor="record-prediction">מה המחשבה ניבאה?</label>
        <input id="record-prediction" value={fields.prediction} onChange={(e) => update('prediction', e.target.value)} />
      </section>

      <section className="cbt-panel">
        <h3>שאלות להרחבת המפה</h3>
        <div className="cbt-chip-group">
          {analysis.metaModelPatterns.map((pattern) => (
            <span className="chip" key={pattern}>
              {pattern.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
        <label htmlFor="record-evidence-for">איזו ראיה תומכת בזה?</label>
        <textarea id="record-evidence-for" value={fields.evidenceFor} onChange={(e) => update('evidenceFor', e.target.value)} rows={2} />
        <label htmlFor="record-evidence-against">איזו ראיה מסבכת את זה?</label>
        <textarea id="record-evidence-against" value={fields.evidenceAgainst} onChange={(e) => update('evidenceAgainst', e.target.value)} rows={2} />
        <label htmlFor="record-wider-map">מהי מפה רחבה יותר?</label>
        <textarea id="record-wider-map" value={fields.widerMap} onChange={(e) => update('widerMap', e.target.value)} rows={2} />
        <label htmlFor="record-experiment">מה ניסוי קטן אחד?</label>
        <textarea id="record-experiment" value={fields.experiment} onChange={(e) => update('experiment', e.target.value)} rows={2} />
      </section>
    </div>
  );
}
