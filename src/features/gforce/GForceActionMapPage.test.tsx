// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { GForceActionMapPage } from './GForceActionMapPage';

beforeEach(() => {
  window.localStorage.clear();
  window.URL.createObjectURL = vi.fn(() => 'blob:map-preview');
  window.URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('G-Force visual action map', () => {
  it('starts from a real task with resources and a visible next transition', () => {
    render(<GForceActionMapPage />);
    expect(screen.getByRole('heading', { name: /מפת המהלך שלי/ })).toBeTruthy();
    expect(screen.getByLabelText('המצב עכשיו')).toBeTruthy();
    expect(screen.getByLabelText('כך אדע שהצלחתי')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'מטאטא' })).toBeTruthy();
    expect(screen.getByText('0/3 צעדים הושלמו')).toBeTruthy();
  });

  it('allows atomic steps and a genuine unknown state', () => {
    render(<GForceActionMapPage />);
    fireEvent.click(screen.getByRole('button', { name: 'בוצע: להרים חפץ אחד' }));
    expect(screen.getByText('1/3 צעדים הושלמו')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'לא ברור: לטאטא את הרצפה הגלויה' }));
    expect(screen.getByRole('button', { name: 'לא ברור: לטאטא את הרצפה הגלויה' }).className).toContain('chosen');
    fireEvent.change(screen.getByLabelText('פעולה חדשה'), { target: { value: 'להניח את המטאטא ליד הדלת' } });
    fireEvent.click(screen.getByRole('button', { name: '+ הוסף' }));
    expect(screen.getByText('להניח את המטאטא ליד הדלת')).toBeTruthy();
    expect(screen.getByText('1/4 צעדים הושלמו')).toBeTruthy();
  });

  it('keeps G-Force questions optional and does not pretend to submit cases', () => {
    render(<GForceActionMapPage />);
    expect(screen.queryByText('למה זה חשוב לי?')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'פתח שאלות עומק' }));
    expect(screen.getByText('למה זה חשוב לי?')).toBeTruthy();
    expect(screen.getByText(/אינו נשלח למנהל האתר/)).toBeTruthy();
  });

  it('retains chosen resources in local storage without a model API', () => {
    render(<GForceActionMapPage />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'מטאטא' }));
    const data = JSON.parse(window.localStorage.getItem('wisdom:gforce-action-map:v2') ?? '{}');
    expect(data.schemaVersion).toBe(2);
    expect(data.resources.find((entry: { id: string }) => entry.id === 'broom').ready).toBe(true);
  });
});
