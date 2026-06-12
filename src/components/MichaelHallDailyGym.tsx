import { useMemo, useState } from 'react';
import {
  michaelHallDailyCards,
  type MichaelHallDailyCard,
} from '../data/michaelHallDailyCards';
import { SurfaceHiddenPrinciple } from './SurfaceHiddenPrinciple';

const STORAGE_KEY = 'michaelHallDailyGym:v1';

interface MichaelHallDailyGymState {
  currentCardId: string;
  completedCardIds: string[];
  notesByCardId: Record<string, string>;
  exerciseChecksByCardId: Record<string, boolean[]>;
  lastCompletedDate?: string;
  streakCount: number;
}

const emptyState: MichaelHallDailyGymState = {
  currentCardId: michaelHallDailyCards[0]?.id ?? '',
  completedCardIds: [],
  notesByCardId: {},
  exerciseChecksByCardId: {},
  streakCount: 0,
};

const categoryLabelsHe: Record<MichaelHallDailyCard['category'], string> = {
  'problem-solving': 'פתרון בעיות',
  epistemology: 'אפיסטמולוגיה',
  phenomenology: 'פנומנולוגיה',
  beliefs: 'אמונות',
  'meta-programs': 'מטא-פרוגרמים',
  coaching: 'אימון',
  leadership: 'מנהיגות',
  meaning: 'משמעות',
};

function localDateKey(date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return localDateKey(yesterday);
}

function normalizeStoredState(value: unknown): MichaelHallDailyGymState {
  if (!value || typeof value !== 'object') return emptyState;
  const stored = value as Partial<MichaelHallDailyGymState>;
  const validCurrent = michaelHallDailyCards.some(
    (card) => card.id === stored.currentCardId,
  );

  return {
    currentCardId: validCurrent
      ? String(stored.currentCardId)
      : emptyState.currentCardId,
    completedCardIds: Array.isArray(stored.completedCardIds)
      ? stored.completedCardIds.filter((id): id is string => typeof id === 'string')
      : [],
    notesByCardId:
      stored.notesByCardId && typeof stored.notesByCardId === 'object'
        ? Object.fromEntries(
            Object.entries(stored.notesByCardId).filter(
              ([, note]) => typeof note === 'string',
            ),
          )
        : {},
    exerciseChecksByCardId:
      stored.exerciseChecksByCardId &&
      typeof stored.exerciseChecksByCardId === 'object'
        ? Object.fromEntries(
            Object.entries(stored.exerciseChecksByCardId).map(([id, checks]) => [
              id,
              Array.isArray(checks) ? checks.map(Boolean) : [],
            ]),
          )
        : {},
    lastCompletedDate:
      typeof stored.lastCompletedDate === 'string'
        ? stored.lastCompletedDate
        : undefined,
    streakCount:
      typeof stored.streakCount === 'number' && stored.streakCount > 0
        ? stored.streakCount
        : 0,
  };
}

function loadGymState(): MichaelHallDailyGymState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalizeStoredState(raw ? JSON.parse(raw) : null);
  } catch {
    return emptyState;
  }
}

function saveGymState(state: MichaelHallDailyGymState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable in private or restricted browser modes.
  }
}

function nextStreak(prev: MichaelHallDailyGymState): {
  streakCount: number;
  lastCompletedDate: string;
} {
  const today = localDateKey();
  if (prev.lastCompletedDate === today) {
    return { streakCount: Math.max(1, prev.streakCount), lastCompletedDate: today };
  }
  if (prev.lastCompletedDate === yesterdayKey()) {
    return { streakCount: prev.streakCount + 1, lastCompletedDate: today };
  }
  return { streakCount: 1, lastCompletedDate: today };
}

