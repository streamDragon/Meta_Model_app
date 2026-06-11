import { describe, expect, it } from 'vitest';
import { DEFAULT_REFRAME, resolveGapHint, resolveReframe } from './blueprint';
import { content } from '../data/content';

describe('resolveGapHint', () => {
  it('maps ability ranges to hints', () => {
    expect(resolveGapHint(2, '')).toBe('יכולת נמוכה');
    expect(resolveGapHint(5, '')).toBe('חסר כלים');
    expect(resolveGapHint(8, '')).toBe('חסר אישור / הסכמה');
  });

  it('overrides with "missing knowledge" when the gap mentions minutes', () => {
    expect(resolveGapHint(8, 'חסר ידע קצר או 15 דקות הסבר')).toBe('חסר ידע');
  });
});

describe('resolveReframe', () => {
  const templates = content.blueprint_builder.reframe_templates;

  it('returns the matching template text', () => {
    const expected = templates.find((t) => t.gap_hint === 'יכולת נמוכה')!.reframe;
    expect(resolveReframe(1, '', templates)).toBe(expected);
  });

  it('falls back to the default when no template matches', () => {
    expect(resolveReframe(5, '', [])).toBe(DEFAULT_REFRAME);
  });
});
