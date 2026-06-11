// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { MobileFallback } from './MobileFallback';
import { FEATURES, type FeatureDef } from '../registry';

afterEach(cleanup);

const desktopOnlyFeature: FeatureDef = {
  ...FEATURES[0],
  id: 'matrix-workbench',
  title: 'מטריצה סיסטמית',
  icon: '🧩',
  mobileSupport: 'none',
  mobileFallback: {
    why: 'המטריצה דורשת עמודות מרובות זו לצד זו.',
    stillCanDo: 'אפשר לתרגל זיהוי דפוסים ולסקור תוצאות שמורות.',
  },
};

describe('MobileFallback', () => {
  it('shows the feature title, reason and what is still possible on mobile', () => {
    render(<MobileFallback feature={desktopOnlyFeature} />);
    expect(screen.getByText('מטריצה סיסטמית')).toBeTruthy();
    expect(screen.getByText(/זמין במחשב/)).toBeTruthy();
    expect(screen.getByText('המטריצה דורשת עמודות מרובות זו לצד זו.')).toBeTruthy();
    expect(
      screen.getByText('אפשר לתרגל זיהוי דפוסים ולסקור תוצאות שמורות.'),
    ).toBeTruthy();
  });

  it('offers CTAs that route back to mobile-friendly features', () => {
    window.location.hash = '#matrix-workbench';
    render(<MobileFallback feature={desktopOnlyFeature} />);
    fireEvent.click(screen.getByText(/לתרגול מהיר/));
    expect(window.location.hash).toBe('#practice');
  });

  it('falls back to generic copy when no mobileFallback fields are provided', () => {
    render(<MobileFallback feature={{ ...desktopOnlyFeature, mobileFallback: undefined }} />);
    expect(screen.getByText(/שולחן עבודה רחב/)).toBeTruthy();
  });
});

describe('registry mobile-capability invariant', () => {
  it('every desktop-only feature declares fallback copy', () => {
    for (const f of FEATURES.filter((feature) => feature.mobileSupport === 'none')) {
      expect(f.mobileFallback?.why).toBeTruthy();
      expect(f.mobileFallback?.stillCanDo).toBeTruthy();
    }
  });
});
