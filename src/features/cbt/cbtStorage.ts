import type { CbtStoredSession } from '../../types/cbt';

export const CBT_SESSIONS_KEY = 'cbtSessions';
export const CBT_PRACTICE_PROGRESS_KEY = 'cbtPracticeProgress';
export const CBT_LESSON_PROGRESS_KEY = 'cbtLessonProgress';

export interface CbtPracticeProgress {
  correctByItem: Record<string, number>;
  updatedAt: string | null;
}

export interface CbtLessonProgress {
  completedLessonIds: string[];
  updatedAt: string | null;
}

function readJson<T>(key: string, fallback: T, guard: (value: unknown) => value is T): T {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key) || 'null');
    return guard(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage unavailable - keep the on-screen result only
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isSessionArray(value: unknown): value is CbtStoredSession[] {
  return Array.isArray(value);
}

function isPracticeProgress(value: unknown): value is CbtPracticeProgress {
  return isRecord(value) && isRecord(value.correctByItem);
}

function isLessonProgress(value: unknown): value is CbtLessonProgress {
  return isRecord(value) && Array.isArray(value.completedLessonIds);
}

export function loadCbtSessions(): CbtStoredSession[] {
  return readJson(CBT_SESSIONS_KEY, [], isSessionArray);
}

export function saveCbtSession(session: CbtStoredSession): CbtStoredSession[] {
  const sessions = loadCbtSessions().filter((item) => item.sessionId !== session.sessionId);
  sessions.unshift(session);
  const limited = sessions.slice(0, 20);
  writeJson(CBT_SESSIONS_KEY, limited);
  return limited;
}

export function loadCbtPracticeProgress(): CbtPracticeProgress {
  return readJson(
    CBT_PRACTICE_PROGRESS_KEY,
    { correctByItem: {}, updatedAt: null },
    isPracticeProgress,
  );
}

export function savePracticeCorrect(itemId: string): CbtPracticeProgress {
  const progress = loadCbtPracticeProgress();
  const next: CbtPracticeProgress = {
    correctByItem: {
      ...progress.correctByItem,
      [itemId]: (progress.correctByItem[itemId] ?? 0) + 1,
    },
    updatedAt: new Date().toISOString(),
  };
  writeJson(CBT_PRACTICE_PROGRESS_KEY, next);
  return next;
}

export function loadCbtLessonProgress(): CbtLessonProgress {
  return readJson(
    CBT_LESSON_PROGRESS_KEY,
    { completedLessonIds: [], updatedAt: null },
    isLessonProgress,
  );
}

export function saveLessonComplete(lessonId: string): CbtLessonProgress {
  const progress = loadCbtLessonProgress();
  const completedLessonIds = Array.from(new Set([...progress.completedLessonIds, lessonId]));
  const next = { completedLessonIds, updatedAt: new Date().toISOString() };
  writeJson(CBT_LESSON_PROGRESS_KEY, next);
  return next;
}
