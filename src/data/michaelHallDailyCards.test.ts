import { describe, expect, it } from 'vitest';
import {
  MICHAEL_HALL_DAILY_CARD_CATEGORIES,
  michaelHallDailyCards,
} from './michaelHallDailyCards';

describe('Michael Hall daily cards', () => {
  it('seeds 21 sequential, uniquely identified training cards', () => {
    expect(michaelHallDailyCards).toHaveLength(21);

    const ids = michaelHallDailyCards.map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);

    michaelHallDailyCards.forEach((card, index) => {
      expect(card.dayIndex).toBe(index + 1);
      expect(card.id).toMatch(/^mh-day-\d{2}$/);
      expect(card.titleHe).toBeTruthy();
      expect(card.titleEn).toBeTruthy();
      expect(card.distilledTeachingHe).toBeTruthy();
      expect(card.keyDistinctionHe).toBeTruthy();
      expect(card.dailyQuestionHe).toBeTruthy();
      expect(card.applyTodayHe).toBeTruthy();
      expect(card.sourceTitle).toBeTruthy();
      expect(card.sourceSeries).toBeTruthy();
      expect(card.sourceNoteHe).toContain('פרפרזה');
      expect(MICHAEL_HALL_DAILY_CARD_CATEGORIES).toContain(card.category);
    });
  });

  it('keeps committed public cards compact and exercise-oriented', () => {
    for (const card of michaelHallDailyCards) {
      expect(card.distilledTeachingHe.length).toBeLessThanOrEqual(360);
      expect(card.keyDistinctionHe.length).toBeLessThanOrEqual(260);
      expect(card.dailyQuestionHe.length).toBeLessThanOrEqual(180);
      expect(card.applyTodayHe.length).toBeLessThanOrEqual(220);
      expect(card.exercisesHe.length).toBeGreaterThanOrEqual(2);
      expect(card.exercisesHe.length).toBeLessThanOrEqual(4);
      expect(card.exercisesHe.every((exercise) => exercise.length <= 180)).toBe(true);
      expect(card.tags.length).toBeGreaterThan(0);
    }
  });
});
