import React from 'react';

export interface TrainerSettingsSection {
  id: string;
  title: string;
  help: string;
  content: React.ReactNode;
  advanced?: boolean;
  visible?: boolean;
}

interface TrainerSettingsShellProps {
  open: boolean;
  title: string;
  subtitle: string;
  summaryPill?: React.ReactNode;
  preview: React.ReactNode;
  sections: TrainerSettingsSection[];
  advancedOpen: boolean;
  onAdvancedToggle: (open: boolean) => void;
  onClose: () => void;
  onResetDefaults?: () => void;
  onCancel?: () => void;
  footerNote?: React.ReactNode;
  footerActions: React.ReactNode;
}

export function TrainerSettingsShell({
  open,
  title,
  subtitle,
  summaryPill,
  preview,
  sections,
  advancedOpen,
  onAdvancedToggle,
  onClose,
  onResetDefaults,
  onCancel,
  footerNote,
  footerActions,
}: TrainerSettingsShellProps): React.ReactNode {
  if (!open) return null;

  const visibleSections = sections.filter((section) => section.visible !== false);
  const basicSections = visibleSections.filter((section) => !section.advanced);
  const advancedSections = visibleSections.filter((section) => section.advanced);

  return (
    <div className="trs-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="trs-modal">
        <div className="trs-head">
          <div className="trs-head-copy">
            <span className="trp-kicker">Settings Shell</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <div className="trp-settings-head-actions">
            {onResetDefaults ? (
              <button type="button" className="trp-btn is-secondary" onClick={onResetDefaults}>ברירות מחדל</button>
            ) : null}
            <button type="button" className="trp-btn is-secondary" onClick={onClose}>סגור</button>
          </div>
        </div>

        <div className="trs-grid">
          <div className="trs-main">
            {basicSections.map((section) => (
              <section key={section.id} className="trs-section" data-kind="basic">
                <div className="trs-section-head">
                  <h3>{section.title}</h3>
                  <p>{section.help}</p>
                </div>
                {section.content}
              </section>
            ))}

            {advancedSections.length ? (
              <details className="trs-advanced" open={advancedOpen} onToggle={(event) => onAdvancedToggle((event.target as HTMLDetailsElement).open)}>
                <summary>אפשרויות מתקדמות</summary>
                <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
                  {advancedSections.map((section) => (
                    <section key={section.id} className="trs-section" data-kind="advanced">
                      <div className="trs-section-head">
                        <h3>{section.title}</h3>
                        <p>{section.help}</p>
                      </div>
                      {section.content}
                    </section>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          <aside className="trs-side">
            <section className="trs-preview">
              <div className="trs-section-head">
                <h3>תצוגה מקדימה / סיכום</h3>
                <p>כך הסשן הבא ייראה אם תשמור/י עכשיו.</p>
              </div>
              {summaryPill}
              {preview}
            </section>
          </aside>
        </div>

        <div className="trs-footer">
          <div className="trs-footer-note">{footerNote}</div>
          <div className="trp-settings-footer-actions">
            {onCancel ? <button type="button" className="trp-btn is-secondary" onClick={onCancel}>ביטול</button> : null}
            {footerActions}
          </div>
        </div>
      </div>
    </div>
  );
}
