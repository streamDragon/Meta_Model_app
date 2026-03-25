import React, { useEffect, useState } from 'react';

export type ActiveStepHistoryStatus = 'completed' | 'correct' | 'incorrect';
export type ActiveStepFlowStatus = 'active' | 'upcoming' | ActiveStepHistoryStatus;

export type ActiveStepFlowStep = {
  id: string;
  title: string;
  shortLabel?: string;
  summary?: string;
  feedbackSnippet?: string;
  status: ActiveStepFlowStatus;
  expandedContent: React.ReactNode;
  collapsedContent?: React.ReactNode;
};

type ActiveStepFlowProps = {
  steps: ActiveStepFlowStep[];
  activeStepId: string;
  historyTitle?: string;
  emptyHistoryText?: string;
  activeKicker?: string;
};

const STATUS_COPY: Record<ActiveStepFlowStatus, { label: string; tone: 'active' | 'success' | 'warn' | 'muted' }> = {
  active: { label: 'פעיל עכשיו', tone: 'active' },
  upcoming: { label: 'בהמשך', tone: 'muted' },
  completed: { label: 'הושלם', tone: 'success' },
  correct: { label: 'נכון', tone: 'success' },
  incorrect: { label: 'לא מדויק', tone: 'warn' }
};

export const ACTIVE_STEP_FLOW_CSS = `
.asf-flow{display:grid;gap:12px}
.asf-progress{display:grid;gap:10px;border:1px solid #dce6f3;border-radius:20px;background:linear-gradient(180deg,#fbfdff 0%,#ffffff 100%);padding:12px 14px;box-shadow:0 14px 28px rgba(15,23,42,.05)}
.asf-progress-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.asf-progress-head strong{font-size:.94rem;color:#0f172a}
.asf-progress-head span{font-size:.8rem;color:#64748b}
.asf-rail{display:flex;flex-wrap:wrap;gap:8px}
.asf-rail-item{display:inline-flex;align-items:center;gap:8px;border-radius:999px;border:1px solid #dce6f3;background:#fff;padding:7px 11px;font-size:.8rem;font-weight:800;color:#334155}
.asf-rail-item[data-status="active"]{border-color:#bfdbfe;background:#eff6ff;color:#1d4ed8}
.asf-rail-item[data-status="completed"],.asf-rail-item[data-status="correct"]{border-color:#bbf7d0;background:#ecfdf5;color:#166534}
.asf-rail-item[data-status="incorrect"]{border-color:#fecaca;background:#fff5f5;color:#b91c1c}
.asf-rail-item[data-status="upcoming"]{background:#f8fafc;color:#64748b}
.asf-rail-count{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;border-radius:999px;background:rgba(15,23,42,.07);font-size:.74rem}
.asf-history{display:grid;gap:10px}
.asf-history-empty{border:1px dashed #dce6f3;border-radius:16px;background:#fbfdff;padding:12px;color:#64748b;font-size:.84rem}
.asf-history-strip{display:flex;flex-wrap:wrap;gap:8px}
.asf-history-chip{width:100%;text-align:right;border:1px solid #dce6f3;border-radius:18px;background:#fff;padding:10px 12px;display:grid;gap:7px;cursor:pointer;font-family:inherit;transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}
.asf-history-chip:hover{border-color:#93c5fd;transform:translateY(-1px);box-shadow:0 10px 22px rgba(15,23,42,.06)}
.asf-history-chip.is-open{border-color:#60a5fa;background:#f8fbff}
.asf-history-chip-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.asf-history-chip-title{display:grid;gap:2px}
.asf-history-chip-title strong{font-size:.88rem;color:#0f172a}
.asf-history-chip-title span{font-size:.76rem;color:#64748b}
.asf-status-pill{display:inline-flex;align-items:center;justify-content:center;min-height:24px;padding:0 10px;border-radius:999px;font-size:.73rem;font-weight:900;border:1px solid transparent;white-space:nowrap}
.asf-status-pill[data-tone="active"]{background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe}
.asf-status-pill[data-tone="success"]{background:#ecfdf5;color:#166534;border-color:#bbf7d0}
.asf-status-pill[data-tone="warn"]{background:#fff1f2;color:#be123c;border-color:#fecdd3}
.asf-status-pill[data-tone="muted"]{background:#f8fafc;color:#64748b;border-color:#dce6f3}
.asf-history-chip-copy{display:grid;gap:4px}
.asf-history-chip-copy p{margin:0;font-size:.82rem;line-height:1.45;color:#334155}
.asf-history-chip-copy small{color:#64748b;line-height:1.4}
.asf-history-preview{border:1px solid #dce6f3;border-radius:18px;background:linear-gradient(180deg,#f8fbff 0%,#ffffff 100%);padding:12px 14px;display:grid;gap:8px;box-shadow:0 14px 28px rgba(15,23,42,.05)}
.asf-history-preview-head{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}
.asf-history-preview-head strong{font-size:.9rem;color:#0f172a}
.asf-history-preview-body{color:#334155;line-height:1.6}
.asf-active{display:grid;gap:10px}
.asf-active-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap}
.asf-active-copy{display:grid;gap:4px}
.asf-active-copy span{font-size:.78rem;font-weight:900;letter-spacing:.04em;color:#1d4ed8}
.asf-active-copy strong{font-size:1rem;color:#0f172a}
@media (max-width:720px){
  .asf-progress{padding:10px 12px}
  .asf-history-chip{padding:9px 10px}
  .asf-history-chip-top,.asf-active-head,.asf-progress-head{display:grid}
  .asf-status-pill{width:max-content}
}
`;

