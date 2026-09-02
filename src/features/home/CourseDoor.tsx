import { useState } from 'react';
import './course-door.css';

type CourseDoorView = 'entrance' | 'course-select' | 'shfat-hashpaa';

const SHFAT_SECTIONS = [
  {
    number: '01',
    title: 'היפוך המטה-מודל',
    description: 'אותם מבני שפה שכבר למדתם לזהות — עכשיו גם מהצד של בניית שפה והשפעה.',
    verifiedPractice: true,
  },
  {
    number: '02',
    title: 'עמימות, קשב ויחסים',
    description: 'כמה משמעות לסגור, לאן להפנות קשב, ואיך להגיב למה שקורה בתוך השיחה.',
  },
  {
    number: '03',
    title: 'בניית משפטי השפעה',
    description: 'מהתבנית אל האדם: מטרה, מסר, בחירה, ניסוח ותגובה.',
  },
  {
    number: '04',
    title: 'העמקה ומטאפורות',
    description: 'עבודה עם דימוי, מרחב משמעות ומטאפורה בלי לאבד את האדם בדרך.',
  },
  {
    number: '05',
    title: 'הנחות יסוד בשפה',
    description: 'מה המשפט אומר במפורש — ומה הוא כבר מניח כרקע.',
  },
] as const;

function navigateTo(tab: string) {
  window.location.hash = tab;
}

function continueAsNewUser() {
  document.querySelector('.home-hero')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function CourseDoor() {
  const [view, setView] = useState<CourseDoorView>('entrance');

  return (
    <section className="course-door" aria-label="בחירת מסלול כניסה">
      {view === 'entrance' && (
        <>
          <div className="course-door-heading">
            <span>מאיפה מתחילים?</span>
            <h1>אותה אפליקציה. שתי דרכי כניסה.</h1>
            <p>לא צריך להבין את כל ארגז הכלים. בחרו את הדרך שמתאימה לכם עכשיו.</p>
          </div>

          <div className="course-door-choice-grid">
            <button type="button" className="course-door-choice" onClick={continueAsNewUser}>
              <span className="course-door-choice-kicker">בלי ידע מוקדם</span>
              <strong>אני חדש</strong>
              <small>אני רוצה להשתפר בשיחות ולהתחיל ממשהו פשוט וברור.</small>
              <span className="course-door-action">התחל מהחיים עצמם ←</span>
            </button>

            <button
              type="button"
              className="course-door-choice course-door-choice-course"
              onClick={() => setView('course-select')}
            >
              <span className="course-door-choice-kicker">מסלול מסודר</span>
              <strong>אני תלמיד בקורס</strong>
              <small>אני רוצה להגיע לפרק שאני לומד ולפתוח את האימון המתאים.</small>
              <span className="course-door-action">בחר קורס ←</span>
            </button>
          </div>
        </>
      )}

      {view === 'course-select' && (
        <div className="course-door-panel">
          <div className="course-door-panel-head">
            <button type="button" className="course-door-back" onClick={() => setView('entrance')}>
              חזרה
            </button>
            <div>
              <span>לתלמידי הקורסים</span>
              <h2>איזה קורס אתם לומדים עכשיו?</h2>
            </div>
          </div>

          <div className="course-card-grid">
            <article className="course-card" data-testid="course-card-meta-model">
              <span className="course-card-number">01</span>
              <h3>מטה-מודל</h3>
              <p>זיהוי מחיקה, עיוות והכללה — והשאלות שמחזירות מידע חסר ומרחיבות את המפה.</p>
              <div className="course-card-actions">
                <button type="button" className="btn btn-primary" onClick={() => navigateTo('categories')}>
                  פתח מילון
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => navigateTo('practice')}>
                  אימון זיהוי
                </button>
              </div>
            </article>

            <article className="course-card course-card-featured">
              <span className="course-card-number">02</span>
              <h3>שפת ההשפעה</h3>
              <p>המסלול שממשיך מהמטה-מודל אל בניית שפה, עמימות מכוונת, מטאפורות והנחות יסוד.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setView('shfat-hashpaa')}
                aria-label="פתח את מסלול שפת ההשפעה"
              >
                פתח את מסלול שפת ההשפעה
              </button>
            </article>
          </div>
        </div>
      )}

      {view === 'shfat-hashpaa' && (
        <div className="course-door-panel" data-testid="shfat-course-map">
          <div className="course-door-panel-head">
            <button type="button" className="course-door-back" onClick={() => setView('course-select')}>
              חזרה לקורסים
            </button>
            <div>
              <span>שפת ההשפעה</span>
              <h2>חמשת חלקי הקורס</h2>
              <p>בוחרים לפי המקום שבו אתם נמצאים בקורס. אנחנו מחברים רק אימונים שכבר אומתו.</p>
            </div>
          </div>

          <div className="course-section-list">
            {SHFAT_SECTIONS.map((section) => (
              <article className="course-section-card" key={section.number}>
                <span className="course-section-number">{section.number}</span>
                <div className="course-section-copy">
                  <h4>{section.title}</h4>
                  <p>{section.description}</p>
                  {section.verifiedPractice ? (
                    <div className="course-section-actions">
                      <button type="button" className="btn btn-primary" onClick={() => navigateTo('categories')}>
                        פתח מפת תבניות
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => navigateTo('practice')}>
                        אימון זיהוי
                      </button>
                    </div>
                  ) : (
                    <span className="course-section-pending">אימונים ייעודיים יתחברו כאן</span>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
