import React from 'react';
import { createRoot } from 'react-dom/client';
import IcebergTemplatesTrainer from './components/IcebergTemplatesTrainer';
import { getTrainerContract } from './config/trainerContract';

function bootIcebergTemplates(): void {
  const mountId = getTrainerContract('iceberg-templates').wrapper.mountId || 'iceberg-templates-root';
  const mount = document.getElementById(mountId);
  if (!mount) {
    console.error(`[IcebergTemplates] Missing #${mountId} mount node`);
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
