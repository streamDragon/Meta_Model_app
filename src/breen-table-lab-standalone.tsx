import React from 'react';
import { createRoot } from 'react-dom/client';

import BreenTableLabTrainer from './components/BreenTableLabTrainer';
import { getTrainerContract } from './config/trainerContract';

function bootBreenTableLab(): void {
  const mountId = getTrainerContract('breen-table-lab').wrapper.mountId || 'breen-table-lab-root';
  const mount = document.getElementById(mountId);
  if (!mount) {
    console.error(`[BreenTableLab] Missing #${mountId} mount node`);
    return;
  }

  const root = createRoot(mount);
  root.render(
    <React.StrictMode>
      <BreenTableLabTrainer />
    </React.StrictMode>
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootBreenTableLab, { once: true });
} else {
  bootBreenTableLab();
}
