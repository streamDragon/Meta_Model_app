// @vitest-environment jsdom
// End-to-end user flows (Phase 6 QA): every lab's happy path, with special
// attention to the XP economy that was broken in the legacy app (audit B1).
import { afterEach, beforeEach, describe, expect, it, vi, beforeAll } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import App from './App';

beforeAll(() => {
  window.scrollTo = vi.fn();
});

beforeEach(() => {
  window.localStorage.clear();
  window.location.hash = '';
});

afterEach(cleanup);

function storedProgress() {
  return JSON.parse(window.localStorage.getItem('userProgress') ?? '{}');
}

function setMobileViewport(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('Blueprint flow', () => {
  it('completes all four steps and awards +20 XP exactly once', () => {
    window.location.hash = 'blueprint';
    render(<App />);
    const section = document.getElementById('blueprint')!;

    // Step 1: pick an action
    const actionSelect = within(section).getByLabelText('בחירת פעולה') as HTMLSelectElement;
    const actionValue = actionSelect.options[1].value;
    fireEvent.change(actionSelect, { target: { value: actionValue } });
    fireEvent.click(within(section).getByText('חלץ ובנה Blueprint ←'));

    // Step 2: fill the two required wizard fields (all selects are in the DOM)
    const successSelect = within(section).getByLabelText('תוצאה') as HTMLSelectElement;
    fireEvent.change(successSelect, { target: { value: successSelect.options[1].value } });
    const firstStepSelect = within(section).getByLabelText('צעד ראשון') as HTMLSelectElement;
    fireEvent.change(firstStepSelect, { target: { value: firstStepSelect.options[1].value } });
    fireEvent.click(within(section).getByText('בדיקת פער ציפיות ←'));

    // Step 3: who expects
    fireEvent.change(within(section).getByLabelText(/מי מצפה/), {
      target: { value: 'self' },
    });
    fireEvent.click(within(section).getByText('צעד הבא ותוכנית ←'));

    // Step 4 reached: final plan visible, XP awarded once
    expect(within(section).getByText('תוכנית הביצוע סופית ✨')).toBeTruthy();
    expect(storedProgress().xp).toBe(20);
    expect(storedProgress().sessions).toBe(1);
  });

  it('blocks step 2 without an action and shows a toast instead of alert', () => {
    window.location.hash = 'blueprint';
    render(<App />);
    const section = document.getElementById('blueprint')!;
    fireEvent.click(within(section).getByText('חלץ ובנה Blueprint ←'));
    expect(screen.getByRole('status').textContent).toContain('בחר פעולה');
    expect(storedProgress().xp ?? 0).toBe(0);
  });
});

describe('Prism Lab flow', () => {
  it('maps a prism, shows a pivot recommendation, saves the session, awards +15 XP', () => {
    window.location.hash = 'prismlab';
    render(<App />);
    const section = document.getElementById('prismlab')!;

    fireEvent.click(within(section).getAllByText('בחר פריזמה')[0]);
    fireEvent.click(within(section).getByText('מפה והמלץ Pivot ←'));

    expect(within(section).getByText('המלצת Pivot')).toBeTruthy();
    expect(storedProgress().xp).toBe(15);
    const sessions = JSON.parse(window.localStorage.getItem('prism_sessions') ?? '[]');
    expect(sessions).toHaveLength(1);
    expect(sessions[0].recommendation.pivot).toBeTruthy();
  });
});

describe('Values Lab flow', () => {
  it('starts from a prepared scenario without typing, card authoring, or JSON export', () => {
    window.location.hash = 'valueslab';
    render(<App />);
    const section = document.getElementById('valueslab')!;

    expect(within(section).queryByLabelText('משפט פתיחה')).toBeNull();

    fireEvent.click(within(section).getByRole('button', { name: /אוכל/ }));
    expect(within(section).getByRole('heading', { level: 3 }).textContent).toContain('לאכול');
    expect(within(section).queryByText('＋ הוסף ערך / אילוץ')).toBeNull();
    expect(within(section).queryByText(/ייצא JSON/)).toBeNull();

    fireEvent.click(within(section).getByText('🩺 אבחן: למה זה תקוע?'));
    expect(storedProgress().xp).toBe(15);
    expect(storedProgress().sessions).toBe(1);

    // session auto-saved under the legacy key
    const saved = JSON.parse(window.localStorage.getItem('vcl_sessions') ?? '[]');
    expect(saved).toHaveLength(1);
    expect(saved[0].constraints.length).toBeGreaterThan(1);
  });

  it('uses a closed mobile card stack with no free-form add or edit actions', () => {
    setMobileViewport(true);
    window.location.hash = 'valueslab';
    render(<App />);
    const section = document.getElementById('valueslab')!;

    fireEvent.click(within(section).getByRole('button', { name: /להשתנות בלי לאבד את עצמי/ }));

    expect(within(section).getByText(/כרטיס 1 מתוך/)).toBeTruthy();
    expect(within(section).getByText('הבא')).toBeTruthy();
    expect(within(section).queryByText('＋ הוסף ערך / אילוץ')).toBeNull();
    expect(within(section).queryByText(/ערוך/)).toBeNull();
    expect(within(section).queryByLabelText('מחק התנגשות')).toBeNull();
  });
});

describe('Categories → Trainer bridge', () => {
  it('launches a filtered trainer session from a category card', async () => {
    window.location.hash = 'categories';
    render(<App />);
    const section = document.getElementById('categories')!;

    fireEvent.click(within(section).getAllByText('תרגל קטגוריה זו')[0]);

    expect(window.location.hash).toBe('#practice');
    // jsdom dispatches hashchange asynchronously; the practice tab mounts then
    await waitFor(() => {
      const trainer = document.getElementById('practice');
      expect(trainer?.querySelector('#trainer-mode')).toBeTruthy();
    });
    const questionText = document.querySelector('#practice .question-text');
    expect(questionText?.textContent?.length).toBeGreaterThan(0);
  });
});
