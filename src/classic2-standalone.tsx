import React from 'react';
import { createRoot } from 'react-dom/client';
import Classic2Trainer from './components/Classic2Trainer';
import { getTrainerContract } from './config/trainerContract';

function bootClassic2(): void {
  const mountId = getTrainerContract('classic2').wrapper.mountId || 'classic2-root';
  const mount = document.getElementById(mountId);
  if (!mount) {
    console.error(`[Classic2] Missing #${mountId} mount node`);
    return;
  }

  const root = createRoot(mount);
  root.render(
    <React.StrictMode>
      <Classic2Trainer />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootClassic2, { once: true });
} else {
  bootClassic2();
}
