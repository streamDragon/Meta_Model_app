// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { GForceClinicPage } from './GForceClinicPage';

beforeEach(() => { window.scrollTo = vi.fn(); });
afterEach(cleanup);

describe('Clinic gameplay', () => {
  it('starts with a fictional case rather than asking the learner to organize personal life', () => {
    render(<GForceClinicPage />);
    expect(screen.getByText('אתה המטפל. איך תתחיל?')).toBeTruthy();
    expect(screen.getByText(/דמות בדיונית|אדם בדיוני/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /כניסה לפגישה/ })).toBeTruthy();
  });

  it('keeps visual cards hidden until sensory exploration', () => {
    render(<GForceClinicPage />);
    fireEvent.click(screen.getByRole('button', { name: /כניסה לפגישה/ }));
    expect(screen.getByText(/אין עדיין תמונות גלויות/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /כשאתה אומר ״בלגן״/ }));
    expect(screen.getByText(/נחשף קלף חדש/)).toBeTruthy();
    expect(screen.getByText(/מצב שנחשף · מה רואים עכשיו/)).toBeTruthy();
  });

  it('allows detours to repair rapport and multiple question families', () => {
    render(<GForceClinicPage />);
    fireEvent.click(screen.getByRole('button', { name: /כניסה לפגישה/ }));
    fireEvent.click(screen.getByRole('button', { name: '🎯 G-Force · מטרה ומשאבים' }));
    fireEvent.click(screen.getByRole('button', { name: /אז תגיד לי מיד את כל השלבים/ }));
    expect(screen.getByText(/אם זה רק לתת רשימת משימות/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /לבדוק קשר ולתקן/ }));
    expect(screen.getByText(/הכי קשה לי זה שאני כבר מתבייש/)).toBeTruthy();
  });
});
