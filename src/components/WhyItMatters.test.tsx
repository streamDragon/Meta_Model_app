// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { WhyItMatters } from './WhyItMatters';
import {
  FEATURE_REASONS,
  GENERAL_REASONS,
  pickReason,
} from '../data/whyItMatters';
import { FEATURES } from '../registry';

afterEach(cleanup);

describe('WhyItMatters', () => {
  it('opens a big-picture reason when the button is pressed', () => {
    render(<WhyItMatters featureId="practice" rng={() => 0} />);
    fireEvent.click(screen.getByRole('button', { name: /למה זה חשוב/ }));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/התמונה הגדולה/)).toBeTruthy();
    expect(screen.getByText('בשיחה אמיתית יש לכם שתי שניות')).toBeTruthy();
  });

  it('re-rolls to a different reason on "עוד סיבה"', () => {
    render(<WhyItMatters featureId="practice" rng={() => 0} />);
    fireEvent.click(screen.getByRole('button', { name: /למה זה חשוב/ }));
    const first = screen.getByRole('heading', { level: 3 }).textContent;
    fireEvent.click(screen.getByText(/עוד סיבה/));
    const second = screen.getByRole('heading', { level: 3 }).textContent;
    expect(second).not.toBe(first);
  });

  it('closes with the close button', () => {
    render(<WhyItMatters featureId="home" rng={() => 0} />);
    fireEvent.click(screen.getByRole('button', { name: /למה זה חשוב/ }));
    fireEvent.click(screen.getByLabelText('סגירה'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('falls back to general reasons for features without their own pool', () => {
    const reason = pickReason('some-unknown-feature', undefined, () => 0);
    expect(GENERAL_REASONS.some((r) => r.title === reason.title)).toBe(true);
  });
});

describe('whyItMatters data invariants', () => {
  it('only references valid feature ids', () => {
    const validIds = new Set(FEATURES.map((f) => f.id));
    for (const key of Object.keys(FEATURE_REASONS)) {
      expect(validIds.has(key)).toBe(true);
    }
  });

  it('never repeats the excluded reason when alternatives exist', () => {
    for (const f of FEATURES) {
      const first = pickReason(f.id, undefined, () => 0);
      for (let i = 0; i < 20; i++) {
        const next = pickReason(f.id, first, Math.random);
        expect(next.title).not.toBe(first.title);
      }
    }
  });
});
