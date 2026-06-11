export function AboutPage() {
  return (
    <div className="card">
      <div className="about-hero">
        <span className="about-mark">🧠</span>
        <div>
          <h2>על Meta Model App</h2>
          <p>
            כלי תרגול קצר, מובנה וללא AI שמלמד לזהות מחיקה, עיוות והכללה דרך בחירות
            מוכנות ומשוב מיידי.
          </p>
        </div>
      </div>

      <div className="about-card-grid">
        <article className="about-card">
          <strong>מה לומדים</strong>
          <p>להפוך משפט עמום לשאלה מדויקת שמחזירה מידע חסר.</p>
        </article>
        <article className="about-card">
          <strong>איך עובדים</strong>
          <p>בוחרים קטגוריה, עונים על תרגול, בונים Blueprint או ממפים פריזמה.</p>
        </article>
        <article className="about-card">
          <strong>מה מיוחד</strong>
          <p>התוכן מגיע מחבילות JSON ניידות, בלי ניתוח חופשי ובלי API חיצוני.</p>
        </article>
      </div>

      <div className="about-flow">
        <div>
          <span>1</span>
          <strong>לומדים קטגוריה</strong>
        </div>
        <div>
          <span>2</span>
          <strong>מתרגלים זיהוי</strong>
        </div>
        <div>
          <span>3</span>
          <strong>מנסחים שאלה</strong>
        </div>
        <div>
          <span>4</span>
          <strong>בונים פעולה</strong>
        </div>
      </div>

      <div className="about-source-panel">
        <h3>מקורות וקוד</h3>
        <p>מבוסס על עקרונות Meta Model מתוך NLP של Richard Bandler ו-John Grinder.</p>
        <p>
          זהו כלי אימון ורפלקציה עצמית — לא כלי אבחון קליני ולא תחליף לטיפול או לסיוע
          במצבי חירום.
        </p>
        <a
          href="https://github.com/streamDragon/Meta_Model_app"
          target="_blank"
          rel="noreferrer"
        >
          GitHub Repository
        </a>
      </div>

      <p className="footer-text">פיתוח על ידי: streamDragon | 2026</p>
    </div>
  );
}
