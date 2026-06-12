export function SurfaceHiddenPrinciple({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section className={`surface-hidden-principle ${compact ? 'compact' : ''}`}>
      <div className="surface-hidden-head">
        <small>עקרון עבודה</small>
        <strong>גלוי ונסתר בכל הפרה</strong>
      </div>
      <div className="surface-hidden-columns">
        <div>
          <span>1</span>
          <strong>הפרה עיקרית / גלויה</strong>
          <p>מה שנמצא במילים עצמן: הטריגר הלשוני שאפשר להצביע עליו במשפט.</p>
        </div>
        <div>
          <span>2</span>
          <strong>הפרה מסתתרת</strong>
          <p>מה שאפשר להשלים מהטון, מהשלכה, או מהמשפט המלא שהמקשיב בונה בראש.</p>
        </div>
      </div>
      <p className="surface-hidden-note">
        ההפרה המסתתרת היא קריאה אפשרית, לא עובדה על האדם. לכן שואלים בעדינות:
        מה נאמר בפועל, ומה אני מוסיף או מפרש?
      </p>
    </section>
  );
}
