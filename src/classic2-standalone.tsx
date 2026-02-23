import React from 'react';
import { createRoot } from 'react-dom/client';
import Classic2Trainer from './components/Classic2Trainer';

function bootClassic2(): void {
  const mount = document.getElementById('classic2-root');
  if (!mount) {
    console.error('[Classic2] Missing #classic2-root mount node');
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
