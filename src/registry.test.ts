import { describe, expect, it } from 'vitest';
import { FEATURES } from './registry';

describe('feature registry', () => {
  it('has unique ids and routes', () => {
    const ids = FEATURES.map((f) => f.id);
    const routes = FEATURES.map((f) => f.route);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(routes).size).toBe(routes.length);
  });

  it('uses hash routes that match feature ids', () => {
    for (const f of FEATURES) {
      expect(f.route).toBe(`#${f.id}`);
    }
  });

  it('declares all required metadata on every feature', () => {
    for (const f of FEATURES) {
      expect(f.title.length).toBeGreaterThan(0);
      expect(f.shortDescription.length).toBeGreaterThan(0);
      expect(f.skillTrained.length).toBeGreaterThan(0);
      expect(f.dataSource.length).toBeGreaterThan(0);
      expect(f.navLabel.length).toBeGreaterThan(0);
      expect(['full', 'partial', 'none']).toContain(f.desktopSupport);
      expect(['full', 'partial', 'none']).toContain(f.mobileSupport);
      expect(['production', 'beta', 'prototype', 'broken']).toContain(f.status);
      expect(typeof f.component).toBe('function');
    }
  });

  it('keeps the mobile bottom nav at five items or fewer', () => {
    const bottom = FEATURES.filter((f) => f.inBottomNav);
    expect(bottom.length).toBeLessThanOrEqual(5);
    for (const f of FEATURES) {
      expect(f.icon).toBeTruthy();
    }
  });

  it('marks unvalidated NLP source material as placeholder (audit §4.2)', () => {
    const prismLab = FEATURES.find((f) => f.id === 'prismlab');
    expect(prismLab?.sourceValidation).toBe('placeholder');
  });

  it('registers the Michael Hall daily gym as a safe internal hash feature', () => {
    const dailyGym = FEATURES.find((f) => f.id === 'michael-hall-daily-gym');
    expect(dailyGym?.route).toBe('#michael-hall-daily-gym');
    expect(dailyGym?.dataSource).toContain('src/data/michaelHallDailyCards.ts');
    expect(dailyGym?.sourceValidation).toBe('placeholder');
    expect(dailyGym?.mobileSupport).toBe('full');
  });
});
