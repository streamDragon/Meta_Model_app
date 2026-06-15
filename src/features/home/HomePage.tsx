import { useRef } from 'react';
import { FEATURES } from '../../registry';
import { useProgress } from '../../store/useProgress';
import { nextMission } from '../../store/progress';
import { HowItWorks } from '../../components/HowItWorks';
import { PATTERN_ART } from '../../lib/patternArt';
import teacherImg from '../../assets/teacher.png';
import icebergImg from '../../assets/iceberg.png';
import therapyRoom from '../../../assets/images/prismlab/context-therapy-room.webp';

function navigateTo(tab: string) {
  window.location.hash = tab;
}

// Everyday sentences, color-coded by violation family — instantly show the kind
// of language we work on (reuses the existing .hero-bubble[data-family] chip).
const HERO_BUBBLES = [
  { text: '"הוא פשוט לא מקשיב לי"', tag: 'השמטה', family: 'deletion' },
  { text: '"תמיד יוצא לי לפשל בדיוק ברגע הזה"', tag: 'הכללה', family: 'generalization' },
  { text: '"כולם בטוח חושבים שאני מגזים"', tag: 'עיוות', family: 'distortion' },
];

// "Why is this worth it for ME?" — the value the app gives, framed as a
// trainable skill (the answer a curious newcomer actually wants first).
const WHY = {
  title: '💪 למה זה שווה לך?',
  intro:
    'כולנו יודעים איך "צריך" לדבר עם אנשים — להקשיב, לא להיכנס למלחמות, להבין לפני שעונים. אבל ברגע האמת, בלחץ, זה פשוט קשה. כאן מתאמנים על זה, עד שזה הופך לאינסטינקט.',
  benefits: [
    {
      icon: '🤝',
      title: 'פחות ריבים מיותרים',
      body: 'במקום להיתקע באותו ויכוח שוב ושוב, לומדים לשמוע מה האדם באמת אומר — והמתח פשוט יורד.',
    },
    {
      icon: '❤️',
      title: 'לעזור בלי להטיף',
      body: 'כשחבר, בן זוג או ילד שלך כואב, אפשר לשאול את השאלה שפותחת אותם — בלי עצות שאף אחד לא ביקש.',
    },
    {
      icon: '🌬️',
      title: 'להרגיע את עצמך',
      body: 'במקום "אני כישלון" לומדים לומר "נכשלתי הפעם בזה" — והסערה בראש נרגעת לרגע אחד שמספיק כדי לנשום.',
    },
    {
      icon: '🧠',
      title: 'לחשוב צלול בלחץ',
      body: 'כשהכול בוער ובא להתפוצץ, יש כלי לעצור, לברר, ולראות את התמונה כמו שהיא באמת.',
    },
    {
      icon: '✨',
      title: 'להיות מי שמבינים אותו',
      body: 'אנשים נפתחים אליך ומשתכנעים — לא כי ניצחת אותם בוויכוח, אלא כי הרגישו שבאמת הקשבת.',
    },
  ],
  skillLine:
    'תקשורת ושיחה מיטיבה הן לא כישרון שנולדים איתו — הן שריר. כאן זה חדר הכושר: כל אימון קצר מוסיף עוד חזרה, עד שהמיומנות זזה מהראש לאינסטינקט.',
};

