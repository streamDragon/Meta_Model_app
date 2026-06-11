import { describe, expect, it } from 'vitest';
import {
  buildMcqOptions,
  buildTrainerQuestions,
  completionMessage,
  successRate,
} from './trainer';
import { shuffle } from './random';
import { content } from '../data/content';

// Deterministic LCG for reproducible shuffles in tests.
function seededRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('shuffle', () => {
  it('keeps all elements and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input, seededRng(7));
    expect(out.slice().sort()).toEqual([1, 2, 3, 4, 5]);
    expect(input).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic for a given rng seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], seededRng(42))).toEqual(
      shuffle([1, 2, 3, 4, 5], seededRng(42)),
    );
  });
});

describe('buildTrainerQuestions', () => {
  it('filters by category id', () => {
    const qs = buildTrainerQuestions(content.practice_statements, 'deletion', seededRng(1));
    expect(qs.length).toBeGreaterThan(0);
    expect(qs.every((q) => q.category === 'DELETION')).toBe(true);
  });

  it('caps a session at 10 questions', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      ...content.practice_statements[0],
      id: i,
    }));
    expect(buildTrainerQuestions(many, '', seededRng(1))).toHaveLength(10);
  });

  it('shuffles instead of returning file order (audit bug B2)', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      ...content.practice_statements[0],
      id: i,
    }));
    const ids = buildTrainerQuestions(many, '', seededRng(9)).map((q) => q.id);
    expect(ids).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('returns an empty list for a category with no statements', () => {
    const onlyDeletion = content.practice_statements.filter(
      (s) => s.category === 'DELETION',
    );
    expect(buildTrainerQuestions(onlyDeletion, 'distortion', seededRng(1))).toEqual([]);
  });
});

describe('buildMcqOptions', () => {
  it('returns the three families exactly once, including the correct one', () => {
    const options = buildMcqOptions('DISTORTION', seededRng(3));
    expect(options.slice().sort()).toEqual(['DELETION', 'DISTORTION', 'GENERALIZATION']);
  });

  it('rejects unknown families', () => {
    expect(() => buildMcqOptions('NONSENSE' as never)).toThrow();
  });
});

describe('scoring', () => {
  it('computes success rate safely', () => {
    expect(successRate(0, 0)).toBe(0);
    expect(successRate(7, 10)).toBe(70);
    expect(successRate(10, 10)).toBe(100);
  });

  it('grades completion messages by rate', () => {
    expect(completionMessage(100)).toContain('מושלם');
    expect(completionMessage(85)).toContain('מעולה');
    expect(completionMessage(65)).toContain('טוב');
    expect(completionMessage(30)).toContain('בסיס טוב');
  });
});
