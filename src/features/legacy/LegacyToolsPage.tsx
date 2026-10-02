import { FEATURES } from '../../registry';

interface LegacyToolLink {
  title: string;
  description: string;
  href: string;
  tag: string;
  canonicalId?: string;
}

const LEGACY_TOOLS: LegacyToolLink[] = [
  {
    title: 'Classic 2 · Structure of Magic',
    description: 'תרגול טקסטואלי מתקדם לזיהוי קטגוריות וסימון בתוך הטקסט.',
    href: 'classic2_trainer.html',
    tag: 'trainer',
    canonicalId: 'practice',
  },
  {
    title: 'Classic Classic',
    description: 'זיהוי תבניות מטה מודל דרך משפט, שאלה, מבנה ומשוב.',
    href: 'classic_classic_trainer.html',
    tag: 'trainer',
    canonicalId: 'practice',
  },
  {
    title: 'Iceberg Templates',
    description: 'עבודה מדורגת עם תבניות עומק, סיבות, רגשות ופעולות.',
    href: 'iceberg_templates_trainer.html',
    tag: 'lab',
  },
  {
    title: 'Scenario Trainer',
    description: 'סצנות יומיומיות, בחירה ומשוב על תגובה בתוך הקשר חי.',
    href: 'scenario_trainer.html',
    tag: 'scenario',
  },
  {
    title: 'Breen Table Lab',
    description: 'מעבדת טבלה לתרגול מבנה, דיוק ושאלות בירור.',
    href: 'breen_table_lab.html',
    tag: 'lab',
  },
  {
    title: 'Prism Lab / Research',
    description: 'גרסאות הפריזמות המקוריות שנשמרו מהאפליקציה הפרודקשנית.',
    href: 'prism_lab_trainer.html',
    tag: 'prism',
    canonicalId: 'prismlab',
  },
  {
    title: 'Sentence Morpher',
    description: 'תרגול שינוי משפטים ושמירת המבנה הלשוני שנבדק.',
    href: 'sentence_morpher_trainer.html',
    tag: 'sentence',
  },
  {
    title: 'Living Triples',
    description: 'תרגול חי של שלשות ברין והבחנה בין שכבות תגובה.',
    href: 'living_triples_trainer.html',
    tag: 'trainer',
  },
  {
    title: 'Verb Unzip',
    description: 'פירוק פעלים עמומים לפעולה, הקשר ומידע חסר.',
    href: 'verb_unzip_trainer.html',
    tag: 'verb',
  },
  {
    title: 'Context Radar',
    description: 'מעבדת הקשר צדדית שנשמרה מהעץ הפרודקשני.',
    href: 'lab/context-radar/',
    tag: 'radar',
  },
];

export function LegacyToolsPage() {
  return (
    <div className="card legacy-tools-page">
      <div className="legacy-hero">
        <span aria-hidden="true">🧰</span>
        <div>
          <h2>כלים נוספים</h2>
          <p>בחר לפי המיומנות. תרגילי עומק ייחודיים זמינים כאן; גרסאות מקבילות נמצאות בארכיון.</p>
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
        {LEGACY_TOOLS.filter((tool) => !tool.canonicalId).map((tool) => (
          <a className="legacy-tool-card" href={tool.href} key={tool.href}>
            <span className="legacy-tool-tag">{tool.tag}</span>
            <strong>{tool.title}</strong>
            <p>{tool.description}</p>
            <span className="legacy-tool-action">פתח כלי ←</span>
          </a>
        ))}
      </div>
      <details className="legacy-archive">
        <summary>ארכיון: גרסאות מקבילות ({LEGACY_TOOLS.filter((tool) => tool.canonicalId).length})</summary>
        {LEGACY_TOOLS.filter((tool) => tool.canonicalId).map((tool) => {
          const canonical = FEATURES.find((feature) => feature.id === tool.canonicalId);
          return <article className="legacy-tool-card" key={tool.href}>
            <strong>{tool.title}</strong><p>{tool.description}</p>
            {canonical && <a href={canonical.route}>למסלול הראשי: {canonical.navLabel}</a>}
            <a href={tool.href}>פתח את הגרסה השמורה</a>
          </article>;
        })}
      </details>
    </div>
  );
}
