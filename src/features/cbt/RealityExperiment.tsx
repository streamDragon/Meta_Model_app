import { useMemo, useState } from 'react';
import { XP_REWARDS } from '../../store/progress';
import { analyzeThought } from './cbtEngine';
import { detectHighRiskExposure, getSafetyMessageHe } from './cbtSafety';
import { saveCbtSession } from './cbtStorage';

export function RealityExperiment({ onAward, onSaved }: { onAward: (amount: number) => void; onSaved: () => void }) {
  const [prediction, setPrediction] = useState('אם אגיד לא, יכעסו עליי.');
  const [beliefStrengthBefore, setBeliefStrengthBefore] = useState(70);
  const [experimentAction, setExperimentAction] = useState('להגיד: אני צריך לבדוק ואחזור אליך.');
  const [smallestVersion, setSmallestVersion] = useState('פעם אחת, מול אדם בטוח יחסית.');
  const [saved, setSaved] = useState(false);
  const analysis = useMemo(() => analyzeThought(prediction), [prediction]);
  const highRisk = detectHighRiskExposure(`${prediction} ${experimentAction}`);

  const save = () => {
    if (highRisk) return;
    const timestamp = new Date().toISOString();
    saveCbtSession({
      kind: 'reality-experiment',
      sessionId: `reality-${Date.now()}`,
      title: 'ניסוי מציאות',
      prediction,
      beliefStrengthBefore,
      experimentAction,
      smallestVersion,
      safetyBehaviors: [],
      observationsPlanned: ['מה קרה בפועל', 'מה עשיתי', 'מה למדתי'],
      riskLevel: 'low',
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    setSaved(true);
    onAward(XP_REWARDS.realityExperimentPlanned);
    onSaved();
  };

  return (
    <div className="cbt-two-column">
      <section className="cbt-panel">
        <span className="cbt-kicker">בדיקת מפה בשטח</span>
        <h3>ניבוי הופך לניסוי קטן, בטוח ומדיד.</h3>
        <label htmlFor="experiment-prediction">ניבוי</label>
        <textarea id="experiment-prediction" value={prediction} onChange={(e) => setPrediction(e.target.value)} rows={3} />
        <label htmlFor="experiment-strength">עוצמת אמונה לפני {beliefStrengthBefore}</label>
        <input id="experiment-strength" type="range" min={0} max={100} value={beliefStrengthBefore} onChange={(e) => setBeliefStrengthBefore(Number(e.target.value))} />
        <label htmlFor="experiment-action">פעולת ניסוי</label>
        <textarea id="experiment-action" value={experimentAction} onChange={(e) => setExperimentAction(e.target.value)} rows={2} />
        <label htmlFor="experiment-smallest">הגרסה הכי קטנה</label>
        <input id="experiment-smallest" value={smallestVersion} onChange={(e) => setSmallestVersion(e.target.value)} />
        <button type="button" className="btn btn-primary" disabled={highRisk} onClick={save}>
          תכנן ניסוי מציאות
        </button>
        {saved && <p className="xp-pop">+{XP_REWARDS.realityExperimentPlanned} XP</p>}
      </section>
      <section className="cbt-panel">
        {highRisk ? (
          <div className="cbt-safety-note">{getSafetyMessageHe()}</div>
        ) : (
          <>
            <h3>מה לצפות</h3>
            <p>{analysis.experimentSuggestion ?? 'בחר פעולה אחת, זמן קצר ותצפית אחת ברורה.'}</p>
            <ul>
              <li>מה קרה בפועל?</li>
              <li>מה עשיתי במקום safety behavior?</li>
              <li>מה למדתי על המפה?</li>
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
