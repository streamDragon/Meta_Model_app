import { useRef, useState } from 'react';
import { XP_REWARDS } from '../../store/progress';
import { detectHighRiskExposure, detectPotentialCrisis, getSafetyMessageHe } from './cbtSafety';
import { loadCbtSessions, saveCbtSession } from './cbtStorage';
import type { CbtStoredSession } from '../../types/cbt';
type Experiment = Extract<CbtStoredSession, { kind: 'reality-experiment' }>;
export function RealityExperiment({ onAward, onSaved, initialPrediction = '' }: { onAward: (amount: number) => void; onSaved: () => void; initialPrediction?: string }) {
  const [prediction, setPrediction] = useState(initialPrediction);
  const [strength, setStrength] = useState(70);
  const [action, setAction] = useState('');
  const [observation, setObservation] = useState('');
  const [whenWhere, setWhenWhere] = useState('');
  const [plan, setPlan] = useState<Experiment | null>(null);
  const [result, setResult] = useState('');
  const [learning, setLearning] = useState('');
  const [after, setAfter] = useState(70);
  const [history, setHistory] = useState(() => loadCbtSessions().filter((s): s is Experiment => s.kind === 'reality-experiment'));
  const [recorded, setRecorded] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const planning = useRef(false);
  const highRisk = detectHighRiskExposure(`${prediction} ${action}`) || detectPotentialCrisis(`${prediction} ${action}`);
  const canPlan = !!prediction.trim() && !!action.trim() && !!observation.trim() && !!whenWhere.trim() && !highRisk;
  const refresh = () => setHistory(loadCbtSessions().filter((s): s is Experiment => s.kind === 'reality-experiment'));
  const savePlan = () => {
    if (!canPlan || plan || planning.current) return;
    planning.current = true;
    const now = new Date().toISOString();
    const value: Experiment = { kind: 'reality-experiment', sessionId: crypto.randomUUID(), title: 'ניסוי מציאות', prediction: prediction.trim(), beliefStrengthBefore: strength, experimentAction: action.trim(), smallestVersion: action.trim(), whenWhere: whenWhere.trim(), observationsPlanned: [observation.trim()], safetyBehaviors: [], createdAt: now, updatedAt: now };
    saveCbtSession(value); setPlan(value); refresh(); onAward(XP_REWARDS.realityExperimentPlanned); setAwarded(true); onSaved();
  };
  const resume = (s: Experiment) => { setPlan(s); setResult(s.result ?? ''); setLearning(s.learning ?? ''); setAfter(s.beliefStrengthAfter ?? s.beliefStrengthBefore ?? 70); setRecorded(!!s.result); setAwarded(false); planning.current = true; };
  const reset = () => { setPlan(null); setPrediction(''); setAction(''); setObservation(''); setWhenWhere(''); setResult(''); setLearning(''); setRecorded(false); setAwarded(false); setStrength(70); setAfter(70); planning.current = false; };
  return <div className="cbt-two-column">
    <section className="cbt-panel">
      <h3>{plan ? 'מה קרה כשניסית?' : 'בודקים ניבוי אחד בעזרת פעולה קטנה'}</h3>
      {!plan ? <>
        <p className="muted">בחר פעולה יומיומית שמתאימה לתנאים שלך, ומה בדיוק תוכל לראות או לשמוע בעקבותיה. התכנון נשמר בדפדפן הזה.</p>
        <label htmlFor="experiment-prediction">מה אתה מצפה שיקרה?</label><textarea id="experiment-prediction" value={prediction} onChange={(e) => setPrediction(e.target.value)} rows={3} />
        <label htmlFor="experiment-strength">עד כמה אתה מאמין בניבוי? {strength}/100</label><input id="experiment-strength" type="range" min={0} max={100} value={strength} onChange={(e) => setStrength(Number(e.target.value))} />
        <label htmlFor="experiment-action">מה הפעולה הקטנה שתנסה?</label><textarea id="experiment-action" value={action} onChange={(e) => setAction(e.target.value)} rows={2} />
        <label htmlFor="experiment-when">מתי ואיפה?</label><input id="experiment-when" value={whenWhere} onChange={(e) => setWhenWhere(e.target.value)} />
        <label htmlFor="experiment-observation">מה תבדוק בפועל?</label><input id="experiment-observation" value={observation} onChange={(e) => setObservation(e.target.value)} placeholder="תצפית שאפשר לתאר, למשל מה נאמר בתגובה" />
        <button className="btn btn-primary" disabled={!canPlan} onClick={savePlan}>שמור תוכנית לניסוי</button>
        {highRisk && <p className="cbt-safety-note">{getSafetyMessageHe()}</p>}
      </> : <>
        <blockquote>{plan.prediction}</blockquote><p><strong>הפעולה:</strong> {plan.experimentAction}</p><p><strong>מועד והקשר:</strong> {plan.whenWhere || 'לא נקבע בתוכנית הישנה'}</p><p><strong>מה תבדוק:</strong> {plan.observationsPlanned?.join(' · ')}</p>
        <label htmlFor="experiment-result">מה ראית או שמעת בפועל?</label><textarea id="experiment-result" value={result} onChange={(e) => { setResult(e.target.value); setRecorded(false); }} rows={3} />
        <label htmlFor="experiment-learning">מה למדת, ומה עדיין לא ברור?</label><textarea id="experiment-learning" value={learning} onChange={(e) => { setLearning(e.target.value); setRecorded(false); }} rows={2} />
        <label htmlFor="experiment-after">עד כמה אתה מאמין בניבוי עכשיו? {after}/100</label><input id="experiment-after" type="range" min={0} max={100} value={after} onChange={(e) => { setAfter(Number(e.target.value)); setRecorded(false); }} />
        <button className="btn btn-primary" disabled={!result.trim() || !learning.trim() || recorded} onClick={() => { if (!plan || !result.trim() || !learning.trim()) return; const value = { ...plan, result: result.trim(), learning: learning.trim(), beliefStrengthAfter: after, updatedAt: new Date().toISOString() }; saveCbtSession(value); setPlan(value); setRecorded(true); refresh(); }}>שמור תוצאה ולמידה</button>
        {recorded && <p role="status">התוצאה עודכנה באותו ניסוי. גם אישוש, תוצאה מעורבת או חוסר מידע הם ממצאים תקפים; אין צורך להוריד את עוצמת האמונה.</p>}
        {awarded && <p className="muted">נוספו {XP_REWARDS.realityExperimentPlanned} נקודות על השלמת התכנון. התוצאה היא דיווח עצמי.</p>}
        <button className="btn btn-secondary" onClick={reset}>ניסוי חדש</button>
      </>}
    </section>
    <aside className="cbt-panel"><h3>תכנון ובדיקה חוזרת</h3><p>מפרידים בין מה שקרה לבין מה שפירשת. ניסיון אחד נותן מידע על מצב מסוים; הוא לא מכריע בכל ההקשרים.</p><details><summary>ניסויים שמורים ({history.length})</summary>{history.map((s) => <button className="card learning-tool" key={s.sessionId} onClick={() => resume(s)}><strong>{s.prediction || 'ניסוי שמור'}</strong><span>{s.result ? 'תוצאה נרשמה' : 'ממתין לבדיקה'} · {new Date(s.updatedAt).toLocaleDateString('he-IL')}</span></button>)}</details></aside>
  </div>;
}
