import { useState } from 'react';
import { XP_REWARDS } from '../../store/progress';

export function ActivationBuilder({ onAward }: { onAward: (amount: number) => void }) {
  const [smallestAction, setSmallestAction] = useState('לפתוח מסמך לחמש דקות');
  const [durationMinutes, setDurationMinutes] = useState(5);
  const [completed, setCompleted] = useState(false);

  const complete = () => {
    setCompleted(true);
    onAward(XP_REWARDS.activationActionCompleted);
  };

  return (
    <div className="cbt-two-column">
      <section className="cbt-panel">
        <span className="cbt-kicker">פעולה קטנה לפני שמגיע החשק</span>
        <h3>לפעמים תנועה קטנה מזמינה מוטיבציה.</h3>
        <label htmlFor="activation-action">הפעולה הכי קטנה שמחזירה תנועה</label>
        <input id="activation-action" value={smallestAction} onChange={(e) => setSmallestAction(e.target.value)} />
        <label htmlFor="activation-duration">כמה דקות? {durationMinutes}</label>
        <input id="activation-duration" type="range" min={2} max={20} value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} />
        <button type="button" className="btn btn-primary" onClick={complete}>
          סימנתי פעולה קטנה
        </button>
        {completed && <p className="xp-pop">+{XP_REWARDS.activationActionCompleted} XP</p>}
      </section>
      <section className="cbt-panel">
        <h3>כרטיס פעולה</h3>
        <p>
          היום למשך {durationMinutes} דקות: {smallestAction}.
        </p>
        <p className="muted">לא מודדים אופי. מודדים תנועה קטנה שחוזרת.</p>
      </section>
    </div>
  );
}
