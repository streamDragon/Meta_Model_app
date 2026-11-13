import { FEATURES } from '../../registry';

interface LegacyToolLink {
  /** Hebrew name shown first. */
  title: string;
  /** Original English name, shown only as small secondary text. */
  englishName: string;
  /** One short line: when to use this tool. */
  whenToUse: string;
  href: string;
  /** Hebrew skill tag. */
  tag: string;
  /** Main React route that covers a related skill, if any. */
  relatedId?: string;
}

// Every entry is a distinct exercise with its own mechanics or data; none is a
// copy of another. Related main-app routes are linked, not substituted.
const LEGACY_TOOLS: LegacyToolLink[] = [
  {
    title: 'סימון קטגוריות בטקסט',
    englishName: 'Classic 2 · Structure of Magic',
    whenToUse: 'כשרוצים לסמן איפה בדיוק בתוך טקסט קצר מופיעה קטגוריה, מול טבלת ברין.',
    href: 'classic2_trainer.html',
    tag: 'זיהוי',
    relatedId: 'practice',
  },
  {
    title: 'זיהוי תבנית, שאלה ויעד',
    englishName: 'Classic Classic',
    whenToUse: 'כשרוצים לתרגל משפט אחד בשלבים: שאלת בירור, הבעיה הלשונית והיעד, גם במצב מבחן עם זמן.',
    href: 'classic_classic_trainer.html',
    tag: 'זיהוי',
    relatedId: 'practice',
  },
  {
    title: 'מעבדת טבלת ברין',
    englishName: 'Breen Table Lab',
    whenToUse: 'כשרוצים לזכור איפה כל תבנית יושבת בטבלה: בנייה, השלמה ואיתור מהיר.',
    href: 'breen_table_lab.html',
    tag: 'טבלה',
  },
  {
    title: 'שלשות חיות',
    englishName: 'Living Triples',
    whenToUse: 'כשרוצים להבחין בין תבניות קרובות של אותה שלשה בתוך הקשר.',
    href: 'living_triples_trainer.html',
    tag: 'הבחנה',
  },
  {
    title: 'עצי קרחון',
    englishName: 'Iceberg Templates',
    whenToUse: 'כשרוצים לבדוק פרשנות של שטח מול עומק כהשערה, ולפתוח ענף חלופי.',
    href: 'iceberg_templates_trainer.html',
    tag: 'עומק',
  },
  {
    title: 'תמונות מחיי היום',
    englishName: 'Scenario Trainer',
    whenToUse: 'כשרוצים להגיב בתוך סצנה יומיומית ולראות איך התגובה נוחתת.',
    href: 'scenario_trainer.html',
    tag: 'סצנה',
    relatedId: 'conversation',
  },
  {
    title: 'רדאר הקשר',
    englishName: 'Context Radar',
    whenToUse: 'כשוויכוח נתקע: משחזרים את ההקשר החסר של כל צד ובוחרים תגובת תיקון.',
    href: 'lab/context-radar/',
    tag: 'הקשר',
    relatedId: 'conversation',
  },
  {
    title: 'מעבדת שינוי ניסוח',
    englishName: 'Sentence Morpher',
    whenToUse: 'כשרוצים לראות מה משתנה כשמשנים מילה אחת בניסוח.',
    href: 'sentence_morpher_trainer.html',
    tag: 'ניסוח',
  },
  {
    title: 'פירוק פועל עמום',
    englishName: 'Verb Unzip',
    whenToUse: 'כשפועל כמו "נתקע" או "התמודד" עמום מדי: מפרקים אותו לפעולה שאפשר לצלם.',
    href: 'verb_unzip_trainer.html',
    tag: 'פועל',
  },
  {
    title: 'משחק הפירוק: 15 שאלות',
    englishName: 'Verb Unzip · interview game',
    whenToUse: 'כשרוצים לתשאל מטופל על פועל אחד ב-15 שאלות ולשבץ את התשובות ללוח.',
    href: 'verb_unzip_trainer_legacy.html',
    tag: 'פועל',
  },
  {
    title: 'מפת הכרח בפריזמות',
    englishName: 'Prism Lab (standalone)',
    whenToUse: 'כשרוצים לעבור על משפט מוכן משני צדדיו, רמה אחר רמה, עם שאלות ותשובות.',
    href: 'prism_lab_trainer.html',
    tag: 'פריזמה',
    relatedId: 'prismlab',
  },
  {
    title: 'מחקר פריזמות בשרשרת',
    englishName: 'Prism Research',
    whenToUse: 'כשרוצים לחקור הנחה מרכזית בשרשרת שאלות עד שנבנית מפה עמוקה.',
    href: 'prism_research_trainer.html',
    tag: 'פריזמה',
    relatedId: 'prismlab',
  },
];

export function LegacyToolsPage() {
  return (
    <div className="card legacy-tools-page">
      <div className="legacy-hero">
        <span aria-hidden="true">🧰</span>
        <div>
          <h2>כלים נוספים</h2>
          <p>בחר לפי המיומנות. כל כלי כאן הוא תרגיל נפרד עם מנגנון משלו.</p>
        </div>
      </div>

      <div className="feature-brief">
        <span>
          <strong>מטרה:</strong> להעמיק במבנה, בניסוח ובהקשר.
        </span>
        <span>
          <strong>תוצר:</strong> אימון ממוקד במיומנות שבחרת.
        </span>
      </div>

      <div className="legacy-tool-grid">
        {LEGACY_TOOLS.map((tool) => {
          const related = tool.relatedId
            ? FEATURES.find((feature) => feature.id === tool.relatedId)
            : undefined;
          return (
            <article className="legacy-tool-card" key={tool.href}>
              <span className="legacy-tool-tag">{tool.tag}</span>
              <strong>
                <a href={tool.href}>{tool.title}</a>
              </strong>
              <small lang="en" dir="ltr" style={{ color: 'var(--ink-soft)', fontSize: 'var(--fs-xs)', alignSelf: 'flex-start' }}>
                {tool.englishName}
              </small>
              <p>
                <strong style={{ fontSize: 'inherit' }}>מתי: </strong>
                {tool.whenToUse}
              </p>
              <a className="legacy-tool-action" href={tool.href}>פתח כלי ←</a>
              {related && (
                <a href={related.route} style={{ fontSize: 'var(--fs-sm)' }}>
                  קשור למסלול הראשי: {related.navLabel}
                </a>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
