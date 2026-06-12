import { useState } from 'react';
import { HowItWorks } from '../../components/HowItWorks';
import { SurfaceHiddenPrinciple } from '../../components/SurfaceHiddenPrinciple';
import { useIsMobile } from '../../lib/useIsMobile';
import { useProgress } from '../../store/useProgress';
import { getSafetyMessageHe } from './cbtSafety';
import { ThoughtMap } from './ThoughtMap';
import { ThoughtRecord } from './ThoughtRecord';
import { BeliefLens } from './BeliefLens';
import { RealityExperiment } from './RealityExperiment';
import { ActivationBuilder } from './ActivationBuilder';
import { CbtLessonCards } from './CbtLessonCards';
import { CbtPracticeDrills } from './CbtPracticeDrills';

type CbtView =
  | 'thought-map'
  | 'thought-record'
  | 'belief-lens'
  | 'experiment'
  | 'activation'
  | 'lessons'
  | 'drills';

const VIEWS: Array<{ id: CbtView; label: string }> = [
  { id: 'thought-map', label: 'מפת מחשבה' },
  { id: 'thought-record', label: 'יומן מחשבות' },
  { id: 'belief-lens', label: 'עדשת אמונה' },
  { id: 'experiment', label: 'ניסוי מציאות' },
  { id: 'activation', label: 'מחזירים תנועה' },
  { id: 'lessons', label: 'לומדים את המפה' },
  { id: 'drills', label: 'אימון מחשבות' },
];

export function BeliefsRealityLab() {
  const { addXP, recordSession } = useProgress();
  const isMobile = useIsMobile();
  const [view, setView] = useState<CbtView>('thought-map');
  const [savedCount, setSavedCount] = useState(0);

  const award = (amount: number) => {
    addXP(amount);
  };

  const markSavedSession = () => {
    setSavedCount((count) => count + 1);
    recordSession();
  };

  return (
    <div className="card cbt-lab">
      <section className="cbt-hero">
        <div>
          <span className="cbt-kicker">CBT + Meta Model + NLP</span>
          <h2>מעבדת אמונות ומציאות</h2>
          <p>
            פותחים מחשבה למפה, בודקים אמונה בשטח, ומוסיפים בחירה בלי לקרוא
            למחשבה “לא רציונלית” ובלי להפוך את זה לאבחון.
          </p>
        </div>
        <div className="cbt-hero-stats" aria-label="סיכום מעבדה">
          <strong>{savedCount}</strong>
          <span>מפות וניסויים שנשמרו בסשן</span>
        </div>
      </section>

      <div className="feature-brief">
        <span>
          <strong>עיקרון:</strong> מחשבות הן מפות, קיצורי דרך והגנות אפשריות.
        </span>
        <span>
          <strong>גבול בטיחות:</strong> אימון ורפלקציה, לא טיפול, אבחון או מענה חירום.
        </span>
      </div>

      <SurfaceHiddenPrinciple compact />

      <HowItWorks
        title="איך עובדים עם מחשבה?"
        steps={[
          { icon: '🗺️', title: 'פותחים מפה', detail: 'מצב, מחשבה, רגש, גוף ודחף פעולה' },
          { icon: '🔎', title: 'מחזירים מידע', detail: 'מי בדיוק, לפי מה, מה נמחק ומה הוכלל' },
          { icon: '🧪', title: 'בודקים בשטח', detail: 'ניסוי קטן, בטוח ומדיד במקום ויכוח פנימי' },
        ]}
      />

      <div className="cbt-safety-strip">{getSafetyMessageHe()}</div>

      <div className="cbt-tabs" role="tablist" aria-label="מצבי מעבדת אמונות ומציאות">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={view === item.id ? 'active' : ''}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === 'thought-map' && <ThoughtMap mobileMode={isMobile} onAward={award} onSaved={markSavedSession} />}
      {view === 'thought-record' && <ThoughtRecord />}
      {view === 'belief-lens' && <BeliefLens />}
      {view === 'experiment' && <RealityExperiment onAward={award} onSaved={markSavedSession} />}
      {view === 'activation' && <ActivationBuilder onAward={award} />}
      {view === 'lessons' && <CbtLessonCards onAward={award} />}
      {view === 'drills' && <CbtPracticeDrills onAward={award} />}
    </div>
  );
}
