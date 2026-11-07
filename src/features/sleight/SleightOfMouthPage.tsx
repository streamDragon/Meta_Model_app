import { useState } from 'react';
import {
  buildStatement,
  LANGUAGE_CASES,
  REFRAIMING_MOVES,
  type MoveId,
} from '../../data/sleightOfMouth';
import './sleight-of-mouth.css';

export function SleightOfMouthPage() {
  const [caseIndex, setCaseIndex] = useState(0);
  const [slotIndex, setSlotIndex] = useState(0);
  const [replacement, setReplacement] = useState(LANGUAGE_CASES[0].words[0].text);
  const [moveId, setMoveId] = useState<MoveId>('redefinition');
  const [draft, setDraft] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const example = LANGUAGE_CASES[caseIndex];
  const word = example.words[slotIndex];
  const move = REFRAIMING_MOVES.find((item) => item.id === moveId)!;
  const sentence = buildStatement(example, slotIndex, replacement);

  function selectCase(index: number) {
    setCaseIndex(index);
    setSlotIndex(0);
    setReplacement(LANGUAGE_CASES[index].words[0].text);
    setMoveId('redefinition');
    setDraft('');
    setShowHint(false);
    setShowExample(false);
  }

  function selectWord(index: number) {
    setSlotIndex(index);
    setReplacement(example.words[index].text);
    setShowHint(false);
    setShowExample(false);
  }

  function selectMove(nextMove: MoveId) {
    setMoveId(nextMove);
    setShowHint(false);
    setShowExample(false);
  }

  return (
    <div className="learning-page som-page" dir="rtl">
      <header className="learning-heading">
        <span className="learning-eyebrow">זריזות לשון × מעבר למילים</span>
        <h2>משפט אחד. מילה אחת. תנועה אחת.</h2>
        <p>לומדים לזהות מה במשפט יוצר את המשמעות, מזיזים רכיב אחד, ואז מנסחים תגובה טבעית. לא צריך לומר את כל 14 התבניות.</p>
      </header>

      <section className="card som-card" aria-label="בחירת מבנה לשוני">
        <div className="som-between">
          <div>
            <small className="som-kicker">שלוש דוגמאות בעברית</small>
            <h3>1. בחר מבנה</h3>
          </div>
          <span className="som-count">{caseIndex + 1} / {LANGUAGE_CASES.length}</span>
        </div>
        <div className="som-case-tabs">
          {LANGUAGE_CASES.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={'som-case-tab' + (caseIndex === index ? ' selected' : '')}
              aria-pressed={caseIndex === index}
              onClick={() => selectCase(index)}
            >
              {item.title}
            </button>
          ))}
        </div>
        <p className="learning-muted som-context">{example.situation}</p>
      </section>

      <section className="card som-card">
        <div className="som-between">
          <div>
            <small className="som-kicker">מעבר למילים</small>
            <h3>2. לחץ על מילה או רכיב</h3>
          </div>
          <button className="som-text-button" type="button" onClick={() => setShowMap((value) => !value)}>
            {showMap ? 'הסתר מפה' : 'הצג מפה'}
          </button>
        </div>
        <p className="som-instruction">מה בדיוק במילים הופך אירוע למסקנה?</p>
        <p className="som-statement" data-testid="som-statement">
          <span aria-hidden="true">״</span>
          {example.words.map((part, index) => (
            <button
              type="button"
              key={index}
              className={'som-token' + (slotIndex === index ? ' selected' : '')}
              aria-label={'בחר רכיב: ' + part.text}
              aria-pressed={slotIndex === index}
              onClick={() => selectWord(index)}
            >
              {slotIndex === index ? replacement : part.text}
            </button>
          ))}
          <span aria-hidden="true">.״</span>
        </p>

        <div className="som-inspector">
          <span className="som-kicker">{word.role}</span>
          <p>{word.explanation}</p>
          <div className="som-choices" aria-label="החלפת הרכיב">
            {word.choices.map((choice) => (
              <button
                type="button"
                key={choice}
                className={'som-choice' + (replacement === choice ? ' selected' : '')}
                aria-pressed={replacement === choice}
                onClick={() => setReplacement(choice)}
              >
                {choice}
              </button>
            ))}
          </div>
          <p className="som-meta"><strong>בירור במטה־מודל:</strong> {word.metaQuestion}</p>
          {replacement !== word.text && <p className="som-result" role="status">הניסוח השתנה: {sentence}</p>}
        </div>

        {showMap && (
          <div className="som-map" role="group" aria-label="מפת הקשר והמשמעות">
            <div className="som-map-node"><small>אירוע</small><strong>{example.event}</strong></div>
            <span aria-hidden="true" className="som-map-arrow">←</span>
            <div className="som-map-node som-map-link"><small>הקשר שנבנה</small><strong>{example.relationship}</strong></div>
            <span aria-hidden="true" className="som-map-arrow">←</span>
            <div className="som-map-node"><small>מסקנה</small><strong>{example.conclusion}</strong></div>
          </div>
        )}
      </section>

      <section className="card som-card">
        <small className="som-kicker">זריזות לשון · מתוך 14 התבניות</small>
        <h3>3. בחר תנועה אחת</h3>
        <div className="som-moves" role="group" aria-label="בחירת תבנית זריזות לשון">
          {REFRAIMING_MOVES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={'som-move' + (moveId === item.id ? ' selected' : '')}
              aria-pressed={moveId === item.id}
              onClick={() => selectMove(item.id)}
            >
              <strong>{item.label}</strong>
              <small>{item.cue}</small>
            </button>
          ))}
        </div>
        <p className="som-chosen-move">בחרת: <strong>{move.label}</strong> · {move.family}</p>

        <label htmlFor="som-my-answer" className="som-answer-label">מה היית אומר בשיחה?</label>
        <textarea
          id="som-my-answer"
          rows={3}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="כתוב תגובה קצרה וטבעית משלך…"
        />

        <div className="learning-actions som-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setShowHint((value) => !value)}>
            {showHint ? 'הסתר רמז' : 'רמז'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowExample((value) => !value)}>
            {showExample ? 'הסתר דוגמה' : 'השווה דוגמה'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => selectCase((caseIndex + 1) % LANGUAGE_CASES.length)}>
            לדוגמה הבאה
          </button>
        </div>

        {showHint && (
          <p className="som-hint" role="status">
            לפני המענה, אפשר לברר: {example.firstQuestion} אחר כך נסה {move.cue}
          </p>
        )}
        {showExample && (
          <div className="som-example" aria-live="polite">
            <strong>דוגמה אפשרית, לא תשובת חובה:</strong>
            <p>{example.examples[moveId]}</p>
            <small>בדוק: האם נשמרת עובדה חשובה? האם הצעת אפשרות במקום לקבוע? איך תגיב אם האדם לא מסכים?</small>
          </div>
        )}
        <p className="learning-muted som-caution">{example.caution}</p>
      </section>

      <p className="learning-muted som-footnote">
        גרסת תרגול ראשונית ללא מנוע AI: שלושה מבנים, שלוש תנועות והשוואה עצמית.
        הניסוח שלך נשאר במסך הזה ולא נשלח לשרת. זהו תרגול שפה ושיחה, לא אבחון או טיפול.
      </p>
    </div>
  );
}
