import React from 'react';

interface AppShellProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  metrics?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, actions, metrics, children }: AppShellProps) {
  return (
    <section className="app-shell" data-shell-mode="shell">
      <header className="app-shell-header">
        <div className="app-shell-title-wrap">
          <p className="app-shell-kicker">LAB SHELL</p>
          <h2 className="app-shell-title">{title}</h2>
          {subtitle ? <p className="app-shell-subtitle">{subtitle}</p> : null}
        </div>
        {actions ? <div className="app-shell-actions">{actions}</div> : null}
      </header>
      {metrics ? <section className="app-shell-metrics">{metrics}</section> : null}
      {children}
    </section>
  );
}
