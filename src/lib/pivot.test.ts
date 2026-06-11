import { describe, expect, it } from 'vitest';
import { computePivotRecommendation } from './pivot';
import type { PrismAnswer, PrismSession } from '../types';

function answer(level: PrismAnswer['level']): PrismAnswer {
  return {
    level,
    label: level,
    text: 'בחירה',
    choice_id: 'x',
    recovery_question: 'שאלה',
  };
}

function session(answers: PrismAnswer[], resistance = 2): PrismSession {
  return {
    datetime: '2026-06-11T00:00:00.000Z',
    prism_id: 'cause_effect',
    prism_name: 'סיבה–תוצאה',
    anchor: 'שאלת עוגן',
    answers,
    emotion: 3,
    resistance,
  };
}

describe('computePivotRecommendation', () => {
  it('recommends a lower level for identity-heavy answers with high resistance', () => {
    const rec = computePivotRecommendation(
      session([answer('I'), answer('B')], 4),
    );
    expect(rec.pivot).toBe('B');
    expect(rec.reason).toContain('Small Win');
  });

  it('falls through identity rule when no lower level was answered', () => {
    const rec = computePivotRecommendation(session([answer('I')], 5));
    // No B/C/E answers -> falls back to max-count level, which is I.
    expect(rec.pivot).toBe('I');
  });

  it('picks the level with the most answers otherwise', () => {
    const rec = computePivotRecommendation(
      session([answer('C'), answer('C'), answer('V')]),
    );
    expect(rec.pivot).toBe('C');
  });

  it('breaks ties toward the lower level (E before I)', () => {
    const rec = computePivotRecommendation(session([answer('E'), answer('I')]));
    expect(rec.pivot).toBe('E');
  });

  it('defaults to E with guidance when nothing was answered', () => {
    const rec = computePivotRecommendation(session([]));
    expect(rec.pivot).toBe('E');
    expect(rec.reason).toContain('לא נמצאו תשובות');
  });
});
