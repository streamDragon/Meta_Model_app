import React from 'react';
import { AppShell } from '../shell/AppShell';

export interface LabPanelDefinition {
  id: string;
  label: string;
  icon?: string;
  onOpen: () => void;
}

export interface LabMetricDefinition {
  id: string;
  label: string;
  icon?: string;
  value: string;
  onClick?: () => void;
}

interface LabContainerProps {
  title: string;
  subtitle?: string;
  renderWorkspace: () => React.ReactNode;
  renderLegacyExtras?: () => React.ReactNode;
  panelDefinitions?: LabPanelDefinition[];
  compactMetrics?: LabMetricDefinition[];
  actionArea?: React.ReactNode;
  bottomCollapsed?: React.ReactNode;
}

export function LabContainer({
  title,
  subtitle,
  renderWorkspace,
  renderLegacyExtras,
  panelDefinitions = [],
  compactMetrics = [],
  actionArea,
  bottomCollapsed,
}: LabContainerProps) {
  const actions = panelDefinitions.map((panel) => (
    <button key={panel.id} type="button" className="btn btn-secondary shell-action-btn" onClick={panel.onOpen}>
      {panel.icon ? <span aria-hidden="true">{panel.icon}</span> : null}
      <span>{panel.label}</span>
    </button>
  ));

  const metrics = compactMetrics.map((metric) => (
    <button
      key={metric.id}
      type="button"
      className="metric-chip"
      onClick={metric.onClick}
      disabled={!metric.onClick}
      aria-label={metric.label}
    >
      {metric.icon ? <span className="metric-chip-icon">{metric.icon}</span> : null}
      <span className="metric-chip-label">{metric.label}</span>
      <span className="metric-chip-value">{metric.value}</span>
    </button>
  ));

  return (
    <AppShell title={title} subtitle={subtitle} actions={actions} metrics={metrics}>
      <div className="lab-container" data-lab-view="active">
        <div className="lab-container-workspace">{renderWorkspace()}</div>
        {actionArea ? <div className="lab-container-actions">{actionArea}</div> : null}
        {bottomCollapsed ? (
          <details className="lab-container-bottom">
            <summary>Stats / History</summary>
            <div className="lab-container-bottom-body">{bottomCollapsed}</div>
          </details>
        ) : null}
        {renderLegacyExtras ? <div data-ui-mode="legacy">{renderLegacyExtras()}</div> : null}
      </div>
    </AppShell>
  );
}
