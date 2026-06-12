// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CBT_LESSON_PROGRESS_KEY,
  CBT_PRACTICE_PROGRESS_KEY,
  CBT_SESSIONS_KEY,
  loadCbtLessonProgress,
  loadCbtPracticeProgress,
  loadCbtSessions,
  saveCbtSession,
  saveLessonComplete,
  savePracticeCorrect,
} from './cbtStorage';

describe('cbtStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('uses migration-safe CBT localStorage keys without touching userProgress', () => {
    window.localStorage.setItem('userProgress', JSON.stringify({ xp: 40 }));

    saveCbtSession({
      sessionId: 's1',
      kind: 'thought-map',
      title: 'מפת מחשבה',
      createdAt: '2026-06-12T00:00:00.000Z',
      updatedAt: '2026-06-12T00:00:00.000Z',
    });
    savePracticeCorrect('shortcut-1');
    saveLessonComplete('thought-is-map');

    expect(window.localStorage.getItem(CBT_SESSIONS_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(CBT_PRACTICE_PROGRESS_KEY)).toBeTruthy();
    expect(window.localStorage.getItem(CBT_LESSON_PROGRESS_KEY)).toBeTruthy();
    expect(JSON.parse(window.localStorage.getItem('userProgress') ?? '{}').xp).toBe(40);
    expect(loadCbtSessions()).toHaveLength(1);
    expect(loadCbtPracticeProgress().correctByItem['shortcut-1']).toBe(1);
    expect(loadCbtLessonProgress().completedLessonIds).toContain('thought-is-map');
  });

  it('recovers from corrupt stored values', () => {
    window.localStorage.setItem(CBT_SESSIONS_KEY, '{bad json');
    window.localStorage.setItem(CBT_PRACTICE_PROGRESS_KEY, 'null');
    window.localStorage.setItem(CBT_LESSON_PROGRESS_KEY, '42');

    expect(loadCbtSessions()).toEqual([]);
    expect(loadCbtPracticeProgress().correctByItem).toEqual({});
    expect(loadCbtLessonProgress().completedLessonIds).toEqual([]);
  });
});
