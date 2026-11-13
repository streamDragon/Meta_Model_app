// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProgressProvider } from '../../store/useProgress';
import { STORAGE_KEY } from '../../store/progress';
import { GuidedMetaGym } from './GuidedMetaGym';

beforeEach(() => {
  localStorage.clear();
  window.scrollTo = vi.fn();
});
afterEach(cleanup);

const CORRECT_ANSWERS = [
  'מה בדיוק קשה לך בשאלה?',
  'קשה מדי ביחס למה?',
  'מה אתה מסיק מכך שקשה לך כרגע?',
  /אתה מתקשה להתחיל את סעיף ב׳ לעומת היסטוריה/,
  'איך הקושי להתחיל עכשיו מוכיח שלא תצליח במבחן?',
  'איזו דרך נוספת תוכל לנסות כדי להתחיל?',
];

describe('GuidedMetaGym', () => {
  it('records one completed session and offers onward links on finish', () => {
    render(<ProgressProvider><GuidedMetaGym /></ProgressProvider>);
    for (const answer of CORRECT_ANSWERS) {
      fireEvent.click(screen.getByRole('button', { name: answer }));
      fireEvent.click(screen.getByRole('button', { name: /ממשיכים|עוברים/ }));
    }
    expect(screen.getByText('נפתחו אפשרויות חדשות!')).toBeTruthy();
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    expect(stored.sessions).toBe(1);
    expect(stored.xp).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /אימון שיחה/ }));
    expect(window.location.hash).toBe('#conversation');
    fireEvent.click(screen.getByRole('button', { name: /תרגול זיהוי/ }));
    expect(window.location.hash).toBe('#practice');
  });
});
