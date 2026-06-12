import { useMemo, useState } from 'react';
import { XP_REWARDS } from '../../store/progress';
import { cbtPracticeItems, metaPatternLabel, patternLabel } from './cbtContent';
import { savePracticeCorrect } from './cbtStorage';

export function CbtPracticeDrills({ onAward }: { onAward: (amount: number) => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [wasCorrect, setWasCorrect] = useState<boolean | null>(null);
  const item = cbtPracticeItems[index % cbtPracticeItems.length];
  const options = useMemo(() => {
    const all = ['mind_reading', 'should_must', 'overgeneralization', 'all_or_nothing'];
    return Array.from(new Set([item.cbtPatterns[0], ...all])).slice(0, 4);
  }, [item]);

  const choose = (pattern: string) => {
    const correct = item.cbtPatterns.includes(pattern);
    setSelected(pattern);
    setWasCorrect(correct);
    if (correct) {
      savePracticeCorrect(item.id);
      onAward(XP_REWARDS.cbtDrillCorrect);
    }
  };

  const next = () => {
    setIndex((current) => current + 1);
    setSelected(null);
    setWasCorrect(null);
  };

  return (
    <div className="cbt-two-column">
      <section className="cbt-panel">
        <span className="cbt-kicker">אימון מחשבות</span>
        <h3>{item.statementHe}</h3>
        <p className="muted">בחר את קיצור הדרך המרכזי. אחרי הבחירה נראה גם משפחת מטה-מודל.</p>
        <div className="cbt-option-grid">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className={`cbt-option ${selected === option ? 'active' : ''}`}
              onClick={() => choose(option)}
              disabled={selected !== null}
            >
              {patternLabel(option)}
            </button>
          ))}
        </div>
      </section>
      <section className="cbt-panel">
        {wasCorrect === null ? (
          <p className="muted">המשוב יופיע כאן.</p>
        ) : (
          <>
            <h3>{wasCorrect ? 'מדויק' : 'כיוון אחר מתאים יותר'}</h3>
            <p>
              CBT: {item.cbtPatterns.map(patternLabel).join(' / ')}
              <br />
              Meta Model: {item.metaModelPatterns.map(metaPatternLabel).join(' / ')}
            </p>
            <article className="cbt-mini-card">
              <strong>שאלה טובה יותר</strong>
              <p>{item.betterQuestionHe}</p>
            </article>
            <article className="cbt-mini-card">
              <strong>ניסוי / תנועה</strong>
              <p>{item.experimentHe}</p>
            </article>
            {wasCorrect && <p className="xp-pop">+{XP_REWARDS.cbtDrillCorrect} XP</p>}
            <button type="button" className="btn btn-primary" onClick={next}>
              תרגיל הבא
            </button>
          </>
        )}
      </section>
    </div>
  );
}
