import React from 'react';

export interface TrainerHelperStep {
  title: string;
  description: string;
}

export interface TrainerClarityCard {
  kicker: string;
  title: string;
  body: React.ReactNode;
}

type TrainerZoneKey = 'purpose' | 'start' | 'helper-steps' | 'main' | 'support';

const DEFAULT_MOBILE_ORDER: TrainerZoneKey[] = ['purpose', 'start', 'helper-steps', 'main', 'support'];
const MOBILE_ORDER_ALIASES: Record<string, TrainerZoneKey> = {
  purpose: 'purpose',
  start: 'start',
  helper: 'helper-steps',
  'helper-steps': 'helper-steps',
  main: 'main',
  support: 'support'
};

function normalizeMobilePriorityOrder(order?: ReadonlyArray<string>): TrainerZoneKey[] {
  const seen = new Set<TrainerZoneKey>();
  const resolved: TrainerZoneKey[] = [];
  (order || []).forEach((item) => {
    const key = MOBILE_ORDER_ALIASES[String(item || '').trim()];
    if (!key || seen.has(key)) return;
    seen.add(key);
    resolved.push(key);
  });
  DEFAULT_MOBILE_ORDER.forEach((key) => {
    if (seen.has(key)) return;
    seen.add(key);
    resolved.push(key);
  });
  return resolved;
}

function buildMobilePriorityStyle(order?: ReadonlyArray<string>): React.CSSProperties {
  const resolved = normalizeMobilePriorityOrder(order);
  return resolved.reduce<React.CSSProperties>((style, key, index) => {
    (style as Record<string, string>)[`--trp-mobile-order-${key}`] = String(index + 1);
    return style;
  }, {});
}

interface TrainerPlatformShellProps {
  trainerId?: string;
  title: string;
  subtitle: string;
  headerKicker?: string;
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
  clarityCards?: TrainerClarityCard[];
  closingNote?: React.ReactNode;
  helperSteps?: TrainerHelperStep[];
  supportRailMode?: string;
  mobilePriorityOrder?: ReadonlyArray<string>;
  main: React.ReactNode;
  support: React.ReactNode;
}

export function TrainerPlatformShell({
  trainerId,
  title,
  subtitle,
  headerKicker = '\u05de\u05e2\u05d8\u05e4\u05ea \u05d0\u05d9\u05de\u05d5\u05df',
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
  clarityCards = [],
  closingNote,
  helperSteps = [],
  supportRailMode = 'default',
  mobilePriorityOrder,
  main,
  support,
}: TrainerPlatformShellProps): React.ReactElement {
  const mobileOrder = normalizeMobilePriorityOrder(mobilePriorityOrder);
  return (
    <div
      className="trp-page"
      dir="rtl"
      lang="he"
      data-trainer-platform="1"
      data-trainer-id={trainerId || ''}
      data-trainer-mobile-order={mobileOrder.join(',')}
      style={buildMobilePriorityStyle(mobilePriorityOrder)}
    >
      <div className="trp-shell">
        <header className="trp-card trp-top">
          <div className="trp-title-wrap">
            <span className="trp-kicker">{headerKicker}</span>
            <h1 className="trp-title">{title}</h1>
            <p className="trp-subtitle">{subtitle}</p>
          </div>
          <div className="trp-actions">
            {modePill}
            {headerActions}
          </div>
        </header>

        <section className="trp-hero">
          <article className="trp-card trp-purpose" data-trainer-zone="purpose">
            <span className="trp-kicker">{purposeKicker}</span>
            <h2 className="trp-title" style={{ fontSize: '1.08rem' }}>{purposeTitle}</h2>
            <div className="trp-purpose-body">{purposeBody}</div>
            {purposeTags ? <div className="trp-chip-row">{purposeTags}</div> : null}
          </article>

          <aside className="trp-start-strip" data-trainer-zone="start">
            <div className="trp-start-copy">
              <span className="trp-kicker">{startKicker}</span>
              <h2 className="trp-title" style={{ fontSize: '1.04rem' }}>{startTitle}</h2>
              <div className="trp-subtitle">{startBody}</div>
            </div>
            <div className="trp-start-actions">{startActions}</div>
            {startMeta ? <div className="trp-chip-row">{startMeta}</div> : null}
          </aside>
        </section>

        {clarityCards.length ? (
          <section className="trp-clarity-strip" aria-label="בהירות לפני התחלה">
            {clarityCards.map((card) => (
              <article key={`${card.kicker}-${card.title}`} className="trp-clarity-card">
                <span className="trp-clarity-kicker">{card.kicker}</span>
                <strong className="trp-clarity-title">{card.title}</strong>
                <div className="trp-clarity-body">{card.body}</div>
              </article>
            ))}
          </section>
        ) : null}

        {closingNote ? <section className="trp-note-card">{closingNote}</section> : null}

        {helperSteps.length ? (
          <div className="trp-step-strip" data-trainer-zone="helper-steps">
            {helperSteps.map((step) => (
              <div key={step.title} className="trp-step">
                <strong>{step.title}</strong>
                <span>{step.description}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="trp-layout">
          <main className="trp-main" data-trainer-zone="main">{main}</main>
          <aside className="trp-support" data-trainer-zone="support" data-trainer-support-mode={supportRailMode}>{support}</aside>
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