// The big idea — the few principles that make up the whole skill. The
// pacing-and-leading pillar leads and is featured, because it's the heart of
// "join the person in their words, then open a new door".
const PILLARS: { icon: string; title: string; body: string; art?: string; featured?: boolean }[] = [
  {
    icon: '🏄',
    title: 'להצטרף ואז להוביל',
    body:
      'קודם נכנסים פנימה — גולשים על המילים של האדם השני, חוזרים אליהן בשפה שלו, ומראים שהבנת. רק כשהוא מרגיש מובן, אפשר להוביל בעדינות אל אפשרות חדשה. זה ההפך מלהתווכח או לייעץ: מצטרפים, ואז פותחים דלת.',
    art: therapyRoom,
    featured: true,
  },
  {
    icon: '🗺️',
    title: 'המפה היא לא השטח',
    body:
      'מה שאומרים הוא מפה של המציאות, לא המציאות עצמה. כל משפט מוחק, מעוות או מכליל משהו. שפה מדויקת מחזירה את הפרטים שנמחקו — ופתאום נפתחות אפשרויות שהמפה הישנה הסתירה.',
    art: icebergImg,
  },
  {
    icon: '💗',
    title: 'שפה מעצבת רגש',
    body:
      '"אני כישלון" מול "נכשלתי הפעם בדבר הזה" — אותו אירוע, רגש אחר לגמרי. דיוק בניסוח הוא ויסות רגשי. שינוי קטן במילים משנה את כל מה שמרגישים.',
  },
  {
    icon: '❓',
    title: 'שאלה טובה שווה אלף עצות',
    body:
      'שאלה מדויקת מחזירה את המידע שנמחק, והאדם מגיע לתובנה בעצמו. הקשבה למבנה — לא רק לתוכן — היא שריר. כאן מאמנים את האוזן לתפוס אותו בזמן אמת.',
  },
];

// Three easy "doors" — real-life conversation MOVES (not tool names), each
// training a piece of the big idea and linking to one of the simplest features.
const DOORS = [
  {
    icon: '👂',
    principle: 'הקשבה היא שריר',
    title: 'לתפוס מה באמת נאמר',
    oneLiner: 'לשמוע משפט ולזהות מה נמחק, עוות או הוכלל בתוכו — האוזן שתופסת מבנה, לא רק תוכן.',
    cta: 'אמן את האוזן',
    target: 'practice',
    art: PATTERN_ART.simple_deletion,
  },
  {
    icon: '🏄',
    principle: 'להצטרף ואז להוביל',
    title: 'להצטרף למילים שלו ואז להוביל',
    oneLiner: 'להכיר את שלוש משפחות המילים החסרות — ולכל אחת את השאלה שמחזירה את מה שנמחק ופותחת דלת חדשה.',
    cta: 'למד את המשפחות',
    target: 'categories',
    art: PATTERN_ART.mind_reading,
  },
  {
    icon: '🧭',
    principle: 'שאלה הופכת לצעד',
    title: "להפוך 'אני רוצה' לצעד ראשון",
    oneLiner: 'לקחת כוונה עמומה — שלך או של מי שמולך — ולתרגם אותה לצעד אחד קונקרטי עם תוכנית גיבוי.',
    cta: 'בנה צעד ראשון',
    target: 'blueprint',
    art: PATTERN_ART.modal_operator,
  },
];

// The deep end: the specific tools, kept out of the easy doors so the two
// tiers stay visually and conceptually distinct (every other feature lives
// here so nothing disappears from the home page).
const TOOLBOX_IDS = ['beliefs-reality-lab', 'prismlab', 'valueslab', 'michael-hall-daily-gym', 'legacy-tools'];

