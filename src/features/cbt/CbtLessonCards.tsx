import { useState } from 'react';
import { XP_REWARDS } from '../../store/progress';
import { cbtLessons } from './cbtContent';
import { loadCbtLessonProgress, saveLessonComplete } from './cbtStorage';

export function CbtLessonCards({ onAward }: { onAward: (amount: number) => void }) {
  const [completed, setCompleted] = useState(() => loadCbtLessonProgress().completedLessonIds);

  const complete = (lessonId: string) => {
    const next = saveLessonComplete(lessonId);
    setCompleted(next.completedLessonIds);
    if (!completed.includes(lessonId)) onAward(XP_REWARDS.cbtLessonCompleted);
  };

  return (
    <div className="cbt-lesson-grid">
      {cbtLessons.map((lesson) => (
        <article className="cbt-lesson-card" key={lesson.id}>
          <span className="cbt-kicker">{lesson.estimatedMinutes} דקות · {lesson.theoryFamily}</span>
          <h3>{lesson.titleHe}</h3>
          <p>{lesson.explanationHe}</p>
          <div className="cbt-mini-card">
            <strong>דוגמה</strong>
            <p>{lesson.exampleHe}</p>
          </div>
          <div className="cbt-mini-card">
            <strong>תרגיל קטן</strong>
            <p>{lesson.microExerciseHe}</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => complete(lesson.id)}
          >
            {completed.includes(lesson.id) ? 'נלמד' : 'סמן כשיעור שנלמד'}
          </button>
        </article>
      ))}
    </div>
  );
}
