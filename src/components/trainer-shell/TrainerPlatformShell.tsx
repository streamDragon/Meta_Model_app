import React from 'react';

export interface TrainerHelperStep {
  title: string;
  description: string;
}

interface TrainerPlatformShellProps {
  title: string;
  subtitle: string;
  modePill?: React.ReactNode;
  headerActions?: React.ReactNode;
  purposeKicker: string;
  purposeTitle: string;
  purposeBody: React.ReactNode;
  purposeTags?: React.ReactNode;
  startKicker: string;
  startTitle: string;
  startBody: React.ReactNode;
  startActions: React.ReactNode;
  startMeta?: React.ReactNode;
  helperSteps?: TrainerHelperStep[];
  main: React.ReactNode;
  support: React.ReactNode;
}

export function TrainerPlatformShell({
  title,
  subtitle,
  modePill,
  headerActions,
  purposeKicker,
  purposeTitle,
  purposeBody,
  purposeTags,
  startKicker,
  startTitle,
  startBody,
  startActions,
  startMeta,
  helperSteps = [],
  main,
  support,
}: TrainerPlatformShellProps): React.ReactElement {
  return (
    <div className="trp-page" dir="rtl" lang="he">
      <div className="trp-shell">
        <header className="trp-card trp-top">
          <div className="trp-title-wrap">
            <span className="trp-kicker">Trainer Shell</span>
            <h1 className="trp-title">{title}</h1>
            <p className="trp-subtitle">{subtitle}</p>
          </div>
          <div className="trp-actions">
            {modePill}
            {headerActions}
          </div>
        </header>

        <section className="trp-hero">
          <article className="trp-card trp-purpose">
            <span className="trp-kicker">{purposeKicker}</span>
            <h2 className="trp-title" style={{ fontSize: '1.08rem' }}>{purposeTitle}</h2>
            <div className="trp-purpose-body">{purposeBody}</div>
            {purposeTags ? <div className="trp-chip-row">{purposeTags}</div> : null}
          </article>

          <aside className="trp-start-strip">
            <div className="trp-start-copy">
              <span className="trp-kicker">{startKicker}</span>
              <h2 className="trp-title" style={{ fontSize: '1.04rem' }}>{startTitle}</h2>
              <div className="trp-subtitle">{startBody}</div>
            </div>
            <div className="trp-start-actions">{startActions}</div>
            {startMeta ? <div className="trp-chip-row">{startMeta}</div> : null}
          </aside>
        </section>

        {helperSteps.length ? (
          <div className="trp-step-strip">
            {helperSteps.map((step) => (
              <div key={step.title} className="trp-step">
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="trp-layout">
          <main className="trp-main">{main}</main>
          <aside className="trp-support">{support}</aside>
        </div>
      </div>
    </div>
  );
}

interface TrainerSupportCardProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export function TrainerSupportCard({ title, subtitle, children }: TrainerSupportCardProps): React.ReactElement {
  return (
    <section className="trp-support-card">
      <div>
        <h3>{title}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

interface TrainerEmptyStateProps {
  title: string;
  body: React.ReactNode;
}

export function TrainerEmptyState({ title, body }: TrainerEmptyStateProps): React.ReactElement {
  return (
    <section className="trp-empty">
      <h3>{title}</h3>
      <div>{body}</div>
    </section>
  );
}
