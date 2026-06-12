import { describe, expect, it } from 'vitest';
import {
  detectHighRiskExposure,
  detectPotentialCrisis,
  getSafetyMessageHe,
} from './cbtSafety';

describe('cbtSafety', () => {
  it('detects crisis language conservatively', () => {
    expect(detectPotentialCrisis('אני רוצה לפגוע בעצמי עכשיו')).toBe(true);
    expect(detectPotentialCrisis('אין לי כוח לפתוח את המסמך')).toBe(false);
  });

  it('blocks high-risk exposure experiments', () => {
    expect(detectHighRiskExposure('להתעמת עם אדם אלים לבד בלילה')).toBe(true);
    expect(detectHighRiskExposure('לשלוח טיוטה לאדם בטוח אחד')).toBe(false);
  });

  it('returns a clear training boundary message', () => {
    expect(getSafetyMessageHe()).toContain('לא מחליף טיפול מקצועי');
    expect(getSafetyMessageHe()).toContain('עזרה דחופה');
  });
});
