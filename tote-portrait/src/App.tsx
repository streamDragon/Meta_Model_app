import { DndContext, type DragEndEvent, type DragStartEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import './App.css';
import { questions } from './data/questions';
import { slotById, slots } from './data/slots';
import { buildStateNormalizationSuggestions, defaultNormalizedVerb, extractPredicate } from './lib/predicate';
import { inferTagsAndConfidence, isUnknownAnswer } from './lib/tagging';
import {
  buildSlotsRecord,
  buildToteMapExport,
  computeSlotFit,
  generateKnifePrompts,
  loopArrowState,
  suggestOpeningQuestions,
} from './lib/tote';
import type { AnswerBlock, PredicateType, Question, Slot, Utterance } from './types';

type PendingSuggestion = {
  blockId: string;
  droppedSlotId: number;
  suggestedSlotId: number;
};

const INITIAL_UTTERANCE = 'אני מרגיש תקוע כשאני צריך להתחיל לכתוב הצעה ללקוח.';

const SLOT_POSITIONS: Record<number, { top: string; left: string }> = {
  1: { top: '8%', left: '12%' },
  2: { top: '3%', left: '42%' },
  3: { top: '15%', left: '74%' },
  4: { top: '43%', left: '82%' },
  5: { top: '71%', left: '74%' },
  6: { top: '84%', left: '42%' },
  7: { top: '71%', left: '12%' },
  8: { top: '43%', left: '4%' },
  9: { top: '25%', left: '42%' },
};

const QUESTION_MAP = new Map(questions.map((question) => [question.id, question]));

const makeId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const initializeUtterance = (text: string): Utterance => {
  const extracted = extractPredicate(text);
  return {
    id: makeId(),
    text,
    predicate: extracted.predicate,
    predicateType: extracted.predicateType,
    normalizedVerb: defaultNormalizedVerb(extracted.predicateType, text, extracted.predicate),
  };
};

const renderHighlightedUtterance = (text: string, predicate: string): ReactElement => {
  const marker = predicate.trim();
  if (!marker) {
    return <span>{text}</span>;
  }
  const index = text.indexOf(marker);
  if (index < 0) {
    return <span>{text}</span>;
  }
  const before = text.slice(0, index);
  const after = text.slice(index + marker.length);
  return (
    <span>
      {before}
      <mark>{marker}</mark>
      {after}
    </span>
  );
};

type DraggableCardProps = {
  block: AnswerBlock;
  sourceQuestion?: Question;
  onDuplicate: (blockId: string) => void;
};

function DraggableCard({ block, sourceQuestion, onDuplicate }: DraggableCardProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: block.id });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`answer-card ${block.slotIds.length >= 2 ? 'answer-card--dual' : ''} ${isDragging ? 'answer-card--dragging' : ''}`}
    >
      <div className="answer-card__drag" {...attributes} {...listeners} aria-label="גרור כרטיס">
        ⠿
      </div>
      <div className="answer-card__body">
        <p className="answer-card__text">{block.text}</p>
        <p className="answer-card__meta">
          Confidence: <strong>{block.confidence}%</strong>
          {sourceQuestion ? <> · Q: {sourceQuestion.id}</> : null}
        </p>
        <div className="answer-card__tags">
          {block.tags.length > 0 ? block.tags.map((tag) => <span key={`${block.id}-${tag}`}>{tag}</span>) : <span>ללא תגיות</span>}
        </div>
        <div className="answer-card__actions">
          <button type="button" onClick={() => onDuplicate(block.id)}>
            שכפל
          </button>
          <small>{block.slotIds.length > 0 ? `ממוקם בסלוטים: ${block.slotIds.join(', ')}` : 'עדיין לא שובץ במפה'}</small>
        </div>
      </div>
    </article>
  );
}

type SlotNodeProps = {
  slot: Slot;
  activeBlock: AnswerBlock | null;
  placedBlocks: AnswerBlock[];
  onRemovePlacement: (blockId: string, slotId: number) => void;
};

