// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RuptureWorkshopPage } from './RuptureWorkshopPage';
afterEach(cleanup);
describe('independent rupture workshop', () => {
  it('supports an internal route without a blocking dialog', () => {
    window.location.hash='rupture-workshop';
    render(<RuptureWorkshopPage />);
    expect(screen.getByRole('region', {name:'סדנת פיצוצים והתנגדויות'})).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'זה לא מקדם אותי'}));
    expect(screen.getByText(/כל הזמן אותן שאלות/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button',{name:'חזרה'}));
    expect(window.location.hash).toBe('#sleight-workshop');
  });
});
