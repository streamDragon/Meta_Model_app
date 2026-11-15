import { describe, expect, it } from 'vitest';
import { content } from '../data/content';
import {
  addDays,
  buildDailySet,
  checklistFor,
  DAILY_SET_SIZE,
  emptyDailyState,
  markDayComplete,
  normalizeDailyState,
  PATTERN_CHECKLIST,
  PATTERN_HEBREW,
  recordDailyResult,
  writtenSuccess,
  type DailyState,
} from './dailySet';

const statements = content.practice_statements;
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};
const TODAY = '2026-11-15';

describe('buildDailySet', () => {
  it('builds 8 items in the order warm-up, goal, write, last item', () => {
    const items = buildDailySet(statements, emptyDailyState(), TODAY, seeded(7));
    expect(items).toHaveLength(DAILY_SET_SIZE);
    expect(items.map((i) => i.phase)).toEqual(['warmup', 'warmup', 'warmup', 'goal', 'goal', 'write', 'write', 'write']);
  });

  it('never repeats a sentence and mixes the three families in the warm-up', () => {
    for (let seed = 1; seed < 40; seed++) {
      const items = buildDailySet(statements, emptyDailyState(), TODAY, seeded(seed));
      expect(new Set(items.map((i) => i.statement.id)).size).toBe(items.length);
      expect(new Set(items.slice(0, 3).map((i) => i.statement.category)).size).toBe(3);
    }
  });

  it('offers the right pattern among three, from different families', () => {
    const items = buildDailySet(statements, emptyDailyState(), TODAY, seeded(3));
    for (const item of items.filter((i) => i.kind === 'recognize')) {
      expect(item.options).toHaveLength(3);
      expect(item.options).toContain(item.answer);
      expect(item.options.every((id) => PATTERN_HEBREW[id])).toBe(true);
    }
  });

  it('offers the model question in goal items alongside off-target questions', () => {
    const items = buildDailySet(statements, emptyDailyState(), TODAY, seeded(11));
    for (const item of items.filter((i) => i.kind === 'goal')) {
      expect(item.options).toContain(item.statement.suggested_question);
      expect(new Set(item.options).size).toBe(item.options.length);
    }
  });

  it('ends with a due review, and keeps queued sentences out of the rest of the set', () => {
    const queued = statements[5];
    const state: DailyState = {
      ...emptyDailyState(),
      queue: [{ statementId: queued.id, kind: 'write', due: TODAY, step: 0 }],
    };
    const items = buildDailySet(statements, state, TODAY, seeded(5));
    const last = items[items.length - 1];
    expect(last.phase).toBe('review');
    expect(last.statement.id).toBe(queued.id);
    expect(items.slice(0, -1).some((i) => i.statement.id === queued.id)).toBe(false);
  });

  it('does not bring back a review before it is due', () => {
    const state: DailyState = {
      ...emptyDailyState(),
      queue: [{ statementId: statements[0].id, kind: 'recognize', due: addDays(TODAY, 1), step: 0 }],
    };
    const items = buildDailySet(statements, state, TODAY, seeded(9));
    expect(items.some((i) => i.phase === 'review')).toBe(false);
  });
});

describe('review queue', () => {
  const item = (phase: 'write' | 'review') =>
    ({ ...buildDailySet(statements, emptyDailyState(), TODAY, seeded(2))[5], phase });

  it('brings a miss back after 1 day, then 3, then 7, then lets it go', () => {
    let state = recordDailyResult(emptyDailyState(), item('write'), false, TODAY);
    expect(state.queue[0]).toMatchObject({ due: '2026-11-16', step: 0 });
    state = recordDailyResult(state, item('review'), true, '2026-11-16');
    expect(state.queue[0]).toMatchObject({ due: '2026-11-19', step: 1 });
    state = recordDailyResult(state, item('review'), true, '2026-11-19');
    expect(state.queue[0]).toMatchObject({ due: '2026-11-26', step: 2 });
    state = recordDailyResult(state, item('review'), true, '2026-11-26');
    expect(state.queue).toHaveLength(0);
  });

  it('restarts the schedule when a review is missed again', () => {
    let state = recordDailyResult(emptyDailyState(), item('write'), false, TODAY);
    state = recordDailyResult(state, item('review'), true, '2026-11-16');
    state = recordDailyResult(state, item('review'), false, '2026-11-19');
    expect(state.queue[0]).toMatchObject({ due: '2026-11-20', step: 0 });
  });

  it('counts attempts and hits per pattern', () => {
    const it1 = item('write');
    let state = recordDailyResult(emptyDailyState(), it1, true, TODAY);
    state = recordDailyResult(state, it1, false, TODAY);
    expect(state.patterns[it1.statement.subcategory]).toEqual({ attempts: 2, hits: 1 });
  });
});

describe('written answers and storage', () => {
  it('needs some text and the core checklist point', () => {
    expect(writtenSuccess('איך אתה יודע?', [true, false])).toBe(true);
    expect(writtenSuccess('איך אתה יודע?', [false, true])).toBe(false);
    expect(writtenSuccess('  ', [true, true])).toBe(false);
  });

  it('has a checklist for every pattern in the practice sentences, ending with the no-why rule', () => {
    for (const s of statements) {
      expect(PATTERN_CHECKLIST[s.subcategory]).toBeDefined();
      const list = checklistFor(s.subcategory);
      expect(list[list.length - 1]).toContain('למה');
    }
  });

  it('survives bad stored data and records each day once', () => {
    expect(normalizeDailyState('garbage')).toEqual(emptyDailyState());
    expect(normalizeDailyState({ queue: [{ statementId: 'x' }], completedDays: [3, TODAY] }).completedDays).toEqual([TODAY]);
    const once = markDayComplete(emptyDailyState(), TODAY);
    expect(markDayComplete(once, TODAY).completedDays).toEqual([TODAY]);
  });
});
