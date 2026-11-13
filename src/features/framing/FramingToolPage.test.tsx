// @vitest-environment jsdom
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../../App';
import { certaintyBand, FRAME_DISCOVERIES } from '../../data/framingDemo';

beforeEach(() => {
  localStorage.clear();
  window.location.hash = 'framing';
  window.scrollTo = vi.fn();
  Object.defineProperty(window, 'matchMedia', {
    writable: true, value: vi.fn().mockImplementation(() => ({
      matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
    })),
  });
});
afterEach(cleanup);

describe('framing discovery lab', () => {
  it('starts empty, reveals an answer and updates the map only when confirmed', () => {
    render(<App />);
    const root = document.getElementById('framing')!;
    const progress = within(root).getByRole('progressbar', { name: 'חלקים שנחשפו' });
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    fireEvent.click(within(root).getByRole('button', { name: 'שאל שאלה' }));
    expect(progress.getAttribute('aria-valuenow')).toBe('0');
    expect(within(root).getByText(FRAME_DISCOVERIES[0].response)).toBeTruthy();
    fireEvent.click(within(root).getByRole('button', { name: 'שאל על ודאות' }));
    expect(within(root).getByText('10 מתוך 10')).toBeTruthy();
    fireEvent.click(within(root).getByRole('button', { name: 'הוסף למפה' }));
    expect(progress.getAttribute('aria-valuenow')).toBe('1');
    fireEvent.click(within(root).getByRole('button', { name: /פתח מפה/ }));
    expect(within(root).getAllByText(FRAME_DISCOVERIES[0].mapText).length).toBeGreaterThan(0);
    expect(within(root).getByText('מפת קשרים')).toBeTruthy();
  });

  it('lets the speaker certainty remain unknown, and resetting the topic clears the map', () => {
    render(<App />);
    const root = document.getElementById('framing')!;
    fireEvent.click(within(root).getByRole('button', { name: 'שאל שאלה' }));
    fireEvent.click(within(root).getByRole('button', { name: 'דלג על ודאות' }));
    expect(within(root).getByText(/ביטחון: לא נבדק/)).toBeTruthy();
    fireEvent.click(within(root).getByRole('button', { name: 'מטרה' }));
    expect(within(root).getByRole('progressbar', { name: 'חלקים שנחשפו' }).getAttribute('aria-valuenow')).toBe('0');
  });

  it('auto-advances through zones, shows one grid, and ends with a summary card', () => {
    render(<App />);
    const root = document.getElementById('framing')!;
    fireEvent.click(within(root).getByRole('button', { name: /פתח מפה/ }));
    expect(root.querySelector('.ft-area-grid')).toBeNull();
    expect(root.querySelectorAll('.ft-diagram-area').length).toBeGreaterThan(0);
    for (let i = 0; i < FRAME_DISCOVERIES.length; i += 1) {
      fireEvent.click(within(root).getByRole('button', { name: 'שאל שאלה' }));
      fireEvent.click(within(root).getByRole('button', { name: 'דלג על ודאות' }));
    }
    expect(within(root).getByRole('progressbar', { name: 'חלקים שנחשפו' }).getAttribute('aria-valuenow')).toBe(String(FRAME_DISCOVERIES.length));
    expect(within(root).queryByText(/בחר אזור נוסף/)).toBeNull();
    const summary = within(root).getByLabelText('סיכום המפה');
    expect(within(summary).getByRole('link', { name: /אימון שיחה/ }).getAttribute('href')).toBe('#conversation');
  });

  it('keeps internal certainty separate from objective truth', () => {
    expect(certaintyBand(null)).toBe('unknown');
    expect(certaintyBand(3)).toBe('low');
    expect(certaintyBand(6)).toBe('medium');
    expect(certaintyBand(9)).toBe('high');
  });

  it('exposes framing from conversation practice without increasing mobile bottom-nav items', () => {
    window.location.hash = 'conversation';
    render(<App />);
    const root = document.getElementById('conversation')!;
    expect(within(root).getByRole('button', { name: /לגלות את מפת האדם/ })).toBeTruthy();
    expect(within(screen.getByLabelText('ניווט מהיר במובייל')).getAllByRole('button')).toHaveLength(5);
  });
});
