import { FEATURES } from '../../registry';
import { useProgress } from '../../store/useProgress';
import { nextMission } from '../../store/progress';
import { HowItWorks } from '../../components/HowItWorks';
import teacherImg from '../../assets/teacher.png';

function navigateTo(tab: string) {
  window.location.hash = tab;
}

const HERO_BUBBLES = [
  { text: '"הוא לא רואה אותי"', tag: 'השמטה', family: 'deletion' },
  { text: '"תמיד קורה לי ככה"', tag: 'הכללה', family: 'generalization' },
  { text: '"כולם חושבים שאני..."', tag: 'עיוות', family: 'distortion' },
];

const LAB_IDS = [
  'categories',
  'practice',
  'michael-hall-daily-gym',
  'blueprint',
  'prismlab',
  'valueslab',
  'legacy-tools',
];

export function HomePage() {
  const { progress } = useProgress();
  // Ring shows progress toward the next 100-XP level.
  const percent = Math.min(100, Math.round(progress.xp % 100));
  const level = Math.floor(progress.xp / 100) + 1;

  return (
    <>
      <section className="home-hero home-hero-rich">
        <div className="home-hero-content">
          <h2>ברוכים הבאים! 👋</h2>
          <p className="hero-tagline">
            לשמוע משפט — <strong>ולראות מה מסתתר בתוכו.</strong>
          </p>
          <p>
            Meta Model Gym הוא חדר כושר לשפה: מתאמנים לזהות מחיקה, עיוות והכללה,
            לשאול שאלות מדויקות יותר, ולהפוך כוונות עמומות לצעדים.
          </p>
          <div className="hero-bubbles" aria-hidden="true">
            {HERO_BUBBLES.map((b) => (
              <span className="hero-bubble" data-family={b.family} key={b.tag}>
                {b.text}
                <em>{b.tag}</em>
              </span>
            ))}
          </div>
          <div className="hero-actions">
            <button type="button" className="btn btn-secondary" onClick={() => navigateTo('practice')}>
              🎮 התחל תרגול יומי
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigateTo('categories')}>
              📚 למד את הקטגוריות
            </button>
          </div>
        </div>
        <div className="home-hero-figure" aria-hidden="true">
          <img src={teacherImg} alt="" loading="lazy" />
        </div>
      </section>

      <HowItWorks
        steps={[
          { icon: '📚', title: 'לומדים דפוס', detail: 'פותחים את הקטגוריות ומכירים את 11 הדפוסים' },
          { icon: '🎯', title: 'מזהים במהירות', detail: 'תרגול קצר עם משוב מיידי ו-XP' },
          { icon: '🔍', title: 'מעמיקים במעבדה', detail: 'פריזמות, ערכים ו-Blueprint לעבודה אמיתית' },
        ]}
        title="המסלול המומלץ"
      />

      <h3 className="section-title">🏋️ המעבדות</h3>
      <div className="lab-grid">
        {LAB_IDS.map((id) => {
          const f = FEATURES.find((feature) => feature.id === id);
          if (!f) return null;
          return (
            <article className="lab-card" key={f.id} data-family={f.theoryFamily}>
              <div className="lab-card-head">
                <span className="lab-card-icon" aria-hidden="true">
                  {f.icon}
                </span>
                <span className="lab-card-title">{f.title}</span>
                {f.status !== 'production' && (
                  <span className="status-chip">{f.status}</span>
                )}
              </div>
              <p className="lab-card-desc">{f.shortDescription}</p>
              <div className="lab-card-meta">
                <span>{f.skillTrained}</span>
                <span className="difficulty-dots" title={`רמת קושי ${f.difficulty}/3`}>
                  {[1, 2, 3].map((d) => (
                    <i key={d} className={`dot ${d <= f.difficulty ? 'filled' : ''}`} />
                  ))}
                </span>
              </div>
              <button type="button" className="btn btn-primary" onClick={() => navigateTo(f.id)}>
                כניסה ←
              </button>
            </article>
          );
        })}
      </div>

      <div className="progress-hub">
        <h3>📊 ההתקדמות שלך</h3>
        <div className="progress-summary-strip">
          <div
            className="progress-level-ring"
            id="progress-level-ring"
            style={{ ['--progress-percent' as string]: `${percent}%` }}
            title={`רמה ${level}`}
          >
            {percent}%
          </div>
          <div>
            <strong>המשימה הקרובה שלך</strong>
            <p id="progress-next-mission">{nextMission(progress)}</p>
            <small className="muted">רמה {level} · עוד {100 - percent} XP לרמה הבאה</small>
          </div>
        </div>
        <div className="progress-grid">
          <div className="progress-card">
            <span className="progress-icon">🔥</span>
            <p className="progress-label">Streak</p>
            <p className="progress-value" id="streak-count">
              {progress.streak} ימים
            </p>
            <small id="streak-date">{progress.lastSessionDate ?? 'היום הראשון!'}</small>
          </div>
          <div className="progress-card">
            <span className="progress-icon">⭐</span>
            <p className="progress-label">XP Total</p>
            <p className="progress-value" id="xp-count">
              {progress.xp}
            </p>
            <small>כל משימה = נקודות</small>
          </div>
          <div className="progress-card">
            <span className="progress-icon">🏆</span>
            <p className="progress-label">Badges</p>
            <p className="progress-value" id="badge-count">
              {progress.badges.length}
            </p>
            <small>פרסים שהצברת</small>
          </div>
          <div className="progress-card">
            <span className="progress-icon">📈</span>
            <p className="progress-label">Sessions</p>
            <p className="progress-value" id="session-count">
              {progress.sessions}
            </p>
            <small>סשנים שהשלמת</small>
          </div>
        </div>
        <div id="badges-display" className="badges-display">
          {progress.badges.length === 0 ? (
            <div className="badges-empty-state">השלם סשן תרגול ראשון כדי לפתוח תג ראשון.</div>
          ) : (
            progress.badges.map((b) => (
              <div className="badge" title={b.name} key={b.id}>
                <span className="badge-icon">{b.icon}</span>
                <span>{b.name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
