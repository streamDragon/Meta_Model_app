import React, { useEffect, useMemo, useState } from 'react';

import { CANONICAL_BREEN_ORDER, type CanonicalBreenCode } from '../config/canonicalBreenOrder';
import { getTrainerContract } from '../config/trainerContract';
import BreenTableBoard, { type BreenBoardCellState } from './breen-table-lab/BreenTableBoard';
import {
  BREEN_TABLE_CELLS,
  BREEN_TABLE_CELL_MAP,
  BREEN_TABLE_MODE_CARDS,
  familyCodes,
  formatModeLabel,
  formatPromptTypeLabel,
  formatSessionModeLabel,
  type BreenLabDifficulty,
  type BreenLabMode,
  type BreenLabPromptType,
  type BreenLabSessionMode
} from './breen-table-lab/breenTableLabData';
import {
  accuracyFromStats,
  applyCellOutcome,
  buildResultsInsights,
  createEmptyCellStats,
  getHeatCell,
  pickWeakestCodes,
  scoreBuildPlacement,
  scoreCompleteChoice,
  scoreQuickLocate,
  type BreenCellStatsMap,
  type BuildPlacementScore
} from './breen-table-lab/breenTableLabScoring';
import { BREEN_TABLE_LAB_CSS } from './breen-table-lab/breenTableLabStyles';
import { TRAINER_PLATFORM_CSS } from './trainer-shell/trainerPlatformStyles';

type ScreenState = 'welcome' | 'setup' | 'play' | 'results';
type OverlayState = 'help' | 'how-it-works' | null;
type RoundSize = 6 | 9 | 12 | 15;
type FeedbackTone = 'info' | 'success' | 'warn' | 'error';

interface FeedbackState {
  tone: FeedbackTone;
  text: string;
  detail?: string;
}

interface SetupState {
  mode: BreenLabMode;
  sessionMode: BreenLabSessionMode;
  difficulty: BreenLabDifficulty;
  roundSize: RoundSize;
  timerEnabled: boolean;
  quickPromptType: BreenLabPromptType;
}

interface BaseSession {
  kind: BreenLabMode;
  settings: SetupState;
  startedAt: number;
  score: number;
  streak: number;
  bestStreak: number;
  feedback: FeedbackState | null;
  stats: BreenCellStatsMap;
  correctCount: number;
  totalTargets: number;
}

interface BuildSession extends BaseSession {
  kind: 'build';
  prefilledCodes: CanonicalBreenCode[];
  trayCodes: CanonicalBreenCode[];
  selectedPattern: CanonicalBreenCode | null;
  placements: Partial<Record<CanonicalBreenCode, CanonicalBreenCode>>;
  checked: boolean;
  results: Partial<Record<CanonicalBreenCode, BuildPlacementScore>>;
}

interface CompleteSession extends BaseSession {
  kind: 'complete';
  fixedCodes: CanonicalBreenCode[];
  missingCodes: CanonicalBreenCode[];
  optionsByCell: Partial<Record<CanonicalBreenCode, CanonicalBreenCode[]>>;
  activeMissingCell: CanonicalBreenCode | null;
  answers: Partial<Record<CanonicalBreenCode, CanonicalBreenCode>>;
  mistakesByCell: Partial<Record<CanonicalBreenCode, number>>;
  resolvedCodes: CanonicalBreenCode[];
  checked: boolean;
}

interface QuickPrompt {
  id: string;
  targetCode: CanonicalBreenCode;
  promptType: 'name' | 'example';
  promptText: string;
}

interface QuickSession extends BaseSession {
  kind: 'quick';
  prompts: QuickPrompt[];
  currentIndex: number;
  promptStartedAt: number;
  answered: boolean;
  selectedCode: CanonicalBreenCode | null;
  lastResponseMs: number | null;
}

type ActiveSession = BuildSession | CompleteSession | QuickSession;

interface ResultsState {
  mode: BreenLabMode;
  sessionMode: BreenLabSessionMode;
  difficulty: BreenLabDifficulty;
  score: number;
  accuracy: number;
  bestStreak: number;
  durationMs: number;
  stats: BreenCellStatsMap;
  totalTargets: number;
  correctCount: number;
  insights: string[];
  weakCodes: CanonicalBreenCode[];
}

const DEFAULT_SETUP: SetupState = {
  mode: 'build',
  sessionMode: 'learning',
  difficulty: 2,
  roundSize: 9,
  timerEnabled: false,
  quickPromptType: 'mixed'
};

const DIFFICULTY_COPY: Record<BreenLabDifficulty, { he: string; subtitle: string }> = {
  1: { he: 'עדין', subtitle: 'יותר עוגנים גלויים ופחות עומס.' },
  2: { he: 'מאוזן', subtitle: 'שילוב נעים בין רמזים לשליפה.' },
  3: { he: 'מאתגר', subtitle: 'פחות תמיכה ויותר עבודה מרחבית נקייה.' }
};

const SESSION_MODE_COPY: Record<BreenLabSessionMode, { he: string; subtitle: string }> = {
  learning: { he: 'למידה', subtitle: 'משוב תומך בזמן אמת.' },
  test: { he: 'מבחן', subtitle: 'פחות אישורים תוך כדי, יותר תמונה מסכמת בסוף.' }
};

const PROMPT_TYPE_COPY: Record<BreenLabPromptType, { he: string; subtitle: string }> = {
  name: { he: 'שם תבנית', subtitle: 'השם מוביל אל המקום המדויק בטבלה.' },
  example: { he: 'דוגמת משפט', subtitle: 'שליפה מתוך ניסוח חי יותר ופחות מתוך מונח יבש.' },
  mixed: { he: 'מעורב', subtitle: 'פעם בשם ופעם מתוך דוגמה.' }
};

