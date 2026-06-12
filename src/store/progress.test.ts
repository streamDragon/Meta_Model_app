import { describe, expect, it } from 'vitest';
import {
  applySession,
  applyXP,
  emptyProgress,
  normalizeProgress,
  XP_REWARDS,
  updateStreak,
} from './progress';

const DAY1 = new Date('2026-06-10T12:00:00Z');
const DAY2 = new Date('2026-06-11T12:00:00Z');
const DAY5 = new Date('2026-06-14T12:00:00Z');

describe('applyXP', () => {
  it('accumulates xp and awards the first badge at 10 XP', () => {
    const { progress, newBadges } = applyXP(emptyProgress(), 10, DAY1);
    expect(progress.xp).toBe(10);
    expect(newBadges.map((b) => b.id)).toContain('first_step');
  });

  it('does not award the same badge twice', () => {
    const first = applyXP(emptyProgress(), 10, DAY1);
    const second = applyXP(first.progress, 10, DAY1);
    expect(second.newBadges).toHaveLength(0);
    expect(second.progress.badges).toHaveLength(first.progress.badges.length);
  });

  it('awards the 100 XP badge when crossing the threshold', () => {
    const { progress } = applyXP(emptyProgress(), 95, DAY1);
    const { newBadges } = applyXP(progress, 10, DAY1);
    expect(newBadges.map((b) => b.id)).toContain('xp_100');
  });

  it('defines CBT XP rewards and badges without changing old progress fields', () => {
    expect(XP_REWARDS.thoughtMapComplete).toBeGreaterThan(0);
    expect(XP_REWARDS.cbtDrillCorrect).toBeGreaterThan(0);

    const { progress, newBadges } = applyXP(emptyProgress(), XP_REWARDS.thoughtMapComplete, DAY1);
    expect(progress.xp).toBe(XP_REWARDS.thoughtMapComplete);
    expect(progress.sessions).toBe(0);
    expect(newBadges.map((b) => b.id)).toContain('first_thought_map');
  });
});

describe('streak', () => {
  it('starts at 1 on the first active day', () => {
    const p = updateStreak(emptyProgress(), '2026-06-10');
    expect(p.streak).toBe(1);
    expect(p.lastSessionDate).toBe('2026-06-10');
  });

  it('does not double-count the same day', () => {
    const day1 = updateStreak(emptyProgress(), '2026-06-10');
    const again = updateStreak(day1, '2026-06-10');
    expect(again.streak).toBe(1);
  });

  it('increments on consecutive days and resets after a gap', () => {
    const day1 = applyXP(emptyProgress(), 10, DAY1).progress;
    const day2 = applyXP(day1, 10, DAY2).progress;
    expect(day2.streak).toBe(2);
    const day5 = applyXP(day2, 10, DAY5).progress;
    expect(day5.streak).toBe(1);
  });
});

describe('applySession', () => {
  it('increments sessions and eventually awards the sessions badge', () => {
    let p = emptyProgress();
    for (let i = 0; i < 10; i++) {
      p = applySession(p, DAY1).progress;
    }
    expect(p.sessions).toBe(10);
    expect(p.badges.map((b) => b.id)).toContain('sessions_10');
  });
});

describe('normalizeProgress', () => {
  it('repairs corrupt stored values', () => {
    expect(normalizeProgress(null)).toEqual(emptyProgress());
    expect(normalizeProgress('garbage')).toEqual(emptyProgress());
    const partial = normalizeProgress({ xp: 50 });
    expect(partial.xp).toBe(50);
    expect(partial.badges).toEqual([]);
  });
});
