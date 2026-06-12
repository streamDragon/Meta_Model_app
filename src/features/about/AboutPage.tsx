export function AboutPage() {
  return (
    <div className="card">
      <div className="about-hero">
        <span className="about-mark">🧠</span>
        <div>
          <h2>על Meta Model Gym</h2>
          <p>
            כלי אימון מובנה וללא AI שמלמד לזהות מחיקה, עיוות והכללה, וגם לפתוח
            מחשבות, אמונות, ניבויים וצעדים קטנים דרך CBT ומטה-מודל.
          </p>
        </div>
      </div>

      <div className="about-card-grid">
        <article className="about-card">
          <strong>מה לומדים</strong>
          <p>להפוך משפט עמום למפה: מה נאמר, מה חסר, מה הוכלל, ומה אפשר לבדוק בעדינות בשטח.</p>
        </article>
        <article className="about-card">
          <strong>איך עובדים</strong>
          <p>בוחרים מעבדה, פותחים משפט, מזהים דפוס, שואלים שאלה טובה ובונים פעולה או ניסוי קטן.</p>
        </article>
        <article className="about-card">
          <strong>מה מיוחד</strong>
          <p>התוכן מגיע מחבילות JSON/TS ניידות, בלי ניתוח חופשי ובלי API חיצוני.</p>
        </article>
      </div>

      <div className="about-flow">
        <div>
          <span>1</span>
          <strong>מקשיבים למשפט</strong>
        </div>
        <div>
          <span>2</span>
          <strong>פותחים מפה</strong>
        </div>
        <div>
          <span>3</span>
          <strong>שואלים טוב יותר</strong>
        </div>
        <div>
          <span>4</span>
          <strong>בודקים בשטח</strong>
        </div>
      </div>

      <div className="about-video">
        <h3>🎬 סרטון היכרות קצר</h3>
        <video controls preload="metadata" src="assets/images/INTRO_720p.mp4">
          הדפדפן שלך לא תומך בניגון וידאו.
        </video>
      </div>

      <div className="about-source-panel">
        <h3>מקורות, גבולות וקוד</h3>
        <p>
          האפליקציה משלבת עקרונות Meta Model מתוך NLP עם תרגול CBT חינוכי:
          מחשבה כמפה, בדיקת ראיות, הרחבת מסגרת, ניסוי מציאות ופעולה קטנה.
        </p>
        <p>
          זהו כלי אימון ורפלקציה עצמית - לא כלי אבחון קליני, לא תחליף לטיפול ולא
          שירות חירום. במצוקה חריפה, סכנת פגיעה עצמית, טראומה פעילה, התמכרות
          פעילה, פסיכוזה, OCD מורכב או חרדה מציפה - יש לפנות לאיש מקצוע או לעזרה
          דחופה.
        </p>
        <a
          href="https://github.com/streamDragon/Meta_Model_app"
          target="_blank"
          rel="noreferrer noopener"
        >
          GitHub Repository
        </a>
      </div>

      <p className="footer-text">פיתוח על ידי: streamDragon | 2026</p>
    </div>
  );
}