export default function BreenTableLabTrainer(): React.ReactElement {
  const contract = getTrainerContract('breen-table-lab');
  const [screen, setScreen] = useState<ScreenState>('welcome');
  const [overlay, setOverlay] = useState<OverlayState>(null);
  const [setup, setSetup] = useState<SetupState>(DEFAULT_SETUP);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [results, setResults] = useState<ResultsState | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (screen !== 'play' || !session?.settings.timerEnabled) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [screen, session]);

  useEffect(() => {
    if (!overlay) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOverlay(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [overlay]);

  const helpTitle = useMemo(() => {
    if (!session) return 'איך זה עובד';
    if (session.kind === 'build') return 'עזרה קצרה · מצב בנייה';
    if (session.kind === 'complete') return 'עזרה קצרה · מצב השלמה';
    return 'עזרה קצרה · מצב איתור מהיר';
  }, [session]);

  const welcomeBoardStates = useMemo(() => {
    const highlightCodes: CanonicalBreenCode[] = ['MR', 'CE', 'UQ', 'MN', 'UV', 'COMP'];
    return highlightCodes.reduce<Partial<Record<CanonicalBreenCode, BreenBoardCellState>>>((acc, code) => {
      acc[code] = {
        tone: 'prefilled',
        title: BREEN_TABLE_CELL_MAP[code].heTitle,
        subtitle: BREEN_TABLE_CELL_MAP[code].familyHe
      };
      return acc;
    }, {});
  }, []);

  const playBoardStates = useMemo(() => {
    if (!session) return {};
    if (session.kind === 'build') return buildBoardState(session);
    if (session.kind === 'complete') return completeBoardState(session);
    return quickBoardState(session);
  }, [session]);

  const resultsBoardStates = useMemo(() => {
    if (!results) return {};
    return CANONICAL_BREEN_ORDER.reduce<Partial<Record<CanonicalBreenCode, BreenBoardCellState>>>((acc, code) => {
      const cell = BREEN_TABLE_CELL_MAP[code];
      const heat = getHeatCell(results.stats[code]);
      acc[code] = {
        title: cell.heTitle,
        subtitle: heat.label,
        tone: `heat-${heat.tone}` as BreenBoardCellState['tone']
      };
      return acc;
    }, {});
  }, [results]);

  const timerDisplay = useMemo(() => {
    if (!session?.settings.timerEnabled) return 'כבוי';
    if (session.kind === 'quick' && session.lastResponseMs != null && session.answered) return formatMs(session.lastResponseMs);
    return formatElapsed(now - session.startedAt);
  }, [now, session]);

  function startSetup(mode?: BreenLabMode): void {
    setResults(null);
    setSession(null);
    setSetup((current) => ({ ...current, mode: mode || current.mode }));
    setScreen('setup');
  }

  function startSession(nextSetup: SetupState = setup): void {
    setSetup(nextSetup);
    setResults(null);
    setSession(buildInitialSession(nextSetup));
    setScreen('play');
  }

  function exitToSetup(): void {
    setOverlay(null);
    setSession(null);
    setScreen('setup');
  }

  function finishSession(finalSession: ActiveSession): void {
    setResults({
      mode: finalSession.kind,
      sessionMode: finalSession.settings.sessionMode,
      difficulty: finalSession.settings.difficulty,
      score: finalSession.score,
      accuracy: accuracyFromStats(finalSession.stats),
      bestStreak: finalSession.bestStreak,
      durationMs: Date.now() - finalSession.startedAt,
      stats: finalSession.stats,
      totalTargets: finalSession.totalTargets,
      correctCount: finalSession.correctCount,
      insights: buildResultsInsights(finalSession.stats, finalSession.kind),
      weakCodes: pickWeakestCodes(finalSession.stats, 4)
    });
    setSession(null);
    setOverlay(null);
    setScreen('results');
  }

  function handleBuildCellClick(cellCode: CanonicalBreenCode): void {
    if (!session || session.kind !== 'build' || session.checked) return;
    if (session.prefilledCodes.includes(cellCode)) {
      setSession({
        ...session,
        feedback: {
          tone: 'info',
          text: 'התא הזה כבר משמש כאן כעוגן קבוע.',
          detail: 'בחר/י תא פנוי כדי להניח בו את התבנית שנבחרה.'
        }
      });
      return;
    }
    if (!session.selectedPattern) {
      setSession({
        ...session,
        feedback: {
          tone: 'info',
          text: 'בחר/י קודם תבנית מהמגש.',
          detail: 'אחר כך לחץ/י על המקום שלה בטבלה.'
        }
      });
      return;
    }

    const nextPlacements: Partial<Record<CanonicalBreenCode, CanonicalBreenCode>> = { ...session.placements };
    Object.entries(nextPlacements).forEach(([key, value]) => {
      if (value === session.selectedPattern) delete nextPlacements[key as CanonicalBreenCode];
    });
    nextPlacements[cellCode] = session.selectedPattern;

    setSession({
      ...session,
      placements: nextPlacements,
      selectedPattern: null,
      feedback: session.settings.sessionMode === 'learning'
        ? buildPlacementFeedback(scoreBuildPlacement(session.selectedPattern, cellCode))
        : {
            tone: 'info',
            text: `התבנית "${BREEN_TABLE_CELL_MAP[session.selectedPattern].heTitle}" הונחה על המפה.`,
            detail: 'בסיום הסבב נראה כמה המיקום כבר מדויק.'
          }
    });
  }

  function checkBuildSession(): void {
    if (!session || session.kind !== 'build' || session.checked) return;
    const placedPatterns = new Set(Object.values(session.placements));
    const remaining = session.trayCodes.filter((code) => !placedPatterns.has(code));
    if (remaining.length) {
      setSession({
        ...session,
        feedback: {
          tone: 'warn',
          text: `נשארו עוד ${remaining.length} תבניות שלא הונחו.`,
          detail: 'השלם/י את המגש ורק אז נבדוק את המפה.'
        }
      });
      return;
    }

    let nextStats = session.stats;
    let roundScore = 0;
    let exactCount = 0;
    const resultsMap: Partial<Record<CanonicalBreenCode, BuildPlacementScore>> = {};

    session.trayCodes.forEach((patternCode) => {
      const placementEntry = Object.entries(session.placements).find(([, value]) => value === patternCode);
      const placedCellCode = (placementEntry?.[0] || patternCode) as CanonicalBreenCode;
      const result = scoreBuildPlacement(patternCode, placedCellCode);
      resultsMap[patternCode] = result;
      roundScore += Math.round(result.score * 10);
      if (result.exactMatch) exactCount += 1;
      nextStats = applyCellOutcome(nextStats, patternCode, {
        score: result.score,
        possible: 1,
        exact: result.exactMatch,
        partial: result.score > 0 && !result.exactMatch
      });
    });

    setSession({
      ...session,
      checked: true,
      results: resultsMap,
      stats: nextStats,
      score: session.score + roundScore,
      correctCount: exactCount,
      feedback: {
        tone: exactCount === session.trayCodes.length ? 'success' : exactCount ? 'warn' : 'error',
        text: exactCount === session.trayCodes.length
          ? 'יפה. כל התבניות ישבו בדיוק במקום שלהן.'
          : `יש כבר כיוון טוב: ${exactCount} מתוך ${session.trayCodes.length} יושבות בדיוק.`
      }
    });
  }

  function handleCompleteCellClick(cellCode: CanonicalBreenCode): void {
    if (!session || session.kind !== 'complete' || session.checked) return;
    if (!session.missingCodes.includes(cellCode)) return;
    if (session.resolvedCodes.includes(cellCode) && session.settings.sessionMode === 'learning') return;
    setSession({
      ...session,
      activeMissingCell: cellCode,
      feedback: {
        tone: 'info',
        text: 'האפשרויות נפתחו.',
        detail: 'בחר/י עכשיו את השם שמתאים לחור הזה.'
      }
    });
  }

  function chooseCompleteOption(optionCode: CanonicalBreenCode): void {
    if (!session || session.kind !== 'complete' || !session.activeMissingCell || session.checked) return;
    const targetCode = session.activeMissingCell;
    const mistakes = session.mistakesByCell[targetCode] || 0;

    if (session.settings.sessionMode === 'learning') {
      if (optionCode !== targetCode) {
        setSession({
          ...session,
          mistakesByCell: { ...session.mistakesByCell, [targetCode]: mistakes + 1 },
          streak: 0,
          feedback: {
            tone: 'warn',
            text: 'לא בדיוק. זה שייך למקום אחר בטבלה.',
            detail: 'נסה/י שוב דרך המשפחה והשכנים של התא.'
          }
        });
        return;
      }

      const fillScore = scoreCompleteChoice(mistakes);
      const nextResolved = uniqueCodes([...session.resolvedCodes, targetCode]);
      setSession({
        ...session,
        answers: { ...session.answers, [targetCode]: optionCode },
        stats: applyCellOutcome(session.stats, targetCode, {
          score: fillScore,
          possible: 1,
          exact: true
        }),
        resolvedCodes: nextResolved,
        activeMissingCell: null,
        score: session.score + Math.round(fillScore * 10),
        streak: session.streak + 1,
        bestStreak: Math.max(session.bestStreak, session.streak + 1),
        correctCount: nextResolved.length,
        feedback: {
          tone: mistakes === 0 ? 'success' : 'info',
          text: mistakes === 0 ? 'בול. החור הזה נסגר בדיוק.' : 'יפה. עכשיו המקום הזה יושב נכון יותר.'
        }
      });
      return;
    }

    const nextAnswers = { ...session.answers, [targetCode]: optionCode };
    setSession({
      ...session,
      answers: nextAnswers,
      activeMissingCell: null,
      feedback: {
        tone: 'info',
        text: 'התשובה נרשמה.',
        detail: allCompleteAnswered(session.missingCodes, nextAnswers) ? 'כל החורים מולאו. אפשר לבדוק.' : 'אפשר לבחור עכשיו את החור הבא.'
      }
    });
  }

  function checkCompleteSession(): void {
    if (!session || session.kind !== 'complete' || session.checked) return;
    if (!allCompleteAnswered(session.missingCodes, session.answers)) {
      setSession({
        ...session,
        feedback: {
          tone: 'warn',
          text: 'עדיין יש חורים שלא מולאו.',
          detail: 'לחץ/י על התא הבא והמשך/י להשלמה.'
        }
      });
      return;
    }

    let nextStats = session.stats;
    let gainedScore = 0;
    let correctCount = 0;
    session.missingCodes.forEach((code) => {
      const isCorrect = session.answers[code] === code;
      if (isCorrect) {
        correctCount += 1;
        gainedScore += 10;
      }
      nextStats = applyCellOutcome(nextStats, code, {
        score: isCorrect ? 1 : 0,
        possible: 1,
        exact: isCorrect
      });
    });

    setSession({
      ...session,
      checked: true,
      stats: nextStats,
      score: session.score + gainedScore,
      correctCount,
      feedback: {
        tone: correctCount === session.missingCodes.length ? 'success' : correctCount ? 'warn' : 'error',
        text: correctCount === session.missingCodes.length
          ? 'יפה. כל החורים הושלמו במדויק.'
          : `השלמת נכון ${correctCount} מתוך ${session.missingCodes.length}.`
      }
    });
  }

  function handleQuickCellClick(cellCode: CanonicalBreenCode): void {
    if (!session || session.kind !== 'quick' || session.answered) return;
    const currentPrompt = session.prompts[session.currentIndex];
    const responseMs = Date.now() - session.promptStartedAt;
    const correct = cellCode === currentPrompt.targetCode;
    const scorePack = scoreQuickLocate(correct, responseMs, session.settings.difficulty);
    const nextStreak = correct ? session.streak + 1 : 0;
    setSession({
      ...session,
      answered: true,
      selectedCode: cellCode,
      lastResponseMs: responseMs,
      stats: applyCellOutcome(session.stats, currentPrompt.targetCode, {
        score: correct ? 1 : 0,
        possible: 1,
        exact: correct,
        responseMs
      }),
      score: session.score + scorePack.points,
      streak: nextStreak,
      bestStreak: Math.max(session.bestStreak, nextStreak),
      correctCount: session.correctCount + (correct ? 1 : 0),
      feedback: correct
        ? {
            tone: 'success',
            text: scorePack.bonus > 0 ? `בול. גם נכון וגם חד. +${scorePack.points}` : `יפה. זה המקום הנכון. +${scorePack.points}`,
            detail: formatMs(responseMs)
          }
        : {
            tone: 'warn',
            text: 'כמעט. התא הנכון היה במקום אחר על המפה.',
            detail: `היעד היה: ${BREEN_TABLE_CELL_MAP[currentPrompt.targetCode].heTitle}`
          }
    });
  }

  function advanceQuickSession(): void {
    if (!session || session.kind !== 'quick' || !session.answered) return;
    if (session.currentIndex >= session.prompts.length - 1) {
      finishSession(session);
      return;
    }
    setSession({
      ...session,
      currentIndex: session.currentIndex + 1,
      promptStartedAt: Date.now(),
      answered: false,
      selectedCode: null,
      lastResponseMs: null,
      feedback: {
        tone: 'info',
        text: 'הלאה. היעד הבא כבר ממתין.'
      }
    });
  }

  return (
    <div className="btl-app" dir="rtl" lang="he" data-trainer-id="breen-table-lab" data-trainer-platform="1">
      <style>{`${TRAINER_PLATFORM_CSS}\n${BREEN_TABLE_LAB_CSS}`}</style>
      <div className="btl-shell">
        {screen === 'welcome' ? (
          <WelcomeScreen
            contractTitle={contract.title || 'מעבדת טבלת ברין'}
            contractSubtitle={contract.subtitle || 'בנייה, השלמה ושליפה בזמן אמת'}
            onStart={() => startSetup('build')}
            onChooseMode={() => startSetup()}
            onHowItWorks={() => setOverlay('how-it-works')}
            welcomeBoardStates={welcomeBoardStates}
          />
        ) : null}
        {screen === 'setup' ? (
          <SetupScreen
            setup={setup}
            onBack={() => setScreen('welcome')}
            onChange={setSetup}
            onStart={() => startSession(setup)}
          />
        ) : null}
        {screen === 'play' && session ? (
          <PlayScreen
            session={session}
            timerDisplay={timerDisplay}
            boardStates={playBoardStates}
            onHelp={() => setOverlay('help')}
            onExit={exitToSetup}
            onFinish={() => finishSession(session)}
            onBuildCellClick={handleBuildCellClick}
            onBuildCheck={checkBuildSession}
            onCompleteCellClick={handleCompleteCellClick}
            onCompleteChoose={chooseCompleteOption}
            onCompleteCheck={checkCompleteSession}
            onQuickCellClick={handleQuickCellClick}
            onQuickNext={advanceQuickSession}
            onSelectPattern={(code) => {
              if (!session || session.kind !== 'build' || session.checked) return;
              setSession({
                ...session,
                selectedPattern: session.selectedPattern === code ? null : code,
                feedback: {
                  tone: 'info',
                  text: `נבחרה התבנית "${BREEN_TABLE_CELL_MAP[code].heTitle}".`,
                  detail: 'עכשיו לחץ/י על המקום שלה בטבלת ברין.'
                }
              });
            }}
            onResetBuild={() => {
              if (!session || session.kind !== 'build' || session.checked) return;
              setSession({
                ...session,
                placements: session.prefilledCodes.reduce<Partial<Record<CanonicalBreenCode, CanonicalBreenCode>>>((acc, code) => {
                  acc[code] = code;
                  return acc;
                }, {}),
                selectedPattern: null,
                feedback: {
                  tone: 'info',
                  text: 'המגש נוקה. אפשר להתחיל מחדש את ההנחה על המפה.'
                }
              });
            }}
          />
        ) : null}
        {screen === 'results' && results ? (
          <ResultsScreen
            results={results}
            boardStates={resultsBoardStates}
            onRetry={() => startSession({
              ...setup,
              mode: results.mode,
              sessionMode: results.sessionMode,
              difficulty: results.difficulty
            })}
            onSwitchMode={() => startSetup(results.mode)}
            onHome={() => setScreen('welcome')}
          />
        ) : null}
      </div>
      {overlay ? (
        <Overlay title={overlay === 'help' ? helpTitle : 'איך זה עובד'} onClose={() => setOverlay(null)}>
          {overlay === 'how-it-works' ? renderHowItWorks() : renderHelpContent(session)}
        </Overlay>
      ) : null}
    </div>
  );
}

function WelcomeScreen({
  contractTitle,
  contractSubtitle,
  onStart,
  onChooseMode,
  onHowItWorks,
  welcomeBoardStates
}: {
  contractTitle: string;
  contractSubtitle: string;
  onStart: () => void;
  onChooseMode: () => void;
  onHowItWorks: () => void;
  welcomeBoardStates: Partial<Record<CanonicalBreenCode, BreenBoardCellState>>;
}): React.ReactElement {
  return (
    <>
      <section className="btl-hero">
        <article className="btl-hero-copy">
          <span className="btl-kicker">מרחב אימון חדש</span>
          <h1 className="btl-title">{contractTitle}</h1>
          <p className="btl-subtitle">{contractSubtitle}</p>
          <div className="btl-copy">
            כאן לא רק מזהים מונח. לומדים לראות את טבלת ברין כמפה חיה: מה יושב ליד מה, איזה אזור שייך לאיזו משפחה,
            ואיפה היד צריכה לנחות כשצריך לשלוף מיקום בזמן אמת.
          </div>
          <div className="btl-btn-row">
            <button type="button" className="btl-btn is-primary" onClick={onStart}>התחל תרגול</button>
            <button type="button" className="btl-btn is-secondary" onClick={onChooseMode}>בחר מצב</button>
            <button type="button" className="btl-btn is-ghost" onClick={onHowItWorks}>איך זה עובד</button>
          </div>
          <div className="btl-tag-grid">
            <div className="btl-tag">מזהים משפחות</div>
            <div className="btl-tag">זוכרים שכנים</div>
            <div className="btl-tag">שולפים מיקום</div>
            <div className="btl-tag">עובדים מהר יותר</div>
          </div>
        </article>
        <aside className="btl-hero-visual">
          <figure className="btl-hero-figure">
            <img src="assets/images/Michael Breen.jpg" alt="מייקל ברין" loading="eager" />
            <figcaption className="btl-figure-caption">
              מייקל ברין, שהציג את טבלת ברין כמפת עבודה שמסדרת את תבניות המטה-מודל במרחב אחד יציב.
            </figcaption>
          </figure>
        </aside>
      </section>

      <section className="btl-mode-grid">
        {BREEN_TABLE_MODE_CARDS.map((card) => (
          <article key={card.id} className="btl-mode-card">
            <div className="btl-mode-meta">
              <span className="btl-pill" data-tone={toneForMode(card.id)}>{card.heTitle}</span>
              <span>{card.subtitle}</span>
            </div>
            <h3>{card.heTitle}</h3>
            <p>{card.body}</p>
          </article>
        ))}
      </section>

      <section className="btl-mini-demo">
        <article className="btl-mini-card">
          <span className="btl-kicker">למה זה חשוב</span>
          <h3>כשהמפה יושבת, החשיבה נהיית מסודרת יותר</h3>
          <ul className="btl-mini-list">
            <li>פחות מחפשים את המונח בראש ויותר רואים איפה הוא יושב.</li>
            <li>יותר קל לזהות מה שייך לעיוות, מה להכללה ומה נופל לאזור של מחיקה.</li>
            <li>תחת לחץ, היד כבר יודעת לאן ללכת.</li>
          </ul>
        </article>

        <article className="btl-mini-card">
          <span className="btl-kicker">מיני הדגמה</span>
          <h3>כך נראית המפה כשהיא מתחילה להתייצב</h3>
          <BreenTableBoard
            title="מפת ברין · הדגמה"
            subtitle="כמה עוגנים שכבר קל לזהות במבט."
            variant="mini"
            showLegend={false}
            cellStates={welcomeBoardStates}
          />
        </article>
      </section>

      <section className="btl-info-card">
        <span className="btl-kicker">קריאה לפעולה</span>
        <h3>לא רק לזהות תבניות, אלא להתחיל לראות את המפה מול העיניים</h3>
        <div className="btl-btn-row">
          <button type="button" className="btl-btn is-primary" onClick={onChooseMode}>התחל במצב בנייה</button>
          <button type="button" className="btl-btn is-secondary" onClick={onChooseMode}>התחל במצב השלמה</button>
          <button type="button" className="btl-btn is-ghost" onClick={onChooseMode}>התחל במצב איתור מהיר</button>
        </div>
      </section>
    </>
  );
}

function SetupScreen({
  setup,
  onBack,
  onChange,
  onStart
}: {
  setup: SetupState;
  onBack: () => void;
  onChange: (value: SetupState) => void;
  onStart: () => void;
}): React.ReactElement {
  return (
    <section className="btl-setup-grid">
      <article className="btl-setup-card">
        <div className="btl-screen-head">
          <div>
            <span className="btl-kicker">בחירת מצב</span>
            <h2>מכינים את הסשן הבא</h2>
            <p className="btl-body">המסך הזה נשאר קצר: בוחרים איך לעבוד עם המפה, ואז נכנסים ישר לתרגול.</p>
          </div>
          <div className="btl-btn-row">
            <button type="button" className="btl-btn is-secondary" onClick={onBack}>חזרה</button>
            <button type="button" className="btl-btn is-primary" onClick={onStart}>התחל סשן</button>
          </div>
        </div>

        <div className="btl-choice-cluster">
          <span className="btl-kicker">1. מצב תרגול</span>
          <div className="btl-mode-grid">
            {BREEN_TABLE_MODE_CARDS.map((card) => (
              <button
                key={card.id}
                type="button"
                className="btl-choice-card"
                data-selected={setup.mode === card.id ? '1' : '0'}
                onClick={() => onChange({ ...setup, mode: card.id })}
              >
                <strong>{card.heTitle}</strong>
                <small>{card.subtitle}</small>
                <small>{card.body}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="btl-option-grid">
          <OptionChooser
            title="2. אופי העבודה"
            items={(Object.keys(SESSION_MODE_COPY) as BreenLabSessionMode[]).map((key) => ({
              key,
              title: SESSION_MODE_COPY[key].he,
              subtitle: SESSION_MODE_COPY[key].subtitle,
              selected: setup.sessionMode === key,
              onSelect: () => onChange({ ...setup, sessionMode: key })
            }))}
          />
          <OptionChooser
            title="3. קושי"
            items={([1, 2, 3] as BreenLabDifficulty[]).map((key) => ({
              key,
              title: DIFFICULTY_COPY[key].he,
              subtitle: DIFFICULTY_COPY[key].subtitle,
              selected: setup.difficulty === key,
              onSelect: () => onChange({ ...setup, difficulty: key })
            }))}
          />
          <OptionChooser
            title="4. גודל הסבב"
            items={([6, 9, 12, 15] as RoundSize[]).map((key) => ({
              key,
              title: `${key} פריטים`,
              subtitle: setup.mode === 'quick' ? 'כמות היעדים לשליפה מהירה.' : 'כמה מקומות נעבוד עליהם בסבב הזה.',
              selected: setup.roundSize === key,
              onSelect: () => onChange({ ...setup, roundSize: key })
            }))}
          />
          <OptionChooser
            title="5. טיימר"
            items={[
              {
                key: 'off',
                title: 'ללא טיימר',
                subtitle: 'עובדים בקצב פנימי וללא לחץ זמן.',
                selected: !setup.timerEnabled,
                onSelect: () => onChange({ ...setup, timerEnabled: false })
              },
              {
                key: 'on',
                title: 'עם טיימר',
                subtitle: 'מציג זמן ריצה ומחדד שליפה בזמן אמת.',
                selected: setup.timerEnabled,
                onSelect: () => onChange({ ...setup, timerEnabled: true })
              }
            ]}
          />
        </div>

        {setup.mode === 'quick' ? (
          <OptionChooser
            title="6. סוג היעד באיתור מהיר"
            items={(Object.keys(PROMPT_TYPE_COPY) as BreenLabPromptType[]).map((key) => ({
              key,
              title: PROMPT_TYPE_COPY[key].he,
              subtitle: PROMPT_TYPE_COPY[key].subtitle,
              selected: setup.quickPromptType === key,
              onSelect: () => onChange({ ...setup, quickPromptType: key })
            }))}
          />
        ) : null}
      </article>

      <aside className="btl-setup-card">
        <span className="btl-kicker">תצוגה מקדימה</span>
        <h3>כך ייראה הסשן הבא</h3>
        <div className="btl-preview">
          <div className="btl-pill-row">
            <span className="btl-pill" data-tone={toneForMode(setup.mode)}>{formatModeLabel(setup.mode)}</span>
            <span className="btl-pill">{formatSessionModeLabel(setup.sessionMode)}</span>
            <span className="btl-pill">{DIFFICULTY_COPY[setup.difficulty].he}</span>
          </div>
          <ul className="btl-preview-list">
            <li>הטבלה נשארת כל הזמן במרכז, כדי שהזיכרון המרחבי יוביל את העבודה.</li>
            <li>העומס הוא {setup.roundSize} פריטים, עם {setup.timerEnabled ? 'טיימר פעיל' : 'קצב חופשי'}.</li>
            <li>{previewLineForMode(setup)}</li>
          </ul>
          <div className="btl-btn-row">
            <button type="button" className="btl-btn is-primary" onClick={onStart}>התחל עכשיו</button>
          </div>
        </div>
      </aside>
    </section>
  );
}

function PlayScreen({
  session,
  timerDisplay,
  boardStates,
  onHelp,
  onExit,
  onFinish,
  onBuildCellClick,
  onBuildCheck,
  onCompleteCellClick,
  onCompleteChoose,
  onCompleteCheck,
  onQuickCellClick,
  onQuickNext,
  onSelectPattern,
  onResetBuild
}: {
  session: ActiveSession;
  timerDisplay: string;
  boardStates: Partial<Record<CanonicalBreenCode, BreenBoardCellState>>;
  onHelp: () => void;
  onExit: () => void;
  onFinish: () => void;
  onBuildCellClick: (code: CanonicalBreenCode) => void;
  onBuildCheck: () => void;
  onCompleteCellClick: (code: CanonicalBreenCode) => void;
  onCompleteChoose: (code: CanonicalBreenCode) => void;
  onCompleteCheck: () => void;
  onQuickCellClick: (code: CanonicalBreenCode) => void;
  onQuickNext: () => void;
  onSelectPattern: (code: CanonicalBreenCode) => void;
  onResetBuild: () => void;
}): React.ReactElement {
  const progressLabel = playProgressLabel(session);
  const phaseIndex = session.kind === 'quick'
    ? (session.answered ? 3 : 2)
    : session.kind === 'build'
      ? (session.checked ? 3 : session.selectedPattern ? 2 : 1)
      : session.checked || session.correctCount >= session.totalTargets
        ? 3
        : session.activeMissingCell
          ? 2
          : 1;
  const placedCount = session.kind === 'build' ? Object.keys(session.placements).length : 0;
  const answeredCount = session.kind === 'complete' ? Object.keys(session.answers).length : 0;
  const activeQuickPrompt = session.kind === 'quick' ? session.prompts[session.currentIndex] : null;

  const primaryAction = (() => {
    if (session.kind === 'build') {
      if (session.checked) return <button type="button" className="btl-btn is-primary" onClick={onFinish}>לסיכום</button>;
      return <button type="button" className="btl-btn is-primary" onClick={onBuildCheck}>בדוק</button>;
    }
    if (session.kind === 'complete') {
      const canFinish = session.settings.sessionMode === 'learning' ? session.correctCount >= session.totalTargets : session.checked;
      if (canFinish) return <button type="button" className="btl-btn is-primary" onClick={onFinish}>לסיכום</button>;
      return <button type="button" className="btl-btn is-primary" onClick={onCompleteCheck}>בדוק</button>;
    }
    if (session.answered && session.currentIndex >= session.prompts.length - 1) {
      return <button type="button" className="btl-btn is-primary" onClick={onFinish}>לסיכום</button>;
    }
    return <button type="button" className="btl-btn is-primary" onClick={onQuickNext} disabled={!session.answered}>הלאה</button>;
  })();

  const focusPanel = (() => {
    if (session.kind === 'build') {
      return (
        <div className="btl-focus-card">
          <div className="btl-pill-row">
            <span className="btl-pill" data-tone={toneForMode(session.kind)}>מגש תבניות</span>
            <span className="btl-pill">{placedCount}/{session.trayCodes.length} שובצו</span>
          </div>
          <div className="btl-focus-selection" data-empty={session.selectedPattern ? '0' : '1'}>
            <span className="btl-focus-label">נבחר עכשיו</span>
            <strong>{session.selectedPattern ? BREEN_TABLE_CELL_MAP[session.selectedPattern].heTitle : 'עדיין לא נבחרה תבנית'}</strong>
            <p>{session.selectedPattern ? 'יופי. עכשיו לוחצים על המקום שלה בטבלה.' : 'הבחירה מתחילה כאן, והדיוק קורה על הלוח.'}</p>
          </div>
          <div className="btl-tray">
            {session.trayCodes.map((code) => {
              const placed = Object.values(session.placements).includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  className="btl-tray-item"
                  data-selected={session.selectedPattern === code ? '1' : '0'}
                  data-placed={placed ? '1' : '0'}
                  disabled={session.checked}
                  onClick={() => onSelectPattern(code)}
                >
                  {BREEN_TABLE_CELL_MAP[code].heTitle}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (session.kind === 'complete') {
      return (
        <div className="btl-focus-card">
          <div className="btl-pill-row">
            <span className="btl-pill" data-tone={toneForMode(session.kind)}>חורים פתוחים</span>
            <span className="btl-pill">{answeredCount}/{session.totalTargets} נענו</span>
          </div>
          <div className="btl-focus-selection" data-empty={session.activeMissingCell ? '0' : '1'}>
            <span className="btl-focus-label">החור הפעיל</span>
            <strong>{session.activeMissingCell ? BREEN_TABLE_CELL_MAP[session.activeMissingCell].rowLabelHe : 'לחץ/י על חור בטבלה'}</strong>
            <p>{session.activeMissingCell ? 'בחר/י את השם שמתאים לתא הזה.' : 'המפה תוביל אותך. לחיצה על חור פותחת את האפשרויות כאן.'}</p>
          </div>
          {session.activeMissingCell && !session.checked ? (
            <div className="btl-choice-inline">
              <strong>מה נכנס לכאן?</strong>
              <div className="btl-choice-inline-grid">
                {(session.optionsByCell[session.activeMissingCell] || []).map((code) => (
                  <button key={code} type="button" onClick={() => onCompleteChoose(code)}>
                    {BREEN_TABLE_CELL_MAP[code].heTitle}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="btl-focus-hint">
              {session.checked ? 'הבדיקה הסתיימה. אפשר לעבור לסיכום.' : 'אין צורך לגלול. כל הבחירה תופיע כאן בצד הימני.'}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="btl-focus-card">
        <div className="btl-pill-row">
          <span className="btl-pill" data-tone={toneForPromptType(activeQuickPrompt?.promptType || 'name')}>
            {activeQuickPrompt?.promptType === 'example' ? 'דוגמת משפט' : 'שם תבנית'}
          </span>
          <span className="btl-pill">{session.currentIndex + 1}/{session.prompts.length}</span>
        </div>
        <div className="btl-focus-selection" data-empty="0">
          <span className="btl-focus-label">מוצאים עכשיו</span>
          <strong>{activeQuickPrompt?.promptType === 'name' ? activeQuickPrompt.promptText : 'לאן המשפט הזה שייך?'}</strong>
          <p>{activeQuickPrompt?.promptText}</p>
        </div>
        <div className="btl-focus-hint">
          {session.answered ? 'היעד נבדק. עוד רגע ממשיכים ליעד הבא.' : 'הטבלה פתוחה מולך. רואים, מזהים, ולוחצים ישר על התא.'}
        </div>
      </div>
    );
  })();

  return (
    <section className="btl-play-shell">
      <div className="btl-topbar btl-topbar--play">
        <div className="btl-topbar-main">
          <span className="btl-kicker">מעבדת טבלת ברין · {formatModeLabel(session.kind)}</span>
          <div className="btl-topbar-copy">
            <h2>{playHeadline(session)}</h2>
            <p className="btl-topbar-note">{playSubheadline(session)}</p>
          </div>
          <div className="btl-phase-strip" aria-label="שלבי התרגול">
            {phasePillsForSession(session).map((label, index) => (
              <span key={label} className="btl-phase" data-active={phaseIndex === index + 1 ? '1' : '0'}>{label}</span>
            ))}
          </div>
        </div>
        <div className="btl-status-grid">
          <div className="btl-stat-row">
            <span className="btl-stat"><strong>{progressLabel}</strong><span>התקדמות</span></span>
            <span className="btl-stat"><strong>{session.score}</strong><span>ניקוד</span></span>
            <span className="btl-stat"><strong>{session.streak}</strong><span>רצף</span></span>
            <span className="btl-stat"><strong>{timerDisplay}</strong><span>זמן</span></span>
          </div>
          <div className="btl-header-actions">
            <button type="button" className="btl-btn is-ghost" onClick={onHelp}>עזרה</button>
            <button type="button" className="btl-btn is-secondary" onClick={onExit}>יציאה</button>
          </div>
        </div>
      </div>

      <div className="btl-workbench">
        <aside className="btl-focus-panel">
          <div className="btl-focus-head">
            <span className="btl-kicker">המשימה עכשיו</span>
            <h3>{focusHeadline(session)}</h3>
            <p className="btl-copy">{focusSubline(session)}</p>
          </div>

          {focusPanel}

          <div className="btl-focus-footer">
            <div className="btl-feedback-copy">
              <div className="btl-pill-row">
                <span className="btl-pill" data-tone={toneForMode(session.kind)}>{formatModeLabel(session.kind)}</span>
                <span className="btl-pill">{formatSessionModeLabel(session.settings.sessionMode)}</span>
                {session.kind === 'quick' ? <span className="btl-pill">{formatPromptTypeLabel(session.settings.quickPromptType)}</span> : null}
              </div>
              <div className="btl-feedback" data-tone={session.feedback?.tone || 'info'}>
                {session.feedback?.text || defaultFeedback(session)}
                {session.feedback?.detail ? <small>{session.feedback.detail}</small> : null}
              </div>
            </div>
            <div className="btl-inline-actions">
              {primaryAction}
              {session.kind === 'build' && !session.checked ? (
                <button type="button" className="btl-btn is-secondary" onClick={onResetBuild}>נקה</button>
              ) : null}
            </div>
          </div>
        </aside>

        <article className="btl-board-panel">
          <BreenTableBoard
            title="טבלת ברין"
            showHeader={false}
            showLegend={false}
            cellStates={boardStates}
            onCellClick={
              session.kind === 'build'
                ? onBuildCellClick
                : session.kind === 'complete'
                  ? onCompleteCellClick
                  : onQuickCellClick
            }
          />
        </article>
      </div>
    </section>
  );
}

function ResultsScreen({
  results,
  boardStates,
  onRetry,
  onSwitchMode,
  onHome
}: {
  results: ResultsState;
  boardStates: Partial<Record<CanonicalBreenCode, BreenBoardCellState>>;
  onRetry: () => void;
  onSwitchMode: () => void;
  onHome: () => void;
}): React.ReactElement {
  return (
    <section className="btl-results-grid">
      <article className="btl-results-card">
        <span className="btl-kicker">סיכום סבב</span>
        <h2>{results.accuracy >= 0.8 ? 'יפה. סיימת את הסבב' : results.accuracy >= 0.55 ? 'המפה מתחילה להתייצב' : 'יש אזורים שכבר מתחילים לשבת'}</h2>
        <p className="btl-body">הטבלה עצמה הופכת כאן לדיאגנוסטיקה: איפה הזיכרון כבר יציב, ואיפה עוד כדאי לחזור כדי לחדד את המיקום.</p>
        <div className="btl-metric-grid">
          <MetricCard label="ניקוד" value={String(results.score)} />
          <MetricCard label="דיוק" value={`${Math.round(results.accuracy * 100)}%`} />
          <MetricCard label="רצף מיטבי" value={String(results.bestStreak)} />
          <MetricCard label="זמן" value={formatElapsed(results.durationMs)} />
        </div>
        <BreenTableBoard
          title="מפת חוזקות וחולשות"
          subtitle="ירוק מייצב, כתום כמעט יושב, ואדום מסמן אזורים שכדאי לחזור אליהם."
          variant="results"
          cellStates={boardStates}
        />
      </article>

      <aside className="btl-results-card">
        <span className="btl-kicker">תובנות קצרות</span>
        <h3>{formatModeLabel(results.mode)} · {formatSessionModeLabel(results.sessionMode)}</h3>
        <ul className="btl-insights">
          {results.insights.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <div className="btl-info-card">
          <h3>איפה אפשר לדייק עכשיו</h3>
          <div className="btl-chip-row">
            {results.weakCodes.map((code) => <span key={code} className="btl-pill">{BREEN_TABLE_CELL_MAP[code].heTitle}</span>)}
          </div>
        </div>
        <div className="btl-btn-row">
          <button type="button" className="btl-btn is-primary" onClick={onRetry}>נסה שוב</button>
          <button type="button" className="btl-btn is-secondary" onClick={onSwitchMode}>עבור למצב אחר</button>
          <button type="button" className="btl-btn is-ghost" onClick={onHome}>חזור לדף קבלת הפנים</button>
        </div>
      </aside>
    </section>
  );
}

function OptionChooser({
  title,
  items
}: {
  title: string;
  items: Array<{ key: string | number; title: string; subtitle: string; selected: boolean; onSelect: () => void }>;
}): React.ReactElement {
  return (
    <section className="btl-choice-cluster">
      <span className="btl-kicker">{title}</span>
      <div className="btl-option-grid">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            className="btl-choice-card"
            data-selected={item.selected ? '1' : '0'}
            onClick={item.onSelect}
          >
            <strong>{item.title}</strong>
            <small>{item.subtitle}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function Overlay({
  title,
  children,
  onClose
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="btl-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="btl-modal">
        <div className="btl-modal-head">
          <div>
            <span className="btl-kicker">חלונית עזר</span>
            <h3>{title}</h3>
          </div>
          <button type="button" className="btl-btn is-secondary" onClick={onClose}>סגור</button>
        </div>
        <div className="btl-modal-body">{children}</div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="btl-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function renderHowItWorks(): React.ReactElement {
  return (
    <>
      <p>המטרה כאן איננה רק לזכור שמות, אלא להפוך את טבלת ברין למפה שמרגישה מוכרת בעין וביד.</p>
      <ul className="btl-insights">
        <li>במצב בנייה בוחרים שם ומניחים אותו במקום שלו.</li>
        <li>במצב השלמה סוגרים חורים חסרים מתוך כמה אפשרויות קצרות.</li>
        <li>במצב איתור מהיר רואים יעד ולוחצים על המיקום בזמן אמת.</li>
      </ul>
      <p>אם ההסבר התיאורטי חשוב יותר כרגע, דף הפתיחה הוא המקום להישאר בו לפני שנכנסים לעבודה עצמה.</p>
    </>
  );
}

function renderHelpContent(session: ActiveSession | null): React.ReactElement {
  if (!session) return renderHowItWorks();
  if (session.kind === 'build') {
    return (
      <>
        <p>בוחרים תבנית אחת מהמגש, ואז לוחצים על התא שבו היא אמורה לשבת בטבלת ברין.</p>
        <p>טיפ קצר: אם את/ה לא זוכר/ת תא מדויק, נסה/י קודם לזהות את המשפחה ואת האזור בשורה.</p>
        <p>ההסבר הרחב על המבנה נמצא בדף קבלת הפנים.</p>
      </>
    );
  }
  if (session.kind === 'complete') {
    return (
      <>
        <p>לחיצה על תא חסר פותחת כמה אפשרויות קצרות. בוחרים את השם שהכי מתאים בדיוק לחור הזה.</p>
        <p>טיפ קצר: שים/י לב לשכנים של התא ולמשפחה שאליה הוא שייך.</p>
        <p>להסבר רחב יותר על הטבלה עצמה אפשר תמיד לחזור לדף קבלת הפנים.</p>
      </>
    );
  }
  return (
    <>
      <p>במצב איתור מהיר רואים שם תבנית או דוגמת משפט, ואז לוחצים כמה שיותר מהר על המיקום בטבלה.</p>
      <p>טיפ קצר: אל תחפש/י רשימה בראש. נסה/י להרגיש קודם את האזור במפה ורק אחר כך את התא המדויק.</p>
      <p>ההסבר הרחב והרגוע יותר נשאר בדף הפתיחה.</p>
    </>
  );
}

function buildInitialSession(settings: SetupState): ActiveSession {
  const startedAt = Date.now();
  if (settings.mode === 'build') return createBuildSession(settings, startedAt);
  if (settings.mode === 'complete') return createCompleteSession(settings, startedAt);
  return createQuickSession(settings, startedAt);
}

function createBuildSession(settings: SetupState, startedAt: number): BuildSession {
  const targetCount = clamp(settings.roundSize, 6, 15);
  const targetCodes = sampleCodes(targetCount);
  const prefillCount = settings.difficulty === 1 ? 3 : settings.difficulty === 2 ? 1 : settings.sessionMode === 'learning' ? 1 : 0;
  const prefilledCodes = shuffle([...targetCodes]).slice(0, Math.min(prefillCount, Math.max(0, targetCodes.length - 2)));
  const trayCodes = targetCodes.filter((code) => !prefilledCodes.includes(code));
  return {
    kind: 'build',
    settings,
    startedAt,
    score: 0,
    streak: 0,
    bestStreak: 0,
    feedback: {
      tone: 'info',
      text: 'בחר/י תבנית מהמגש, ואז הנח/י אותה במקום שלה על המפה.'
    },
    stats: createEmptyCellStats(),
    correctCount: 0,
    totalTargets: trayCodes.length,
    prefilledCodes,
    trayCodes,
    selectedPattern: null,
    placements: prefilledCodes.reduce<Partial<Record<CanonicalBreenCode, CanonicalBreenCode>>>((acc, code) => {
      acc[code] = code;
      return acc;
    }, {}),
    checked: false,
    results: {}
  };
}

function createCompleteSession(settings: SetupState, startedAt: number): CompleteSession {
  const totalMissing = clamp(Math.round(settings.roundSize / 2), 3, 7);
  const shuffled = sampleCodes(CANONICAL_BREEN_ORDER.length);
  const missingCodes = shuffled.slice(0, totalMissing);
  const fixedCodes = CANONICAL_BREEN_ORDER.filter((code) => !missingCodes.includes(code));
  const optionsByCell = missingCodes.reduce<Partial<Record<CanonicalBreenCode, CanonicalBreenCode[]>>>((acc, code) => {
    const distractors = pickDistractors(code, settings.difficulty);
    acc[code] = shuffle([code, ...distractors]).slice(0, settings.difficulty === 1 ? 3 : 4);
    return acc;
  }, {});
  return {
    kind: 'complete',
    settings,
    startedAt,
    score: 0,
    streak: 0,
    bestStreak: 0,
    feedback: {
      tone: 'info',
      text: 'לחץ/י על אחד החורים החסרים כדי להשלים אותו.'
    },
    stats: createEmptyCellStats(),
    correctCount: 0,
    totalTargets: missingCodes.length,
    fixedCodes,
    missingCodes,
    optionsByCell,
    activeMissingCell: missingCodes[0] || null,
    answers: {},
    mistakesByCell: {},
    resolvedCodes: [],
    checked: false
  };
}

function createQuickSession(settings: SetupState, startedAt: number): QuickSession {
  const promptCount = clamp(settings.roundSize, 6, 15);
  const promptCodes = sampleCodes(promptCount);
  const prompts = promptCodes.map((code, index) => {
    const promptType = resolvePromptType(settings.quickPromptType, index);
    return {
      id: `${code}-${index}`,
      targetCode: code,
      promptType,
      promptText: promptType === 'name' ? BREEN_TABLE_CELL_MAP[code].heTitle : sampleExample(code)
    } satisfies QuickPrompt;
  });
  return {
    kind: 'quick',
    settings,
    startedAt,
    score: 0,
    streak: 0,
    bestStreak: 0,
    feedback: {
      tone: 'info',
      text: 'היעד הראשון כבר ממתין. הסתכל/י על המפה ולחץ/י.'
    },
    stats: createEmptyCellStats(),
    correctCount: 0,
    totalTargets: prompts.length,
    prompts,
    currentIndex: 0,
    promptStartedAt: Date.now(),
    answered: false,
    selectedCode: null,
    lastResponseMs: null
  };
}

function buildBoardState(session: BuildSession): Partial<Record<CanonicalBreenCode, BreenBoardCellState>> {
  return CANONICAL_BREEN_ORDER.reduce<Partial<Record<CanonicalBreenCode, BreenBoardCellState>>>((acc, cellCode) => {
    const placedPattern = session.placements[cellCode];
    if (session.prefilledCodes.includes(cellCode)) {
      acc[cellCode] = {
        title: BREEN_TABLE_CELL_MAP[cellCode].heTitle,
        tone: 'prefilled'
      };
      return acc;
    }
    if (placedPattern) {
      const result = session.results[placedPattern];
      acc[cellCode] = {
        title: BREEN_TABLE_CELL_MAP[placedPattern].heTitle,
        subtitle: session.checked ? (result?.exactMatch ? 'בדיוק' : result?.score ? 'כמעט' : 'לא כאן') : undefined,
        tone: session.checked ? (result?.exactMatch ? 'correct' : result?.score ? 'partial' : 'incorrect') : 'placed',
        active: session.selectedPattern === placedPattern
      };
      return acc;
    }
    acc[cellCode] = {
      title: null,
      subtitle: session.selectedPattern ? 'לחץ/י למיקום' : undefined,
      tone: 'ghost',
      active: session.selectedPattern != null,
      showDefaultTitle: false
    };
    return acc;
  }, {});
}

function completeBoardState(session: CompleteSession): Partial<Record<CanonicalBreenCode, BreenBoardCellState>> {
  return CANONICAL_BREEN_ORDER.reduce<Partial<Record<CanonicalBreenCode, BreenBoardCellState>>>((acc, cellCode) => {
    const isMissing = session.missingCodes.includes(cellCode);
    if (!isMissing) {
      acc[cellCode] = {
        title: BREEN_TABLE_CELL_MAP[cellCode].heTitle,
        tone: 'prefilled'
      };
      return acc;
    }

    const answer = session.answers[cellCode];
    const resolved = session.resolvedCodes.includes(cellCode);
    if (session.checked) {
      acc[cellCode] = {
        title: BREEN_TABLE_CELL_MAP[cellCode].heTitle,
        subtitle: answer === cellCode ? 'הושלם' : answer ? `נבחר: ${BREEN_TABLE_CELL_MAP[answer].heTitle}` : 'חסר',
        tone: answer === cellCode ? 'correct' : 'incorrect'
      };
      return acc;
    }
    if (resolved) {
      acc[cellCode] = {
        title: BREEN_TABLE_CELL_MAP[cellCode].heTitle,
        tone: 'correct'
      };
      return acc;
    }
    if (answer && session.settings.sessionMode === 'test') {
      acc[cellCode] = {
        title: BREEN_TABLE_CELL_MAP[answer].heTitle,
        subtitle: 'נבחר',
        tone: 'placed'
      };
      return acc;
    }
    acc[cellCode] = {
      title: '…',
      subtitle: session.activeMissingCell === cellCode ? 'פתוח עכשיו' : undefined,
      tone: session.activeMissingCell === cellCode ? 'active' : 'missing',
      active: session.activeMissingCell === cellCode,
      showDefaultTitle: false
    };
    return acc;
  }, {});
}

function quickBoardState(session: QuickSession): Partial<Record<CanonicalBreenCode, BreenBoardCellState>> {
  const prompt = session.prompts[session.currentIndex];
  return CANONICAL_BREEN_ORDER.reduce<Partial<Record<CanonicalBreenCode, BreenBoardCellState>>>((acc, cellCode) => {
    let tone: BreenBoardCellState['tone'] = 'prompt';
    let subtitle: React.ReactNode;
    if (session.answered) {
      if (cellCode === prompt.targetCode) {
        tone = 'correct';
        subtitle = 'כאן';
      } else if (cellCode === session.selectedCode) {
        tone = 'incorrect';
        subtitle = 'נבחר';
      }
    }
    acc[cellCode] = {
      title: null,
      subtitle,
      tone,
      showDefaultTitle: false
    };
    return acc;
  }, {});
}

function buildPlacementFeedback(result: BuildPlacementScore): FeedbackState {
  if (result.exactMatch) {
    return {
      tone: 'success',
      text: 'בול. התבנית הונחה בדיוק במקום שלה על המפה.',
      detail: 'אפשר לבחור את הפריט הבא מהמגש.'
    };
  }
  if (result.familyMatch || result.rowMatch) {
    return {
      tone: 'warn',
      text: 'כמעט. יש כבר כיוון טוב, אבל התא עוד לא המדויק.',
      detail: result.familyMatch ? 'המשפחה נכונה, ועכשיו נשאר לחדד את התא.' : 'השורה קרובה, אבל המשפחה עוד לא יושבת.'
    };
  }
  return {
    tone: 'error',
    text: 'עוד לא. המקום הזה שייך לאזור אחר בטבלה.',
    detail: 'נסה/י שוב דרך המשפחה, השורה והשכנים.'
  };
}

function playProgressLabel(session: ActiveSession): string {
  if (session.kind === 'build') return `${Object.keys(session.placements).length}/${session.trayCodes.length}`;
  if (session.kind === 'complete') return `${Object.keys(session.answers).length}/${session.totalTargets}`;
  return `${session.currentIndex + 1}/${session.prompts.length}`;
}

function focusHeadline(session: ActiveSession): string {
  if (session.kind === 'build') return 'בוחרים שם ומניחים אותו במקום המדויק על המפה';
  if (session.kind === 'complete') return 'מזהים מה חסר וסוגרים את הפער מתוך האפשרויות';
  return 'רואים יעד אחד ומחזירים אותו מיד למיקום שלו בטבלה';
}

function focusSubline(session: ActiveSession): string {
  if (session.kind === 'build') return 'נקודת ההתחלה יושבת כאן מימין, אבל המפה נשארת המרכז שמחזיר את המיקום.';
  if (session.kind === 'complete') return 'השכנים, השורה והמשפחה עובדים יחד. לא צריך יותר ממבט אחד כדי לבחור.';
  return 'העין נוחתת על היעד, ואז זזה ישר אל התא המתאים בלי רעש מיותר מסביב.';
}

function playHeadline(session: ActiveSession): string {
  if (session.kind === 'build') return 'מציבים שמות במקומות שלהם';
  if (session.kind === 'complete') return 'סוגרים את החורים החסרים';
  return 'שליפה מהירה מתוך המפה';
}

function playSubheadline(session: ActiveSession): string {
  if (session.kind === 'build') return 'המגש נותן שם, הטבלה מחזירה מקום.';
  if (session.kind === 'complete') return 'העין נעזרת בשכנים, במשפחה ובאזור כדי לסגור את הפער.';
  return 'היעד מופיע, ואת/ה מגיב/ה למיקום שלו בזמן אמת.';
}

function phasePillsForSession(session: ActiveSession): string[] {
  if (session.kind === 'build') return ['בוחרים', 'ממקמים', 'רואים'];
  if (session.kind === 'complete') return ['מזהים', 'משלימים', 'רואים'];
  return ['רואים', 'לוחצים', 'רואים'];
}

function defaultFeedback(session: ActiveSession): string {
  if (session.kind === 'build') {
    return session.selectedPattern
      ? `בחרת "${BREEN_TABLE_CELL_MAP[session.selectedPattern].heTitle}". עכשיו לחץ/י על התא שלה בטבלה.`
      : 'בחר/י תבנית מהמגש כדי להתחיל.';
  }
  if (session.kind === 'complete') {
    return session.activeMissingCell ? 'האפשרויות פתוחות. בחר/י את השם המתאים.' : 'לחץ/י על אחד החורים בטבלה כדי להתחיל.';
  }
  return session.answered ? 'היעד נבדק. אפשר להמשיך לפריט הבא.' : 'ראה/י את היעד, ואז לחץ/י על המקום שלו בטבלה.';
}

function previewLineForMode(setup: SetupState): string {
  if (setup.mode === 'build') return 'בסבב בנייה תראה/י מגש תבניות ותניח/י אותן על המקומות שלהן בטבלה.';
  if (setup.mode === 'complete') return 'בסבב השלמה תסגור/י חורים חסרים מתוך כמה אפשרויות קצרות.';
  return `בסבב איתור מהיר היעד יוצג ב-${PROMPT_TYPE_COPY[setup.quickPromptType].he.toLowerCase()}, והתגובה תימדד בזמן אמת.`;
}

function allCompleteAnswered(missingCodes: CanonicalBreenCode[], answers: Partial<Record<CanonicalBreenCode, CanonicalBreenCode>>): boolean {
  return missingCodes.every((code) => Boolean(answers[code]));
}

function sampleCodes(count: number): CanonicalBreenCode[] {
  return shuffle([...CANONICAL_BREEN_ORDER]).slice(0, clamp(count, 1, CANONICAL_BREEN_ORDER.length));
}

function pickDistractors(code: CanonicalBreenCode, difficulty: BreenLabDifficulty): CanonicalBreenCode[] {
  const target = BREEN_TABLE_CELL_MAP[code];
  const sameFamily = familyCodes(target.family).filter((current) => current !== code);
  const sameRow = BREEN_TABLE_CELLS.filter((cell) => cell.row === target.row && cell.id !== code).map((cell) => cell.id);
  const pool = uniqueCodes([...shuffle(sameFamily), ...shuffle(sameRow), ...shuffle(CANONICAL_BREEN_ORDER.filter((current) => current !== code))]);
  return pool.slice(0, difficulty === 1 ? 2 : 3);
}

function sampleExample(code: CanonicalBreenCode): string {
  const examples = BREEN_TABLE_CELL_MAP[code].exampleLines;
  return examples[Math.floor(Math.random() * examples.length)] || BREEN_TABLE_CELL_MAP[code].heTitle;
}

function resolvePromptType(type: BreenLabPromptType, index: number): 'name' | 'example' {
  if (type === 'mixed') return index % 2 === 0 ? 'name' : 'example';
  return type;
}

function toneForMode(mode: BreenLabMode): 'distortion' | 'generalization' | 'deletion' {
  if (mode === 'build') return 'distortion';
  if (mode === 'complete') return 'generalization';
  return 'deletion';
}

function toneForPromptType(type: 'name' | 'example'): 'distortion' | 'extra' {
  return type === 'name' ? 'distortion' : 'extra';
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function formatMs(ms: number): string {
  return `${(Math.max(ms, 0) / 1000).toFixed(1)} שנ׳`;
}

function uniqueCodes(list: CanonicalBreenCode[]): CanonicalBreenCode[] {
  return Array.from(new Set(list));
}

function shuffle<T>(list: T[]): T[] {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
