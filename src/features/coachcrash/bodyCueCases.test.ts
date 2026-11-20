import { describe, expect, it } from 'vitest';
import { BODY_CUE_CASES, BODY_CUE_COUNT, ZONE_LABELS } from './bodyCueCases';

describe('body cue exercise content', () => {
  it('contains exactly 20 unique exercises', () => {
    expect(BODY_CUE_COUNT).toBe(20);
    expect(new Set(BODY_CUE_CASES.map((entry) => entry.id)).size).toBe(20);
  });
  it('includes coach, crash and ambiguous examples', () => {
    expect(BODY_CUE_CASES.filter((entry) => entry.group === 'coach').length).toBe(5);
    expect(BODY_CUE_CASES.filter((entry) => entry.group === 'crash').length).toBe(5);
    expect(BODY_CUE_CASES.filter((entry) => entry.group === 'ambiguous').length).toBe(10);
  });
  it('always distinguishes observations from interpretation', () => {
    for (const entry of BODY_CUE_CASES) {
      expect(entry.observation.trim()).not.toBe('');
      expect(entry.assumption.trim()).not.toBe('');
      expect(entry.alternative.trim()).not.toBe('');
      expect(entry.bodyPractice.trim()).not.toBe('');
      expect(entry.imageryPractice.trim()).not.toBe('');
      expect(entry.zones.length).toBeGreaterThan(0);
      for (const zone of entry.zones) {
        expect(ZONE_LABELS[zone]).toBeTruthy();
      }
    }
  });
});
