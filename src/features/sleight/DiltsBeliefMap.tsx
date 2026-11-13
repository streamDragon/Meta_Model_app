import { useState } from 'react';
import {
  DIALOGUE_MOVES,
  type DialogueMove,
  type MoveId,
  type MoveSystem,
} from '../../data/sleightConversation';
import './DiltsBeliefMap.css';

type Certainties = Partial<Record<MoveId, number>>;

interface BeliefDiagramProps {
  belief: string | null;
  conviction: number;
  used: readonly MoveId[];
  certainties: Certainties;
  caseIndex: number;
  selectedId?: MoveId | null;
  onChoose?: (move: DialogueMove) => void;
}

const diltsRows: readonly (readonly (MoveId | null)[])[] = [
  ['intention', 'redefine', 'counterexample'],
  ['criteria-hierarchy', 'consequence', 'frame-size'],
  ['another-outcome', 'chunk-down', 'analogy'],
  ['reality-strategy', 'chunk-up', 'model-world'],
  ['meta-frame', null, 'apply-to-self'],
];

const mindLinesRows: readonly (readonly (MoveId | null)[])[] = [
  ['mind-pre', 'mind-re', 'mind-counter'],
  ['mind-out', 'mind-deframe', 'mind-analogy'],
  [null, 'mind-post', null],
];

/**
 * The strength of PURPLE always represents reported confidence in the
 * original belief (0-10), never whether a move has been clicked or unlocked.
 */
export function certaintyColor(value: number): { fill: string; stroke: string; text: string } {
  const n = Math.min(10, Math.max(0, value));
  return {
    fill: `hsl(256 75% ${Math.round((97 - n * 5.3) * 10) / 10}%)`,
    stroke: `hsl(254 46% ${Math.round((76 - n * 3.7) * 10) / 10}%)`,
    text: n >= 7 ? '#ffffff' : '#272642',
  };
}

