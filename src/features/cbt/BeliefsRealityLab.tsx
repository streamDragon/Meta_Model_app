import { useState } from 'react';
import { HowItWorks } from '../../components/HowItWorks';
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
  const [visited, setVisited] = useState<Set<CbtView>>(() => new Set(['thought-map']));
  const [experimentDraft, setExperimentDraft] = useState({ text: '', revision: 0 });
  const selectView = (next: CbtView) => { setVisited((prev) => new Set([...prev, next])); setView(next); };
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
          <span className="cbt-kicker">בירור מחשבה וניבוי</span>
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
            role="tab" aria-selected={view === item.id} aria-controls={`cbt-panel-${item.id}`} id={`cbt-tab-${item.id}`} onClick={() => selectView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <p className="learning-muted">התחל במפת מחשבה. יומן מתאים לבירור מפורט; ניסוי בודק ניבוי; פעולה קטנה עוזרת כשקשה להתחיל. טיוטות נשארות בין הלשוניות עד רענון, ושמירה מפורשת היא בדפדפן הזה.</p>
      {VIEWS.filter((item) => visited.has(item.id)).map((item) => <section key={item.id} role="tabpanel" id={`cbt-panel-${item.id}`} aria-labelledby={`cbt-tab-${item.id}`} hidden={view !== item.id}>
        {item.id === 'thought-map' && <ThoughtMap mobileMode={isMobile} onAward={award} onSaved={markSavedSession} onPlanExperiment={(text) => { setExperimentDraft((prev) => ({ text, revision: prev.revision + 1 })); selectView('experiment'); }} />}
        {item.id === 'thought-record' && <ThoughtRecord onPlanExperiment={(text) => { setExperimentDraft((prev) => ({ text, revision: prev.revision + 1 })); selectView('experiment'); }} />}
        {item.id === 'belief-lens' && <BeliefLens />}
        {item.id === 'experiment' && <RealityExperiment key={experimentDraft.revision} initialPrediction={experimentDraft.text} onAward={award} onSaved={markSavedSession} />}
        {item.id === 'activation' && <ActivationBuilder onAward={award} />}
        {item.id === 'lessons' && <CbtLessonCards onAward={award} />}
        {item.id === 'drills' && <CbtPracticeDrills onAward={award} />}
      </section>)}
    </div>
  );
}
