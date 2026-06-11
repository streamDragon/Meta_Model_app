import type { FeatureDef } from '../registry';

// Graceful mobile fallback for desktop-only features (product rule:
// desktop is the full experience; mobile is a companion, not forced parity).
export function MobileFallback({ feature }: { feature: FeatureDef }) {
  return (
    <div className="card mobile-fallback">
      <span className="fallback-icon" aria-hidden="true">
        {feature.icon}
      </span>
      <h2>{feature.title}</h2>
      <p className="fallback-headline">הפיצ'ר הזה זמין במחשב 🖥️</p>
      <p className="muted">
        {feature.mobileFallback?.why ??
          'המסך הזה צריך שולחן עבודה רחב: עמודות מרובות, מפות וגרירה — חוויה שמסך קטן מצמצם.'}
      </p>
      <div className="fallback-cando">
        <h4>מה אפשר לעשות בינתיים בנייד?</h4>
        <p>
          {feature.mobileFallback?.stillCanDo ??
            'להמשיך בתרגול היומי, לעבור על הקטגוריות ולסקור תוצאות שמורות.'}
        </p>
      </div>
      <div className="step-buttons">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => (window.location.hash = 'practice')}
        >
          🎯 לתרגול מהיר
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => (window.location.hash = 'home')}
        >
          🏠 חזרה לבית
        </button>
      </div>
      <p className="muted fallback-note">המשך מאוחר יותר במחשב — ההתקדמות שלך נשמרת.</p>
    </div>
  );
}
