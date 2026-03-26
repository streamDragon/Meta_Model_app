import React from 'react';

import { CANONICAL_BREEN_GRID_RTL, type CanonicalBreenCode } from '../../config/canonicalBreenOrder';
import { BREEN_TABLE_CELL_MAP } from './breenTableLabData';

export type BreenBoardTone =
  | 'ghost'
  | 'prefilled'
  | 'selected'
  | 'placed'
  | 'missing'
  | 'active'
  | 'correct'
  | 'incorrect'
  | 'partial'
  | 'prompt'
  | 'heat-strong'
  | 'heat-medium'
  | 'heat-weak'
  | 'heat-neutral';

export interface BreenBoardCellState {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  tone?: BreenBoardTone;
  active?: boolean;
  dimmed?: boolean;
  disabled?: boolean;
  showDefaultTitle?: boolean;
}

interface BreenTableBoardProps {
  title?: string;
  subtitle?: string;
  variant?: 'hero' | 'mini' | 'results';
  showHeader?: boolean;
  showLegend?: boolean;
  showRowLabels?: boolean;
  cellStates?: Partial<Record<CanonicalBreenCode, BreenBoardCellState>>;
  onCellClick?: (code: CanonicalBreenCode) => void;
}

export default function BreenTableBoard({
  title = 'טבלת ברין',
  subtitle,
  variant = 'hero',
  showHeader = true,
  showLegend = true,
  showRowLabels = true,
  cellStates = {},
  onCellClick
}: BreenTableBoardProps): React.ReactElement {
  return (
    <section className="btl-board" data-variant={variant} aria-label={title}>
      {showHeader ? (
        <div className="btl-board__head">
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          {showLegend ? (
            <div className="btl-board__legend" aria-hidden="true">
              <span data-family="distortion">עיוות</span>
              <span data-family="generalization">הכללה</span>
              <span data-family="deletion">מחיקה</span>
              <span data-family="extra">עוד קטגוריות</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="btl-board__rows">
        {CANONICAL_BREEN_GRID_RTL.map((row, rowIndex) => {
          const leadCell = BREEN_TABLE_CELL_MAP[row[0]];
          return (
            <div key={`row-${rowIndex + 1}`} className="btl-board__row">
              {showRowLabels ? (
                <div className="btl-board__row-label" data-family={leadCell.family}>
                  <strong>שורה {rowIndex + 1}</strong>
                  <small>{leadCell.rowLabelHe}</small>
                </div>
              ) : null}

              <div className="btl-board__grid">
                {row.map((code) => {
                  const cell = BREEN_TABLE_CELL_MAP[code];
                  const state = cellStates[code] || {};
                  const titleNode = state.title ?? (state.showDefaultTitle !== false ? cell.heTitle : null);
                  const tone = state.tone || 'ghost';
                  const className = [
                    'btl-board__cell',
                    `is-${tone}`,
                    state.active ? 'is-active' : '',
                    state.dimmed ? 'is-dimmed' : '',
                    onCellClick ? 'is-clickable' : ''
                  ].filter(Boolean).join(' ');

                  const body = (
                    <>
                      {state.badge ? (
                        <div className="btl-board__cell-top">
                          <span className="btl-board__badge">{state.badge}</span>
                        </div>
                      ) : null}
                      <div className="btl-board__cell-main">
                        {titleNode ? <strong>{titleNode}</strong> : <span className="btl-board__placeholder">·</span>}
                        {state.subtitle ? <small>{state.subtitle}</small> : null}
                      </div>
                    </>
                  );

                  if (onCellClick) {
                    return (
                      <button
                        key={code}
                        type="button"
                        className={className}
                        data-family={cell.family}
                        onClick={() => onCellClick(code)}
                        disabled={state.disabled}
                      >
                        {body}
                      </button>
                    );
                  }

                  return (
                    <div key={code} className={className} data-family={cell.family}>
                      {body}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