function SlotNode({ slot, activeBlock, placedBlocks, onRemovePlacement }: SlotNodeProps): ReactElement {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${slot.id}`,
  });

  const sourceQuestion = activeBlock?.sourceQuestionId ? QUESTION_MAP.get(activeBlock.sourceQuestionId) : undefined;
  const fitData = activeBlock ? computeSlotFit(activeBlock, slot, sourceQuestion) : undefined;

  return (
    <section
      ref={setNodeRef}
      className={`slot-node ${isOver ? 'slot-node--over' : ''}`}
      style={{ top: SLOT_POSITIONS[slot.id].top, left: SLOT_POSITIONS[slot.id].left, borderColor: slot.color }}
    >
      <header>
        <span className="slot-icon">{slot.icon}</span>
        <div>
          <h4>{slot.name}</h4>
          <small>{slot.description}</small>
        </div>
      </header>
      {fitData ? (
        <p className={`fit-label ${fitData.suggested ? 'fit-label--good' : ''}`}>התאמה: {fitData.fit}%</p>
      ) : (
        <p className="fit-label">Drop כאן</p>
      )}
      <div className="slot-placed-list">
        {placedBlocks.map((block) => (
          <div key={`${slot.id}-${block.id}`} className="slot-pill">
            <span>{block.text}</span>
            <button type="button" onClick={() => onRemovePlacement(block.id, slot.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

function App(): ReactElement {
  const [utterance, setUtterance] = useState<Utterance>(() => initializeUtterance(INITIAL_UTTERANCE));
  const [stateVerbSuggestions, setStateVerbSuggestions] = useState<string[]>(() =>
    buildStateNormalizationSuggestions(INITIAL_UTTERANCE, extractPredicate(INITIAL_UTTERANCE).predicate),
  );
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>('');
  const [activeQuestionId, setActiveQuestionId] = useState<string>('');
  const [answerDraft, setAnswerDraft] = useState<string>('');
  const [answerBlocks, setAnswerBlocks] = useState<AnswerBlock[]>([]);
  const [usedQuestionIds, setUsedQuestionIds] = useState<string[]>([]);
  const [questionsAsked, setQuestionsAsked] = useState<number>(0);
  const [consecutiveUnknown, setConsecutiveUnknown] = useState<number>(0);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [openingSuggestionText, setOpeningSuggestionText] = useState<string>('');
  const [openingSuggestionList, setOpeningSuggestionList] = useState<Question[]>([]);
  const [knifePrompts, setKnifePrompts] = useState<string[]>([]);
  const [pendingSuggestion, setPendingSuggestion] = useState<PendingSuggestion | null>(null);
  const [simulateCyclesLeft, setSimulateCyclesLeft] = useState<number>(0);

  const filteredQuestions = useMemo(
    () => questions.filter((question) => question.predicateTypes.includes(utterance.predicateType)),
    [utterance.predicateType],
  );

  const slotsRecord = useMemo(() => buildSlotsRecord(answerBlocks), [answerBlocks]);
  const arrowState = useMemo(() => loopArrowState(slotsRecord), [slotsRecord]);
  const isStuck = consecutiveUnknown >= 2 || (questionsAsked >= 2 && answerBlocks.length === 0);
  const stuckSuggestion = useMemo(
    () => (isStuck ? suggestOpeningQuestions(utterance.predicateType, slotsRecord, questions, usedQuestionIds, true) : null),
    [isStuck, slotsRecord, usedQuestionIds, utterance.predicateType],
  );
  const activeBlock = useMemo(
    () => (activeDragId ? answerBlocks.find((block) => block.id === activeDragId) ?? null : null),
    [activeDragId, answerBlocks],
  );

  useEffect(() => {
    if (simulateCyclesLeft <= 0) {
      return undefined;
    }
    const timerId = window.setTimeout(() => {
      setSimulateCyclesLeft((current) => current - 1);
    }, 700);
    return () => window.clearTimeout(timerId);
  }, [simulateCyclesLeft]);

  const analyzeUtterance = (): void => {
    const extracted = extractPredicate(utterance.text);
    const suggestions = buildStateNormalizationSuggestions(utterance.text, extracted.predicate);
    setStateVerbSuggestions(suggestions);
    setUtterance((current) => ({
      ...current,
      predicate: extracted.predicate,
      predicateType: extracted.predicateType,
      normalizedVerb: defaultNormalizedVerb(extracted.predicateType, current.text, extracted.predicate),
    }));
    setStatusMessage('בוצע ניתוח predicate מחדש.');
  };

  const updatePredicateType = (predicateType: PredicateType): void => {
    const suggestions = buildStateNormalizationSuggestions(utterance.text, utterance.predicate);
    setStateVerbSuggestions(suggestions);
    setUtterance((current) => ({
      ...current,
      predicateType,
      normalizedVerb: defaultNormalizedVerb(predicateType, current.text, current.predicate),
    }));
  };

  const askSelectedQuestion = (): void => {
    if (!selectedQuestionId) {
      setStatusMessage('בחר שאלה מהבנק ואז לחץ Ask.');
      return;
    }
    setActiveQuestionId(selectedQuestionId);
    setQuestionsAsked((count) => count + 1);
    setStatusMessage('');
  };

  const submitAnswer = (): void => {
    const question = QUESTION_MAP.get(activeQuestionId);
    if (!question) {
      setStatusMessage('בחר שאלה פעילה לפני יצירת בלוק.');
      return;
    }
    if (!answerDraft.trim()) {
      setStatusMessage('כתוב תשובה לפני יצירת AnswerBlock.');
      return;
    }

    const result = inferTagsAndConfidence(answerDraft, question.suggestedSlotId);
    const block: AnswerBlock = {
      id: makeId(),
      text: answerDraft.trim(),
      sourceQuestionId: question.id,
      tags: result.tags,
      confidence: result.confidence,
      slotIds: [],
      suggestedSlotId: result.suggestedSlotId,
    };

    setAnswerBlocks((current) => [block, ...current]);
    setUsedQuestionIds((current) => (current.includes(question.id) ? current : [...current, question.id]));
    setConsecutiveUnknown((current) => (isUnknownAnswer(answerDraft) ? current + 1 : 0));
    setActiveQuestionId('');
    setAnswerDraft('');
    setStatusMessage('נוצר AnswerBlock חדש. גרור אותו לסלוט המתאים במפה.');
  };

  const duplicateBlock = (blockId: string): void => {
    const source = answerBlocks.find((block) => block.id === blockId);
    if (!source) {
      return;
    }
    const duplicate: AnswerBlock = {
      ...source,
      id: makeId(),
      duplicateOf: source.duplicateOf ?? source.id,
      slotIds: [],
      slotId: undefined,
    };
    setAnswerBlocks((current) => [duplicate, ...current]);
  };

  const removePlacement = (blockId: string, slotId: number): void => {
    setAnswerBlocks((current) =>
      current.map((block) => {
        if (block.id !== blockId) {
          return block;
        }
        const nextSlotIds = block.slotIds.filter((id) => id !== slotId);
        return {
          ...block,
          slotIds: nextSlotIds,
          slotId: nextSlotIds[0],
        };
      }),
    );
  };

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveDragId(null);
    const overId = event.over?.id;
    if (!overId) {
      return;
    }

    const blockId = String(event.active.id);
    const slotId = Number(String(overId).replace('slot-', ''));
    if (!slotId || Number.isNaN(slotId)) {
      return;
    }

    const draggedBlock = answerBlocks.find((block) => block.id === blockId);
    if (!draggedBlock) {
      return;
    }
    if (draggedBlock.slotIds.includes(slotId)) {
      return;
    }
    if (draggedBlock.slotIds.length >= 2) {
      setStatusMessage('לבלוק הזה כבר יש 2 מיקומים. שכפל אותו אם צריך עוד מיקום.');
      return;
    }

    setAnswerBlocks((current) =>
      current.map((block) => {
        if (block.id !== blockId) {
          return block;
        }
        const nextSlotIds = [...block.slotIds, slotId];
        return {
          ...block,
          slotIds: nextSlotIds,
          slotId: nextSlotIds[0],
        };
      }),
    );

    if (draggedBlock.suggestedSlotId && draggedBlock.suggestedSlotId !== slotId) {
      const suggestedSlot = slotById(draggedBlock.suggestedSlotId);
      setPendingSuggestion({
        blockId,
        droppedSlotId: slotId,
        suggestedSlotId: draggedBlock.suggestedSlotId,
      });
      setStatusMessage(`נראה שזה מתאים יותר ל-${suggestedSlot?.name ?? `סלוט ${draggedBlock.suggestedSlotId}`}. להשאיר כאן או להעביר?`);
    } else {
      setPendingSuggestion(null);
      setStatusMessage('שיבוץ בוצע.');
    }
  };

  const keepCurrentPlacement = (): void => {
    setPendingSuggestion(null);
  };

  const movePlacementToSuggested = (): void => {
    if (!pendingSuggestion) {
      return;
    }

    setAnswerBlocks((current) =>
      current.map((block) => {
        if (block.id !== pendingSuggestion.blockId) {
          return block;
        }
        const withoutDropped = block.slotIds.filter((id) => id !== pendingSuggestion.droppedSlotId);
        if (withoutDropped.includes(pendingSuggestion.suggestedSlotId)) {
          return { ...block, slotIds: withoutDropped, slotId: withoutDropped[0] };
        }
        const nextSlotIds = [...withoutDropped, pendingSuggestion.suggestedSlotId];
        return {
          ...block,
          slotIds: nextSlotIds,
          slotId: nextSlotIds[0],
        };
      }),
    );
    setPendingSuggestion(null);
    setStatusMessage('הבלוק הועבר לסלוט המוצע.');
  };

  const handleOpeningBox = (): void => {
    const suggestion = suggestOpeningQuestions(utterance.predicateType, slotsRecord, questions, usedQuestionIds, isStuck);
    setOpeningSuggestionText(suggestion.title);
    setOpeningSuggestionList(suggestion.questions);
    if (suggestion.questions[0]) {
      setSelectedQuestionId(suggestion.questions[0].id);
    }
  };

  const handleKnife = (): void => {
    setKnifePrompts(generateKnifePrompts(slotsRecord));
  };

  const handleSimulate = (): void => {
    if (arrowState === 'idle') {
      setStatusMessage('אין עדיין Loop פעיל לסימולציה. מלא סלוט 7/8.');
      return;
    }
    setSimulateCyclesLeft(3);
  };

  const exportJson = (): void => {
    const payload = buildToteMapExport(utterance, slotsRecord, arrowState, simulateCyclesLeft);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'toteMap.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="app">
      <header className="top-bar">
        <h1>TOTE Portrait MVP</h1>
        <div className="utterance-controls">
          <label>
            Utterance
            <textarea
              value={utterance.text}
              onChange={(event) => setUtterance((current) => ({ ...current, text: event.target.value }))}
              rows={3}
            />
          </label>
          <button type="button" onClick={analyzeUtterance}>
            Analyze
          </button>
        </div>
        <div className="utterance-highlight">{renderHighlightedUtterance(utterance.text, utterance.predicate)}</div>
        <div className="predicate-row">
          <label>
            Predicate
            <input
              value={utterance.predicate}
              onChange={(event) => setUtterance((current) => ({ ...current, predicate: event.target.value }))}
            />
          </label>
          <label>
            PredicateType
            <select value={utterance.predicateType} onChange={(event) => updatePredicateType(event.target.value as PredicateType)}>
              <option value="Action">Action</option>
              <option value="Process">Process</option>
              <option value="State">State</option>
            </select>
          </label>
          <span className={`type-badge type-badge--${utterance.predicateType.toLowerCase()}`}>{utterance.predicateType}</span>
          <label className="normalized-field">
            Normalized Verb
            <input
              value={utterance.normalizedVerb}
              onChange={(event) => setUtterance((current) => ({ ...current, normalizedVerb: event.target.value }))}
            />
          </label>
        </div>

        {utterance.predicateType === 'State' ? (
          <section className="state-panel">
            <h3>State → Hidden Verb</h3>
            <div className="chips">
              {stateVerbSuggestions.map((suggestion) => (
                <button key={suggestion} type="button" onClick={() => setUtterance((current) => ({ ...current, normalizedVerb: suggestion }))}>
                  {suggestion}
                </button>
              ))}
            </div>
          </section>
        ) : null}
      </header>

      <div className="workspace">
        <section className="map-section">
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="ellipse-map">
              <svg className="ellipse-map__svg" viewBox="0 0 1000 680" aria-hidden="true">
                <ellipse cx="500" cy="340" rx="390" ry="250" fill="none" stroke="#b8c5dc" strokeWidth="4" />
                {(arrowState === 'redPulse' || arrowState === 'greenPulse') && (
                  <>
                    {arrowState === 'redPulse' ? (
                      <path
                        d="M250 430 C 420 530, 600 530, 760 220"
                        className={`loop-arrow loop-arrow--red ${simulateCyclesLeft > 0 ? 'loop-arrow--simulate' : ''}`}
                      />
                    ) : null}
                    {arrowState === 'greenPulse' ? (
                      <path
                        d="M500 340 C 460 210, 520 160, 500 120"
                        className={`loop-arrow loop-arrow--green ${simulateCyclesLeft > 0 ? 'loop-arrow--simulate' : ''}`}
                      />
                    ) : null}
                  </>
                )}
              </svg>

              <div className="center-circle">
                <p>Predicate: {utterance.predicate}</p>
                <p>Type: {utterance.predicateType}</p>
                <p>Normalized: {utterance.normalizedVerb}</p>
              </div>

              {slots.map((slot) => (
                <SlotNode
                  key={slot.id}
                  slot={slot}
                  activeBlock={activeBlock}
                  placedBlocks={slotsRecord[slot.id] ?? []}
                  onRemovePlacement={removePlacement}
                />
              ))}
            </div>

            <section className="cards-panel">
              <h3>Answer Blocks</h3>
              <p>גרור כרטיסים מהאזור הזה לתוך הסלוטים במפה.</p>
              <div className="cards-grid">
                {answerBlocks.map((block) => (
                  <DraggableCard
                    key={block.id}
                    block={block}
                    sourceQuestion={block.sourceQuestionId ? QUESTION_MAP.get(block.sourceQuestionId) : undefined}
                    onDuplicate={duplicateBlock}
                  />
                ))}
              </div>
            </section>
          </DndContext>
        </section>

        <aside className="right-panel">
          <h2>Question Bank</h2>
          <ul className="question-list">
            {filteredQuestions.map((question) => (
              <li key={question.id}>
                <button
                  type="button"
                  className={selectedQuestionId === question.id ? 'question-item question-item--selected' : 'question-item'}
                  onClick={() => setSelectedQuestionId(question.id)}
                >
                  <span>{question.text}</span>
                  <small>Slot {question.suggestedSlotId}</small>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="ask-btn" onClick={askSelectedQuestion}>
            Ask
          </button>

          {activeQuestionId ? (
            <section className="answer-composer">
              <h3>Draft Answer</h3>
              <p>{QUESTION_MAP.get(activeQuestionId)?.text}</p>
              <textarea value={answerDraft} onChange={(event) => setAnswerDraft(event.target.value)} rows={4} />
              <button type="button" onClick={submitAnswer}>
                Create AnswerBlock
              </button>
            </section>
          ) : null}

          {isStuck ? (
            <section className="wizard-hint">
              <h3>בוא נתחיל מאירוע אחד ספציפי</h3>
              <p>זוהתה תקיעות (2 תשובות "לא יודע" או חוסר בלוקים אחרי 2 שאלות).</p>
              <ul>
                {(stuckSuggestion?.questions ?? []).map((question) => (
                  <li key={`stuck-${question.id}`}>{question.text}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>

      {pendingSuggestion ? (
        <section className="soft-hint">
          <p>
            נראה שזה מתאים יותר ל-{slotById(pendingSuggestion.suggestedSlotId)?.name}. להשאיר כאן או להעביר?
          </p>
          <div>
            <button type="button" onClick={keepCurrentPlacement}>
              להשאיר כאן
            </button>
            <button type="button" onClick={movePlacementToSuggested}>
              להעביר להצעה
            </button>
          </div>
        </section>
      ) : null}

      <footer className="bottom-actions">
        <button type="button" onClick={handleOpeningBox}>
          פתח עוד
        </button>
        <button type="button" onClick={handleKnife}>
          חתוך דבק
        </button>
        <button type="button" onClick={handleSimulate}>
          Simulate (3 cycles)
        </button>
        <button type="button" onClick={exportJson}>
          Export JSON
        </button>
      </footer>

      <section className="output-panel">
        {openingSuggestionText ? (
          <div className="output-card">
            <h3>{openingSuggestionText}</h3>
            <ul>
              {openingSuggestionList.map((question) => (
                <li key={`open-${question.id}`}>{question.text}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {knifePrompts.length > 0 ? (
          <div className="output-card">
            <h3>Knife Prompts</h3>
            <ol>
              {knifePrompts.map((prompt) => (
                <li key={prompt}>{prompt}</li>
              ))}
            </ol>
          </div>
        ) : null}

        {statusMessage ? <p className="status-message">{statusMessage}</p> : null}
      </section>
    </main>
  );
}

export default App;
