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
  headerKicker?: string;
  previewTitle?: string;
  previewSubtitle?: string;
  advancedLabel?: string;
  closeLabel?: string;
  resetLabel?: string;
  cancelLabel?: string;
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
  headerKicker = '\u05dc\u05d5\u05d7 \u05d1\u05e7\u05e8\u05d4 \u05de\u05e9\u05d5\u05ea\u05e3',
  previewTitle = '\u05ea\u05e6\u05d5\u05d2\u05d4 \u05de\u05e7\u05d3\u05d9\u05de\u05d4 / \u05e1\u05d9\u05db\u05d5\u05dd',
  previewSubtitle = '\u05db\u05da \u05d4\u05e1\u05e9\u05df \u05d4\u05d1\u05d0 \u05d9\u05d9\u05e8\u05d0\u05d4 \u05d0\u05dd \u05ea\u05e9\u05de\u05d5\u05e8/\u05d9 \u05e2\u05db\u05e9\u05d9\u05d5.',
  advancedLabel = '\u05d0\u05e4\u05e9\u05e8\u05d5\u05d9\u05d5\u05ea \u05de\u05ea\u05e7\u05d3\u05de\u05d5\u05ea',
  closeLabel = '\u05e1\u05d2\u05d5\u05e8',
  resetLabel = '\u05d1\u05e8\u05d9\u05e8\u05d5\u05ea \u05de\u05d7\u05d3\u05dc',
  cancelLabel = '\u05d1\u05d9\u05d8\u05d5\u05dc',
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
            <span className="trp-kicker">{headerKicker}</span>
            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>
          <div className="trp-settings-head-actions">
            {onResetDefaults ? (
              <button type="button" className="trp-btn is-secondary" onClick={onResetDefaults}>{resetLabel}</button>
            ) : null}
            <button type="button" className="trp-btn is-secondary" onClick={onClose}>{closeLabel}</button>
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
              <details
                className="trs-advanced"
                open={advancedOpen}
                onToggle={(event) => onAdvancedToggle((event.target as HTMLDetailsElement).open)}
              >
                <summary>{advancedLabel}</summary>
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
                <h3>{previewTitle}</h3>
                <p>{previewSubtitle}</p>
              </div>
              {summaryPill}
              {preview}
            </section>
          </aside>
        </div>

        <div className="trs-footer">
          <div className="trs-footer-note">{footerNote}</div>
          <div className="trp-settings-footer-actions">
            {onCancel ? <button type="button" className="trp-btn is-secondary" onClick={onCancel}>{cancelLabel}</button> : null}
            {footerActions}
          </div>
        </div>
      </div>
    </div>
  );
}