export function BeliefDiagram({
  belief, conviction, used, certainties, caseIndex, selectedId = null, onChoose,
}: BeliefDiagramProps) {
  const [system, setSystem] = useState<MoveSystem>('dilts');
  const [detailId, setDetailId] = useState<MoveId | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const rows = system === 'dilts' ? diltsRows : mindLinesRows;
  const detail = DIALOGUE_MOVES.find((move) => move.id === detailId);
  const beliefColor = certaintyColor(conviction);

  function handleSelect(move: DialogueMove) {
    setDetailId(move.id);
  }

  return (
    <div className="som-dilts-diagram" dir="rtl">
      <div className="som-diagram-toolbar">
        <div className="som-diagram-title"><strong>מפת זריזות לשון</strong><small>תרשים מהלכים בסגנון המפה המקורית של דילטס</small></div>
        <span className="som-diagram-counter">נוסו {used.length} מתוך 21</span>
      </div>

      <div className="som-diagram-key" aria-label="מקרא רמות ודאות">
        <span className="som-key-label">עוצמת הצבע = ודאות באמונה:</span>
        <span className="som-key-item"><i style={{ background: certaintyColor(2).fill }} /> נמוכה</span>
        <span className="som-key-item"><i style={{ background: certaintyColor(5).fill }} /> בינונית</span>
        <span className="som-key-item"><i style={{ background: certaintyColor(9).fill }} /> גבוהה</span>
        <span className="som-key-item"><i className="som-key-unmeasured" /> לא נמדדה</span>
      </div>

      <div className="som-diagram-switch" role="group" aria-label="בחירת שכבת התבניות">
        <button type="button" className={system === 'dilts' ? 'active' : ''} aria-pressed={system === 'dilts'} onClick={() => {setSystem('dilts');setDetailId(null);}}>14 התבניות של דילטס</button>
        <button type="button" className={system === 'mindlines' ? 'active' : ''} aria-pressed={system === 'mindlines'} onClick={() => {setSystem('mindlines');setDetailId(null);}}>7 כיווני Mind-Lines</button>
      </div>

      <div className="som-diagram-zoom-controls"><span>בנייד אפשר להגדיל ולגלול את התרשים.</span><button type="button" aria-pressed={zoomed} onClick={() => setZoomed(!zoomed)}>{zoomed ? 'מבט כללי' : 'תקריב וגלילה'}</button></div>
      <div className={'som-diagram-paper' + (zoomed ? ' som-diagram-zoomed' : '')}>
        <div className="som-diagram-canvas">
        <div className="som-diagram-head">
          <div className="som-diagram-tag">אמונה לבדיקה</div>
          <div
            className="som-diagram-belief"
            style={{
              background: belief ? beliefColor.fill : '#fff',
              borderColor: belief ? beliefColor.stroke : '#313245',
              color: belief ? beliefColor.text : '#272642',
            }}
          >
            <small>האמונה המרכזית</small>
            <strong>{belief ? `״${belief}״` : 'האמונה תופיע כאן לאחר שאלות הבירור'}</strong>
            <span>מידת ודאות: {conviction} מתוך 10</span>
          </div>
        </div>

        <svg className="som-diagram-connectors" viewBox="0 0 600 34" preserveAspectRatio="none" aria-hidden="true">
          <path d="M300 1 V16 M100 30 V21 H500 V30 M300 16 V30" fill="none" stroke="#27283e" strokeWidth="2.3" />
          <path d="m94 25 6 6 6-6 M294 25 6 6 6-6 M494 25 6 6 6-6" fill="none" stroke="#27283e" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        {rows.map((row, rowIndex) => (
          <div className="som-diagram-level" key={rowIndex}>
            <div className="som-diagram-row">
              {row.map((id, column) => {
                const move = id ? DIALOGUE_MOVES.find((item) => item.id === id) : null;
                if (!move) return <div key={column} className="som-diagram-empty" aria-hidden="true" />;
                const certainty = certainties[move.id];
                const isMeasured = certainty !== undefined;
                const valueColor = isMeasured ? certaintyColor(certainty) : null;
                const isCurrent = selectedId === move.id;
                const isInFocus = detailId === move.id;
                const isPreviouslyTried = used.includes(move.id);
                const title = move.id === 'consequence' ? 'תוצאה והשלכות' : move.title;
                return (
                  <button
                    type="button"
                    key={move.id}
                    className={[
                      'som-diagram-node',
                      move.id === 'consequence' ? 'som-node-diamond' : '',
                      move.id === 'criteria-hierarchy' || move.id === 'meta-frame' ? 'som-node-ribbon' : '',
                      isCurrent || isInFocus ? 'focused' : '',
                    ].filter(Boolean).join(' ')}
                    style={{
                      background: valueColor?.fill || '#fffefc',
                      borderColor: valueColor?.stroke || '#363a4d',
                      color: valueColor?.text || '#28283a',
                    }}
                    data-testid={'map-node-' + move.id}
                    data-certainty={isMeasured ? String(certainty) : 'unmeasured'}
                    aria-pressed={isInFocus}
                    aria-label={title + '. ' + move.direction + '. ' + (isMeasured ? `ודאות אחרי המהלך ${certainty} מתוך 10` : 'הוודאות אחרי המהלך טרם נמדדה')}
                    onClick={() => handleSelect(move)}
                  >
                    <strong>{title}</strong>
                    <span className="som-node-prompt">{move.direction}</span>
                    <span className="som-node-certainty">
                      {isMeasured ? `ודאות ${certainty}/10` : isPreviouslyTried ? 'בוצע · ממתין לקליברציה' : 'מהלך אפשרי'}
                    </span>
                  </button>
                );
              })}
            </div>
            {rowIndex < rows.length - 1 && (
              <svg className="som-diagram-connectors som-between-rows" viewBox="0 0 600 31" preserveAspectRatio="none" aria-hidden="true">
                <path d="M100 0 V27 M300 0 V27 M500 0 V27 M100 15 H500" fill="none" stroke="#454351" strokeWidth="1.65" opacity=".9" />
                <path d="m95 22 5 6 5-6 M295 22 5 6 5-6 M495 22 5 6 5-6" stroke="#454351" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}

        <div className="som-diagram-bottom">
          <span aria-hidden="true">↓</span>
          <strong>איך הוא יכול לחשוב אחרת?</strong>
          <small>בוחרים מהלך, בודקים את תגובת האדם וחוזרים לאמונה.</small>
        </div>
        </div>
      </div>

      {detail && (
        <div className="som-diagram-detail" role="region" aria-label="פרטי המהלך שנבחר">
          <div>
            <small>{detail.system === 'dilts' ? 'תבנית דילטס' : 'כיוון Mind-Lines'}</small>
            <h3>{detail.title}</h3>
            <p>{detail.sample[caseIndex]}</p>
            <span>
              {certainties[detail.id] !== undefined
                ? `רמת הוודאות שנמדדה לאחר המהלך: ${certainties[detail.id]}/10`
                : 'אין עדיין מדידת ודאות לאחר המהלך הזה'}
            </span>
          </div>
          {onChoose && <button className="btn btn-primary" type="button" onClick={() => onChoose(detail)}>בחר את המהלך לשיחה</button>}
          <button className="som-diagram-dismiss" type="button" aria-label="סגור פרטי מהלך" onClick={() => setDetailId(null)}>×</button>
        </div>
      )}
      <p className="som-diagram-explainer">
        כל התבניות מוצגות מראש. עוצמת הסגול נקבעת רק לפי מידת הוודאות המדווחת, ולא לפי מספר התבניות שנוסו.
        תבנית ללא מדידה נשארת לבנה. הערכים הם נתוני הסימולציה, לא מדידה של אדם אמיתי.
      </p>
    </div>
  );
}
