import React from 'react';
import { createRoot } from 'react-dom/client';
import IcebergTemplatesTrainer from './components/IcebergTemplatesTrainer';

function bootIcebergTemplates(): void {
  const mount = document.getElementById('iceberg-templates-root');
  if (!mount) {
    console.error('[IcebergTemplates] Missing #iceberg-templates-root mount node');
    return;
  }

  const root = createRoot(mount);
  root.render(
    <React.StrictMode>
      <IcebergTemplatesTrainer />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootIcebergTemplates, { once: true });
} else {
  bootIcebergTemplates();
}

