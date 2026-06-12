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

    expect(screen.getByText('ברוכים הבאים! 👋')).toBeTruthy();
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