export function ActiveStepFlow(props: ActiveStepFlowProps): React.ReactElement {
  const {
    steps,
    activeStepId,
    historyTitle = 'היסטוריה מקוצרת',
    emptyHistoryText = 'עדיין אין שלבים שהושלמו.',
    activeKicker = 'עובדים עכשיו על'
  } = props;
  const [openCompletedId, setOpenCompletedId] = useState<string | null>(null);

  const activeStep = steps.find((step) => step.id === activeStepId) || steps.find((step) => step.status === 'active') || steps[0] || null;
  const completedSteps = steps.filter((step) => step.id !== activeStep?.id && (step.status === 'completed' || step.status === 'correct' || step.status === 'incorrect'));
  const openCompletedStep = completedSteps.find((step) => step.id === openCompletedId) || null;

  useEffect(() => {
    if (!openCompletedId) return;
    if (!completedSteps.some((step) => step.id === openCompletedId)) {
      setOpenCompletedId(null);
    }
  }, [completedSteps, openCompletedId]);

  if (!activeStep) {
    return <div className="asf-flow" />;
  }

  return (
    <div className="asf-flow">
      <section className="asf-progress" aria-label="רצף העבודה">
        <div className="asf-progress-head">
          <strong>{historyTitle}</strong>
          <span>כרטיס פעיל אחד למעלה, כל מה שכבר נסגר נשאר זמין בלחיצה.</span>
        </div>

        <div className="asf-rail" aria-hidden="true">
          {steps.map((step, index) => (
            <div key={step.id} className="asf-rail-item" data-status={step.status}>
              <span className="asf-rail-count">{index + 1}</span>
              <span>{step.shortLabel || step.title}</span>
            </div>
          ))}
        </div>

        {completedSteps.length ? (
          <div className="asf-history">
            <div className="asf-history-strip">
              {completedSteps.map((step) => {
                const statusMeta = STATUS_COPY[step.status];
                const isOpen = openCompletedId === step.id;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className={`asf-history-chip${isOpen ? ' is-open' : ''}`}
                    onClick={() => setOpenCompletedId((prev) => (prev === step.id ? null : step.id))}
                    aria-expanded={isOpen}
                  >
                    <div className="asf-history-chip-top">
                      <div className="asf-history-chip-title">
                        <strong>{step.title}</strong>
                        <span>{step.shortLabel || 'שלב שהושלם'}</span>
                      </div>
                      <span className="asf-status-pill" data-tone={statusMeta.tone}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <div className="asf-history-chip-copy">
                      {step.summary ? <p>{step.summary}</p> : null}
                      {step.feedbackSnippet ? <small>{step.feedbackSnippet}</small> : null}
                    </div>
                  </button>
                );
              })}
            </div>

            {openCompletedStep ? (
              <div className="asf-history-preview" aria-live="polite">
                <div className="asf-history-preview-head">
                  <strong>{openCompletedStep.title}</strong>
                  <span className="asf-status-pill" data-tone={STATUS_COPY[openCompletedStep.status].tone}>
                    {STATUS_COPY[openCompletedStep.status].label}
                  </span>
                </div>
                <div className="asf-history-preview-body">
                  {openCompletedStep.collapsedContent || openCompletedStep.expandedContent}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="asf-history-empty">{emptyHistoryText}</div>
        )}
      </section>

      <section className="asf-active" aria-label={activeStep.title}>
        <div className="asf-active-head">
          <div className="asf-active-copy">
            <span>{activeKicker}</span>
            <strong>{activeStep.title}</strong>
          </div>
          <span className="asf-status-pill" data-tone={STATUS_COPY.active.tone}>
            {STATUS_COPY.active.label}
          </span>
        </div>
        {activeStep.expandedContent}
      </section>
    </div>
  );
}

export default ActiveStepFlow;
