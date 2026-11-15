import { useEffect, useMemo, useRef, useState } from 'react';
import { content } from '../../data/content';
import {
  buildDailySet,
  checklistFor,
  goalFor,
  isoDay,
  loadDailyState,
  markDayComplete,
  PATTERN_HEBREW,
  PHASE_LABEL,
  recordDailyResult,
  saveDailyState,
  writtenSuccess,
  type DailyItem,
  type DailyState,
} from '../../lib/dailySet';
import { revealElement } from '../../lib/reveal';
import { XP_REWARDS } from '../../store/progress';
import { useProgress } from '../../store/useProgress';
import './daily-set.css';

const XP_PER_HIT = XP_REWARDS.trainerCorrect;

const QUESTION_PATTERN: Record<string, string> = Object.fromEntries(
  content.categories.flatMap((c) => c.subcategories.map((sub) => [sub.question, sub.hebrew] as const)),
);

interface Outcome { key: string; pattern: string; success: boolean; review: boolean }

function formatDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric' });
}

export function DailySetPage() {
  const today = isoDay();
  const { addXP, recordSession } = useProgress();
  const [state, setState] = useState<DailyState>(loadDailyState);
  const [items, setItems] = useState<DailyItem[]>(() => buildDailySet(content.practice_statements, loadDailyState(), today));
  const [started, setStarted] = useState(() => !loadDailyState().completedDays.includes(today));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [checks, setChecks] = useState<boolean[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [stored, setStored] = useState(true);
  const feedbackRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const finished = index >= items.length;
  const item = items[index];

  const persist = (next: DailyState) => { setState(next); setStored(saveDailyState(next)); };

  const record = (success: boolean) => {
    if (!item || outcomes.some((o) => o.key === item.key)) return;
    persist(recordDailyResult(state, item, success, today));
    setOutcomes((prev) => [...prev, { key: item.key, pattern: item.statement.subcategory, success, review: item.phase === 'review' }]);
  };

  // One session record and XP when the set ends.
  const closed = useRef(false);
  useEffect(() => {
    if (!finished || closed.current || items.length === 0) return;
    closed.current = true;
    const hits = outcomes.filter((o) => o.success).length;
    if (hits > 0) addXP(hits * XP_PER_HIT);
    recordSession();
    persist(markDayComplete(state, today));
    revealElement(topRef.current, 'start');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  useEffect(() => { if (picked || revealed) revealElement(feedbackRef.current, 'end'); }, [picked, revealed]);

  const next = () => {
    setIndex((i) => i + 1);
    setPicked(null); setDraft(''); setRevealed(false); setChecks([]);
    requestAnimationFrame(() => revealElement(topRef.current, 'start'));
  };

  const restart = () => {
    const fresh = loadDailyState();
    setState(fresh);
    setItems(buildDailySet(content.practice_statements, fresh, today));
    setIndex(0); setPicked(null); setDraft(''); setRevealed(false); setChecks([]); setOutcomes([]);
    closed.current = false;
    setStarted(true);
  };

  const dueNext = useMemo(
    () => state.queue.slice().sort((a, b) => a.due.localeCompare(b.due)),
    [state.queue],
  );

  if (!started) {
    return (
      <div className="daily" ref={topRef}>
        <header className="daily-head">
          <span className="daily-eyebrow">האימון של היום</span>
          <h2>כבר התאמנתם היום</h2>
        </header>
        <section className="card daily-end">
          <p>{dueNext.length ? `${dueNext.length} משפטים מחכים לחזרה. הבא בתור: ${formatDay(dueNext[0].due)}.` : 'אין משפטים שמחכים לחזרה.'}</p>
          <div className="daily-actions">
            <button type="button" className="btn btn-primary" onClick={restart}>עוד סט</button>
            <button type="button" className="btn btn-secondary" onClick={() => { window.location.hash = 'conversation'; }}>לאימון שיחה</button>
          </div>
        </section>
      </div>
    );
  }

  if (finished) {
    const hits = outcomes.filter((o) => o.success).length;
    const practised = [...new Set(outcomes.map((o) => o.pattern))];
    const missed = outcomes.filter((o) => !o.success).map((o) => o.pattern);
    return (
      <div className="daily" ref={topRef}>
        <header className="daily-head">
          <span className="daily-eyebrow">האימון של היום</span>
          <h2>סיימתם את הסט</h2>
        </header>
        <section className="card daily-end" aria-live="polite">
          <p className="daily-score"><strong>{hits}</strong> מתוך {outcomes.length} בלי טעות</p>
          <h3>מה תרגלתם</h3>
          <ul className="daily-patterns">
            {practised.map((p) => <li key={p} className={missed.includes(p) ? 'is-miss' : ''}>{PATTERN_HEBREW[p] ?? p}</li>)}
          </ul>
          <p>
            {missed.length
              ? `${missed.length} משפטים יחזרו אליכם מחר, ואחר כך אחרי 3 ו־7 ימים.`
              : 'אין משפטים חדשים לחזרה. מחר מחכה סט חדש.'}
          </p>
          {!stored && <p role="alert">הדפדפן לא אפשר לשמור את התור לחזרה.</p>}
          <div className="daily-actions">
            <button type="button" className="btn btn-primary" onClick={() => { window.location.hash = 'conversation'; }}>לתרגול בשיחה</button>
            <button type="button" className="btn btn-secondary" onClick={() => { window.location.hash = 'home'; }}>לבית</button>
          </div>
        </section>
      </div>
    );
  }

  const s = item.statement;
  const checklist = checklistFor(s.subcategory);
  const answered = item.kind === 'write' ? revealed : picked !== null;
  const correct = item.kind !== 'write' && picked === item.answer;

  return (
    <div className="daily" ref={topRef}>
      <header className="daily-head">
        <div className="daily-progress" aria-label={`פריט ${index + 1} מתוך ${items.length}`}>
          <span className="daily-eyebrow">{PHASE_LABEL[item.phase]}</span>
          <span className="daily-count">{index + 1}/{items.length}</span>
        </div>
        <div className="daily-bar" aria-hidden="true"><span style={{ width: `${(index / items.length) * 100}%` }} /></div>
      </header>

      <section className="card daily-item">
        {item.phase === 'review' && <p className="daily-note">משפט שהתקשיתם בו לפני כמה ימים.</p>}
        <blockquote className="daily-quote">״{s.statement}״</blockquote>

        {item.kind === 'recognize' && (
          <>
            <h3 className="daily-prompt">איזו תבנית בולטת כאן?</h3>
            <div className="daily-options">
              {item.options.map((id) => (
                <button
                  key={id}
                  type="button"
                  className={`daily-option ${picked ? (id === item.answer ? 'is-right' : id === picked ? 'is-wrong' : '') : ''}`}
                  disabled={picked !== null}
                  onClick={() => { setPicked(id); record(id === item.answer); }}
                >
                  {PATTERN_HEBREW[id] ?? id}
                </button>
              ))}
            </div>
          </>
        )}

        {item.kind === 'goal' && (
          <>
            <p className="daily-goal">{goalFor(s.subcategory)}</p>
            <h3 className="daily-prompt">איזו שאלה משרתת את המטרה?</h3>
            <div className="daily-options">
              {item.options.map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`daily-option ${picked ? (q === item.answer ? 'is-right' : q === picked ? 'is-wrong' : '') : ''}`}
                  disabled={picked !== null}
                  onClick={() => { setPicked(q); record(q === item.answer); }}
                >
                  {q}
                </button>
              ))}
            </div>
          </>
        )}

        {item.kind === 'write' && (
          <>
            <h3 className="daily-prompt">איזו שאלה הייתם שואלים?</h3>
            <label className="daily-write">
              <span className="sr-only">השאלה שלכם</span>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={revealed}
                rows={3}
                placeholder="כתבו כאן את השאלה, במילים שלכם"
              />
            </label>
            {!revealed && (
              <div className="daily-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={draft.trim().length < 3}
                  onClick={() => { setRevealed(true); setChecks(checklist.map(() => false)); }}
                >
                  השוו לשאלה לדוגמה
                </button>
                <button
                  type="button"
                  className="daily-skip"
                  onClick={() => { setRevealed(true); setChecks(checklist.map(() => false)); record(false); }}
                >
                  לא יודע/ת, הראו לי
                </button>
              </div>
            )}
          </>
        )}

        {answered && (
          <div className="daily-feedback" ref={feedbackRef} aria-live="polite">
            {item.kind === 'recognize' && (
              <>
                <p className={correct ? 'daily-verdict is-right' : 'daily-verdict is-wrong'}>
                  {correct ? 'נכון.' : `כאן בולטת ${PATTERN_HEBREW[item.answer] ?? item.answer}.`}
                </p>
                <p>{s.explanation}</p>
                <p className="daily-model"><span>שאלה שעובדת:</span> {s.suggested_question}</p>
              </>
            )}
            {item.kind === 'goal' && (
              <>
                <p className={correct ? 'daily-verdict is-right' : 'daily-verdict is-wrong'}>
                  {correct ? 'נכון.' : 'השאלה הזאת לא מחזירה את מה שחסר.'}
                </p>
                {!correct && picked && (
                  <p>
                    {QUESTION_PATTERN[picked]
                      ? `זו שאלה טובה לתבנית אחרת (${QUESTION_PATTERN[picked]}), לא למה שמסתתר במשפט הזה.`
                      : 'שאלת "למה", עצה או ויכוח מבקשות מהאדם להצדיק את עצמו, ולא מחזירות את המידע שהמשפט מחק.'}
                  </p>
                )}
                <p>{PATTERN_HEBREW[s.subcategory]}: {s.explanation}</p>
                {!correct && <p className="daily-model"><span>שאלה שעובדת:</span> {item.answer}</p>}
              </>
            )}
            {item.kind === 'write' && (
              <>
                <p className="daily-model"><span>שאלה לדוגמה:</span> {s.suggested_question}</p>
                <p className="daily-muted">{PATTERN_HEBREW[s.subcategory]}: {s.explanation}</p>
                {draft.trim().length >= 3 && !outcomes.some((o) => o.key === item.key) && (
                  <fieldset className="daily-checks">
                    <legend>מה השאלה שלכם עשתה? סמנו בכנות.</legend>
                    {checklist.map((line, i) => (
                      <label key={line} className="daily-check">
                        <input
                          type="checkbox"
                          checked={checks[i] ?? false}
                          onChange={(e) => setChecks((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                        />
                        <span>{line}</span>
                      </label>
                    ))}
                    <p className="daily-muted">אין כאן ציון אוטומטי. אם הנקודה הראשונה חסרה, המשפט יחזור אליכם לחזרה.</p>
                  </fieldset>
                )}
              </>
            )}
            <div className="daily-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  if (item.kind === 'write' && !outcomes.some((o) => o.key === item.key)) record(writtenSuccess(draft, checks));
                  next();
                }}
              >
                {index + 1 === items.length ? 'לסיכום' : 'הבא'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