export function HomePage() {
  const { progress } = useProgress();
  const bigIdeaRef = useRef<HTMLElement>(null);
  // Ring shows progress toward the next 100-XP level.
  const percent = Math.min(100, Math.round(progress.xp % 100));
  const level = Math.floor(progress.xp / 100) + 1;

  return (
    <>
      <section className="home-hero home-hero-rich">
        <div className="home-hero-content">
          <span className="hero-eyebrow">חדר כושר לשיחה</span>
          <h2>לדעת זה קל. לעשות את זה בזמן אמת — זה אימון.</h2>
          <p className="hero-tagline">
            חדר הכושר לכישור שכולם מכירים אבל קשה ליישם בזמן אמת —{' '}
            <strong>להקשיב, לשאול נכון, ולהוביל בעדינות.</strong>
          </p>
          <p>
            כולם יודעים שכדאי להקשיב, לשאול שאלה טובה ולא לקפוץ למסקנה. אבל באמצע שיחה אמיתית זה קשה.
            כאן מתאמנים על זה כמו שספורטאי מתאמן על תנועה — עד שהיא הופכת לטבעית.
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
              🎯 נסה תנועה ראשונה עכשיו
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => bigIdeaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              ✨ מה הרעיון הגדול כאן?
            </button>
          </div>
        </div>
        <div className="home-hero-figure" aria-hidden="true">
          <img src={teacherImg} alt="" loading="lazy" />
        </div>
      </section>

      <section className="why-band" aria-labelledby="why-title">
        <h3 className="section-title" id="why-title">
          {WHY.title}
        </h3>
        <p className="why-intro">{WHY.intro}</p>
        <div className="why-grid">
          {WHY.benefits.map((b) => (
            <article className="why-card" key={b.title}>
              <span className="why-icon" aria-hidden="true">
                {b.icon}
              </span>
              <strong>{b.title}</strong>
              <p>{b.body}</p>
            </article>
          ))}
        </div>
        <p className="why-skill-line">{WHY.skillLine}</p>
      </section>

      <section className="bigidea-band" ref={bigIdeaRef} aria-labelledby="bigidea-title">
        <h3 className="section-title" id="bigidea-title">
          🧠 הרעיון הגדול: מילים מנחות מחשבה ורגש
        </h3>
        <p className="bigidea-intro">
          לפני הכלים — כמה עקרונות שמרכיבים את הכישור כולו. זה לב העניין: לא לשכנע ולא לייעץ, אלא
          להצטרף לאדם בתוך המילים שלו, ואז לפתוח לו דלת שהוא לא ראה. <strong>לא ויכוח, לא עצה —
          הצטרפות, ואז הובלה.</strong>
        </p>
        <div className="pillar-grid">
          {PILLARS.map((p) => (
            <article className={`pillar-card${p.featured ? ' featured' : ''}`} key={p.title}>
              {p.art && (
                <div className="pillar-art">
                  <img src={p.art} alt="" loading="lazy" />
                </div>
              )}
              <div className="pillar-body">
                <span className="pillar-icon" aria-hidden="true">
                  {p.icon}
                </span>
                <h4>{p.title}</h4>
                <p>{p.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <h3 className="section-title">🚪 שלוש תנועות שאפשר להתחיל איתן היום</h3>
      <p className="doors-intro">
        לא תיאוריה — תנועות אמיתיות לשיחה. כל אחת מאמנת חתיכה מהרעיון הגדול, וכל אחת נפתחת בלחיצה.
      </p>
      <div className="door-grid">
        {DOORS.map((d) => (
          <article className="door-card" key={d.title}>
            <div className="door-art">
              <img src={d.art} alt="" loading="lazy" />
              <span className="door-principle">{d.principle}</span>
            </div>
            <div className="door-head">
              <span className="door-icon" aria-hidden="true">
                {d.icon}
              </span>
              <strong>{d.title}</strong>
            </div>
            <p className="door-oneliner">{d.oneLiner}</p>
            <button type="button" className="btn btn-primary" onClick={() => navigateTo(d.target)}>
              {d.cta} ←
            </button>
          </article>
        ))}
      </div>

      <HowItWorks
        steps={[
          { icon: '🎯', title: 'מתחילים בתרגול קצר', detail: 'חמש דקות שמאמנות את האוזן לתפוס מה נאמר באמת' },
          { icon: '📚', title: 'לומדים את שלוש המשפחות', detail: 'מה נמחק, עוות או הוכלל — ואיזו שאלה פותחת כל אחת' },
          { icon: '🔬', title: 'מעמיקים במעבדה', detail: 'פותחים משפט שתפס אתכם ובונים צעד או ניסוי קטן מול המציאות' },
        ]}
        title="המסלול המומלץ"
      />

      <h3 className="section-title">🧰 העומק: ארגז הכלים המלא</h3>
      <p className="toolbox-intro">
        כשהתנועות הבסיסיות מתחילות להרגיש טבעי — כאן נכנסים למים העמוקים. מעבדות לעבודה אמיתית על משפט
        אחד, על אמונה שתפסה אותך, ועל התנגשות ערכים.
      </p>
      <div className="lab-grid">
        {TOOLBOX_IDS.map((id) => {
          const f = FEATURES.find((feature) => feature.id === id);
          if (!f) return null;
          return (
            <article className="lab-card" key={f.id} data-family={f.theoryFamily}>
              <div className="lab-card-head">
                <span className="lab-card-icon" aria-hidden="true">
                  {f.icon}
                </span>
                <span className="lab-card-title">{f.title}</span>
                {f.status !== 'production' && <span className="status-chip">{f.status}</span>}
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