export function MichaelHallDailyGym() {
  const [gymState, setGymState] = useState<MichaelHallDailyGymState>(loadGymState);

  const currentIndex = useMemo(() => {
    const index = michaelHallDailyCards.findIndex(
      (card) => card.id === gymState.currentCardId,
    );
    return index >= 0 ? index : 0;
  }, [gymState.currentCardId]);

  const card = michaelHallDailyCards[currentIndex] ?? michaelHallDailyCards[0];
  const note = gymState.notesByCardId[card.id] ?? '';
  const exerciseChecks = gymState.exerciseChecksByCardId[card.id] ?? [];
  const completedCount = gymState.completedCardIds.length;
  const isCompleted = gymState.completedCardIds.includes(card.id);

  const updateGymState = (
    updater: (prev: MichaelHallDailyGymState) => MichaelHallDailyGymState,
  ) => {
    setGymState((prev) => {
      const next = updater(prev);
      saveGymState(next);
      return next;
    });
  };

  const goToIndex = (index: number) => {
    const nextCard = michaelHallDailyCards[index];
    if (!nextCard) return;
    updateGymState((prev) => ({ ...prev, currentCardId: nextCard.id }));
  };

  const markComplete = () => {
    updateGymState((prev) => {
      const completed = new Set(prev.completedCardIds);
      completed.add(card.id);
      return {
        ...prev,
        currentCardId: card.id,
        completedCardIds: Array.from(completed),
        ...nextStreak(prev),
      };
    });
  };

  const updateNote = (value: string) => {
    updateGymState((prev) => ({
      ...prev,
      notesByCardId: {
        ...prev.notesByCardId,
        [card.id]: value,
      },
    }));
  };

  const toggleExercise = (exerciseIndex: number) => {
    updateGymState((prev) => {
      const checks = [...(prev.exerciseChecksByCardId[card.id] ?? [])];
      checks[exerciseIndex] = !checks[exerciseIndex];
      return {
        ...prev,
        exerciseChecksByCardId: {
          ...prev.exerciseChecksByCardId,
          [card.id]: checks,
        },
      };
    });
  };

  const shuffleCard = () => {
    if (michaelHallDailyCards.length <= 1) return;
    let nextIndex = currentIndex;
    while (nextIndex === currentIndex) {
      nextIndex = Math.floor(Math.random() * michaelHallDailyCards.length);
    }
    goToIndex(nextIndex);
  };

  return (
    <div className="workbench michael-hall-gym" dir="rtl">
      <div className="workbench-main card daily-gym-card">
        <div className="daily-gym-heading">
          <span className="daily-gym-kicker">Michael Hall Daily Gym</span>
          <h2>חדר אימון יומי - מייקל הול</h2>
          <p className="subtitle">
            תרגול יומי קצר בחשיבה, משמעות, פתרון בעיות ונוירו-סמנטיקה
          </p>
        </div>

        <div className="daily-gym-progress" aria-label="התקדמות חדר האימון">
          <div>
            <strong>
              יום {card.dayIndex} מתוך {michaelHallDailyCards.length}
            </strong>
            <span>כרטיס נוכחי</span>
          </div>
          <div>
            <strong>{completedCount}</strong>
            <span>כרטיסים שהושלמו</span>
          </div>
          <div>
            <strong>{gymState.streakCount}</strong>
            <span>רצף ימים</span>
          </div>
        </div>

        <article className="daily-training-card" aria-label="כרטיס אימון יומי">
          <div className="daily-card-meta">
            <span className="category-chip active">
              {categoryLabelsHe[card.category]}
            </span>
            <span>
              {card.sourceSeries} - {card.sourceTitle}
              {card.sourceDate ? `, ${card.sourceDate}` : ''}
            </span>
          </div>

          <h3>{card.titleHe}</h3>
          <p className="daily-card-title-en">{card.titleEn}</p>

          <section className="daily-card-section">
            <h4>תמצית יומית</h4>
            <p>{card.distilledTeachingHe}</p>
          </section>

          <section className="daily-card-section daily-distinction">
            <h4>הבחנה מרכזית</h4>
            <p>{card.keyDistinctionHe}</p>
          </section>

          <section className="daily-card-section">
            <h4>שאלה יומית</h4>
            <p className="daily-question">{card.dailyQuestionHe}</p>
          </section>

          <section className="daily-card-section">
            <h4>תרגילים</h4>
            <SurfaceHiddenPrinciple compact />
            <div className="daily-exercise-list">
              {card.exercisesHe.map((exercise, index) => (
                <label className="daily-exercise-row" key={exercise}>
                  <input
                    type="checkbox"
                    checked={Boolean(exerciseChecks[index])}
                    onChange={() => toggleExercise(index)}
                  />
                  <span>{exercise}</span>
                </label>
              ))}
            </div>
          </section>

          <section className="daily-card-section daily-apply">
            <h4>יישום היום</h4>
            <p>{card.applyTodayHe}</p>
          </section>

          <label className="daily-notes-label" htmlFor="michael-hall-notes">
            הערות אישיות
          </label>
          <textarea
            id="michael-hall-notes"
            className="daily-notes"
            value={note}
            onChange={(event) => updateNote(event.target.value)}
            rows={5}
            placeholder="מה ראית, ניסית או הבנת היום?"
          />

          <p className="daily-source-note">{card.sourceNoteHe}</p>
        </article>

        <div className="daily-gym-actions" aria-label="פעולות כרטיס">
          <button
            type="button"
            className="btn btn-primary"
            onClick={markComplete}
            disabled={isCompleted}
          >
            היום סיימתי
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              goToIndex((currentIndex + 1) % michaelHallDailyCards.length)
            }
          >
            כרטיס הבא
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              goToIndex(
                (currentIndex - 1 + michaelHallDailyCards.length) %
                  michaelHallDailyCards.length,
              )
            }
          >
            כרטיס קודם
          </button>
          <button type="button" className="btn btn-secondary" onClick={shuffleCard}>
            ערבב כרטיס
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => goToIndex(0)}
          >
            חזרה להתחלה
          </button>
        </div>
      </div>

      <aside className="workbench-side">
        <div className="side-card">
          <h4>איך עובדים עם זה?</h4>
          <p className="muted">
            קרא רק את התמצית, ענה על השאלה, בצע שתי פעולות לפחות, ואז כתוב
            הערה קצרה משלך.
          </p>
        </div>

        <div className="side-card">
          <h4>מה לשים לב?</h4>
          <p className="muted">
            האימון מחפש שינוי במבנה החשיבה: הבחנה חדשה, מסגרת נקייה יותר או צעד
            קטן שאפשר לבצע היום.
          </p>
        </div>

        <div className="side-card">
          <h4>לא לקרוא - לתרגל</h4>
          <p className="muted">
            הכרטיסים אינם ספריה של מאמרים. הם הזמנה לעבוד עם חוויה אחת ממשית
            מהיום.
          </p>
        </div>
      </aside>
    </div>
  );
}
