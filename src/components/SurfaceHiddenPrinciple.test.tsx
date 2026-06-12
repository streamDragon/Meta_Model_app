// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SurfaceHiddenPrinciple } from './SurfaceHiddenPrinciple';

afterEach(cleanup);

describe('SurfaceHiddenPrinciple', () => {
  it('explains the surface and hidden violation distinction without treating hidden readings as facts', () => {
    render(<SurfaceHiddenPrinciple />);

    expect(screen.getByText(/הפרה עיקרית/)).toBeTruthy();
    expect(screen.getByText(/הפרה מסתתרת/)).toBeTruthy();
    expect(screen.getByText(/קריאה אפשרית/)).toBeTruthy();
  });
});
