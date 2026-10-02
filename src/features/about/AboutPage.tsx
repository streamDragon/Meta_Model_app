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
          <strong>איך מתקדמים</strong>
          <p>מתרגלים תגובה בהקשר, מקבלים משוב וחוזרים למיומנויות שדורשות חיזוק. הנקודות מציינות תרגול.</p>
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
        <p>אימון השיחה משלב בירור במטה־מודל, הקשבה ושיקוף, הגדרת מטרה, הסכמה ובדיקת צעד. אלה רכיבי למידה נפרדים; השילוב באפליקציה עדיין לא נבדק ליעילות טיפולית.</p>
        <p>סקירה שיטתית של NLP מצאה ראיות מוגבלות להשפעה על תוצאות בריאות. מחקר על שליפה וחזרות מרווחות תומך בעקרונות למידה, אך אינו מוכיח שהאפליקציה מטפלת בקושי נפשי.</p>
        <ul>
          <li><a href="https://bjgp.org/content/62/604/e757" target="_blank" rel="noreferrer noopener">Sturt ואחרים, 2012 — סקירת NLP</a></li>
          <li><a href="https://www.nature.com/articles/s44159-022-00089-1" target="_blank" rel="noreferrer noopener">Carpenter ואחרים, 2022 — שליפה וחזרות מרווחות</a></li>
          <li><a href="https://library.samhsa.gov/sites/default/files/PEP20-02-02-014.pdf" target="_blank" rel="noreferrer noopener">SAMHSA — הקשבה, שיקוף ושאלות פתוחות בראיון מוטיבציוני</a></li>
        </ul>
        <p>פירושים ומשמעויות משתמעות הם אפשרויות לבדיקה עם הדובר, ולא עובדות עליו. שמירה מקומית אינה סנכרון בין מכשירים.</p>
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
          קוד המקור של הפרויקט
        </a>
      </div>

      <p className="footer-text">פיתוח על ידי: streamDragon | 2026</p>
    </div>
  );
}
