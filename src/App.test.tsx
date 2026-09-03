// @vitest-environment jsdom
import { describe, expect, it, vi, beforeAll, afterEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import App from './App';
import { content } from './data/content';
import { CATEGORY_LABELS } from './lib/trainer';
import { hiddenFamilies } from './lib/violationLayers';
import { FEATURES } from './registry';

beforeAll(() => {
  window.scrollTo = vi.fn();
});

afterEach(cleanup);

describe('App shell', () => {
  it('renders the brand, all registry nav links and the home screen', () => {
    render(<App />);
    // Brand appears in both the desktop rail and the mobile topbar.
    expect(screen.getAllByText('Meta Model Gym').length).toBeGreaterThanOrEqual(1);

    const tabs = screen.getByLabelText('מסכי האפליקציה');
    for (const f of FEATURES) {
      expect(within(tabs).getByText(f.navLabel)).toBeTruthy();
    }

    expect(screen.getByText('לדעת זה קל. לעשות את זה בזמן אמת — זה אימון.')).toBeTruthy();
  });

  it('shows a two-door entrance and opens course selection', () => {
    window.location.hash = 'home';
    render(<App />);

    expect(screen.getByRole('button', { name: /אני חדש/ })).toBeTruthy();
    const courseDoor = screen.getByRole('button', { name: /אני תלמיד בקורס/ });
    expect(courseDoor).toBeTruthy();

    fireEvent.click(courseDoor);

    expect(screen.getByText('מטה-מודל')).toBeTruthy();
    expect(screen.getByText('שפת ההשפעה')).toBeTruthy();
  });

  it('shows the five Shfat HaHashpaa sections in course order', () => {
    window.location.hash = 'home';
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /אני תלמיד בקורס/ }));
    fireEvent.click(screen.getByRole('button', { name: /פתח את מסלול שפת ההשפעה/ }));

    const map = screen.getByTestId('shfat-course-map');
    const sectionTitles = within(map)
      .getAllByRole('heading', { level: 4 })
      .map((node) => node.textContent);

    expect(sectionTitles).toEqual([
      'היפוך המטה-מודל',
      'עמימות, קשב ויחסים',
      'בניית משפטי השפעה',
      'העמקה ומטאפורות',
      'הנחות יסוד בשפה',
    ]);
  });

  it('reuses the existing categories route from the Meta Model course card', () => {
    window.location.hash = 'home';
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /אני תלמיד בקורס/ }));
    const metaCourse = screen.getByTestId('course-card-meta-model');
    fireEvent.click(within(metaCourse).getByRole('button', { name: 'פתח מילון' }));

    expect(window.location.hash).toBe('#categories');
  });

  it('navigates between tabs via the registry-driven nav', () => {
    window.location.hash = '';
    render(<App />);
    const tabs = screen.getByLabelText('מסכי האפליקציה');
    fireEvent.click(within(tabs).getByText('מעבדת פריזמות'));
    expect(window.location.hash).toBe('#prismlab');
  });

  it('starts a trainer session and shows an MCQ with three options', () => {
    window.location.hash = 'practice';
    render(<App />);
    fireEvent.click(screen.getByText('🎮 התחל תרגול'));
    expect(document.querySelector('#trainer-mode .question-text')?.textContent).toBeTruthy();
    const options = document.querySelectorAll('.mcq-option');
    expect(options.length).toBe(3);
  });

  it('awards XP through the progress store after a layered correct answer', () => {
    window.localStorage.clear();
    window.location.hash = 'practice';
    render(<App />);
    fireEvent.click(screen.getByText('🎮 התחל תרגול'));

    // Click the correct option (the trainer marks feedback as "נכון" only
    // when the right family is chosen) — try each option until feedback shows.
    const section = document.getElementById('practice')!;
    const questionText = section.querySelector('.question-text')?.textContent?.trim();
    const statement = content.practice_statements.find((s) => s.statement === questionText);
    expect(statement).toBeTruthy();

    fireEvent.click(within(section).getByLabelText(CATEGORY_LABELS[statement!.category]));
    fireEvent.click(within(section).getByLabelText(CATEGORY_LABELS[hiddenFamilies(statement!)[0]]));
    const stored = JSON.parse(window.localStorage.getItem('userProgress') ?? '{}');
    const feedbackShown = document.querySelector('.feedback-box');
    expect(feedbackShown).toBeTruthy();
    // XP is 10 when correct, 0 when wrong — either way progress was persisted
    // by the store the moment a session interaction happened (correct answer).
    expect(stored.xp).toBe(10);
  });
});
