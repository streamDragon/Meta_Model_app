import { useCallback, useEffect, useState } from 'react';
import { content } from '../../data/content';
import type { PracticeStatement, ViolationFamily } from '../../types';
import {
  buildMcqOptions,
  buildTrainerQuestions,
  CATEGORY_HINTS,
  CATEGORY_ID_TO_NAME,
  CATEGORY_LABELS,
  completionMessage,
  completionNextFocus,
  DIFFICULTY_HINTS,
  successRate,
  XP_PER_CORRECT,
} from '../../lib/trainer';
import { useProgress } from '../../store/useProgress';
import { usePracticeLaunch } from '../../store/practiceLaunch';
import { useHint } from '../../store/hint';
import { HowItWorks } from '../../components/HowItWorks';
import teacherImg from '../../assets/teacher.png';
import { characterFor } from '../../lib/characters';

type Phase = 'idle' | 'active' | 'complete';

export function TrainerPage() {
  const { addXP, recordSession } = useProgress();
  const { request, consume } = usePracticeLaunch();
  const { showHint } = useHint();

  const [selectedCategory, setSelectedCategory] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [questions, setQuestions] = useState<PracticeStatement[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<ViolationFamily[]>([]);
  const [selected, setSelected] = useState<ViolationFamily | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [hintText, setHintText] = useState<string | null>(null);

  const startTrainer = useCallback(
    (categoryId: string) => {
      const sessionQuestions = buildTrainerQuestions(
        content.practice_statements,
        categoryId,
      );
      if (sessionQuestions.length === 0) {
        showHint('אין משפטים לקטגוריה זו');
        return;
      }
      setQuestions(sessionQuestions);
      setCurrentIndex(0);
      setOptions(buildMcqOptions(sessionQuestions[0].category));
      setSelected(null);
      setCorrectCount(0);
      setAnsweredCount(0);
      setSessionXP(0);
      setHintText(null);
      setPhase('active');
    },
    [showHint],
  );

  // Cross-feature launch from the Categories page.
  useEffect(() => {
    if (!request) return;
    setSelectedCategory(request.categoryId);
    startTrainer(request.categoryId);
    consume();
  }, [request, startTrainer, consume]);

  const question = phase === 'active' ? questions[currentIndex] : null;

  const handleSelect = (option: ViolationFamily) => {
    if (!question || selected !== null) return;
    setSelected(option);
    setAnsweredCount((n) => n + 1);
    if (option === question.category) {
      setCorrectCount((n) => n + 1);
      setSessionXP((xp) => xp + XP_PER_CORRECT);
      addXP(XP_PER_CORRECT);
    }
  };

  const handleNext = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      setPhase('complete');
      recordSession();
      return;
    }
    setCurrentIndex(nextIndex);
    setOptions(buildMcqOptions(questions[nextIndex].category));
    setSelected(null);
    setHintText(null);
  };

  const resetTrainer = () => {
    setPhase('idle');
    setQuestions([]);
    setCurrentIndex(0);
    setSelected(null);
    setCorrectCount(0);
    setAnsweredCount(0);
    setSessionXP(0);
    setHintText(null);
  };

  const showTrainerHint = () => {
    if (!question) return;
    setHintText(
      `${CATEGORY_HINTS[question.category] ?? ''}\nרמת קשיות: ${DIFFICULTY_HINTS[question.difficulty]}`,
    );
  };

  const rate = successRate(correctCount, answeredCount);
  const finalRate = successRate(correctCount, questions.length);

  const chips = [
    { id: '', label: 'כל הקטגוריות', accent: 'all' },
    ...content.categories.map((c) => ({
      id: c.id,
      label: c.hebrew_name || c.name,
      accent: c.id,
    })),
  ];

  const focusCategory = content.categories.find((c) => c.id === selectedCategory);

  return (
    <div className="workbench">
      <div className="workbench-main card">
        <h2>תרגול דינאמי 🎮</h2>
        <p className="subtitle">בחר קטגוריה וענה על שאלות אינטראקטיביות עם משוב מידי</p>

        <div className="feature-brief">
          <span>
            <strong>מטרה:</strong> לזהות במהירות את סוג ההפרה.
          </span>
          <span>
            <strong>תוצר:</strong> שאלה טובה יותר ומשוב מידי.
          </span>
        </div>

        <div className="practice-filters">
          <label htmlFor="category-select">בחר קטגוריה:</label>
          <select
            id="category-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">הכל</option>
            {content.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.hebrew_name}
              </option>
            ))}
          </select>
        </div>

        <div id="category-chip-list" className="category-chip-list" aria-label="בחירת קטגוריה מהירה">
          {chips.map((chip) => (
            <button
              key={chip.id || 'all'}
              type="button"
              className={`category-chip ${chip.id === selectedCategory ? 'active' : ''}`}
              data-category={chip.id}
              data-accent={chip.accent}
              onClick={() => setSelectedCategory(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {phase === 'active' && question && (
          <div id="trainer-mode" className="trainer-mode">
            <div id="question-display" className="question-display">
              <div className="question-header">
                <span className="question-counter">
                  שאלה <span id="current-q">{currentIndex + 1}</span> מתוך{' '}
                  <span id="total-q">{questions.length}</span>
                </span>
                <span className="xp-badge">+{XP_PER_CORRECT} XP</span>
              </div>
              <div className="progress-bar">
                <div
                  id="progress-fill"
                  className="progress-fill"
                  style={{ width: `${(currentIndex / questions.length) * 100}%` }}
                ></div>
              </div>
              {(() => {
                const speaker = characterFor(question.id + currentIndex);
                return (
                  <div className="question-speaker">
                    {speaker && (
                      <span className="speaker-figure">
                        <img src={speaker.url} alt="" aria-hidden="true" loading="lazy" />
                        <small>{speaker.name}</small>
                      </span>
                    )}
                    <p className="question-text speech-statement" id="question-text">
                      {question.statement}
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="mcq-options" id="mcq-options">
              {options.map((option, index) => (
                <div className="mcq-option" key={option}>
                  <input
                    type="radio"
                    id={`option-${index}`}
                    className="option-input"
                    name="mcq"
                    value={option}
                    checked={selected === option}
                    disabled={selected !== null}
                    onChange={() => handleSelect(option)}
                  />
                  <label htmlFor={`option-${index}`} className="option-label">
                    <span className="option-radio"></span>
                    <span className="option-text">{CATEGORY_LABELS[option]}</span>
                  </label>
                </div>
              ))}
            </div>

            {selected !== null && (
              <div id="feedback-section" className="feedback-section visible">
                <div
                  id="feedback-content"
                  className={`feedback-box ${selected === question.category ? 'correct' : 'incorrect'}`}
                >
                  {selected === question.category ? (
                    <div className="correct">
                      <strong>✅ נכון!</strong>
                      <p className="explanation">
                        <strong>קטגוריה:</strong> {CATEGORY_LABELS[question.category]}
                        <br />
                        <strong>תבנית:</strong> {question.violation}
                        <br />
                        <strong>שאלה מוצעת:</strong> "{question.suggested_question}"
                        <br />
                        <strong>הסבר:</strong> {question.explanation}
                      </p>
                      <p className="xp-pop">+{XP_PER_CORRECT} XP 🎉</p>
                    </div>
                  ) : (
                    <div className="incorrect">
                      <strong>❌ לא נכון</strong>
                      <p className="explanation">
                        <strong>בחרת:</strong> {CATEGORY_LABELS[selected]}
                        <br />
                        <strong>התשובה הנכונה:</strong> {CATEGORY_LABELS[question.category]}
                        <br />
                        <strong>תבנית:</strong> {question.violation}
                        <br />
                        <strong>שאלה מוצעת:</strong> "{question.suggested_question}"
                        <br />
                        <strong>הסבר:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
                <button type="button" id="next-question-btn" className="btn btn-primary" onClick={handleNext}>
                  השאלה הבאה ←
                </button>
              </div>
            )}

            <div id="trainer-hints" className="trainer-hints">
              <button
                id="hint-trigger"
                className="btn btn-secondary hint-button"
                onClick={showTrainerHint}
              >
                💡 רמז
              </button>
              {hintText && (
                <div id="hint-display" className="hint-display visible">
                  {hintText.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {phase === 'complete' && (
          <div className="feedback-section visible">
            <div className="trainer-complete-card">
              <div className="trainer-complete-hero">
                <span className="complete-score">{finalRate}%</span>
                <div>
                  <h2>{completionMessage(finalRate)}</h2>
                  <p>{completionNextFocus(finalRate)}</p>
                </div>
              </div>
              <div className="trainer-complete-stats">
                <div>
                  <strong>
                    {correctCount}/{questions.length}
                  </strong>
                  <span>תשובות נכונות</span>
                </div>
                <div>
                  <strong>+{sessionXP}</strong>
                  <span>XP בסשן</span>
                </div>
                <div>
                  <strong>
                    {selectedCategory ? CATEGORY_ID_TO_NAME[selectedCategory] : 'ALL'}
                  </strong>
                  <span>מוקד תרגול</span>
                </div>
              </div>
              <div className="trainer-complete-actions">
                <button type="button" className="btn btn-primary" onClick={resetTrainer}>
                  תרגול נוסף
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => (window.location.hash = 'categories')}
                >
                  חיזוק קטגוריות
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => (window.location.hash = 'blueprint')}
                >
                  בנה Blueprint
                </button>
              </div>
            </div>
          </div>
        )}

        {phase === 'idle' && (
          <div id="trainer-start" className="start-section">
            <HowItWorks
              steps={[
                { icon: '📖', title: 'קרא את המשפט', detail: 'משפט יומיומי עם דפוס מוסתר' },
                { icon: '🤔', title: 'זהה את המשפחה', detail: 'מחיקה, עיוות או הכללה?' },
                { icon: '⚡', title: 'קבל משוב מיד', detail: 'הסבר + שאלת ניקוי מומלצת + XP' },
              ]}
            />
            <p className="instruction">בחר קטגוריה ולחץ כדי להתחיל</p>
            <button
              id="start-trainer-btn"
              className="btn btn-primary btn-large"
              onClick={() => startTrainer(selectedCategory)}
            >
              🎮 התחל תרגול
            </button>
          </div>
        )}

      </div>

      <aside className="workbench-side">
        <div className="side-card">
          <h4>📊 סשן נוכחי</h4>
          <div className="practice-stats">
            <p>
              ✅ תשובות נכונות <span id="correct-count">{correctCount}</span>
            </p>
            <p>
              📈 קצב הצלחה <span id="success-rate">{rate}%</span>
            </p>
            <p>
              ⭐ XP בסשן <span id="session-xp">{sessionXP}</span>
            </p>
          </div>
        </div>

        <div className="side-card">
          <h4>🎯 מוקד התרגול</h4>
          {focusCategory ? (
            <>
              <p>
                <strong>
                  {focusCategory.icon} {focusCategory.hebrew_name}
                </strong>
              </p>
              <p className="muted">{focusCategory.description}</p>
              <p className="muted">{focusCategory.subcategories.length} תתי-דפוסים בקטגוריה זו</p>
            </>
          ) : (
            <p className="muted">
              מתרגלים על כל שלוש המשפחות: מחיקה, עיוות והכללה. בחר קטגוריה כדי למקד
              את הסשן.
            </p>
          )}
        </div>

        <div className="side-card teacher-card">
          <img className="teacher-figure" src={teacherImg} alt="" aria-hidden="true" loading="lazy" />
          <div className="teacher-bubble">
            <strong>💡 איך מזהים?</strong>
            <p>
              מחיקה — מידע חסר. עיוות — הנחה בלי ראיות. הכללה — "תמיד / אף פעם /
              חייב". כשמתלבטים: שאלו "מה חסר לי כדי להבין את זה באמת?"
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
