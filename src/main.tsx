import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { seedDatabase } from './db/seed';
import { seedRowingPrograms } from './db/rowingSeed';
import { isDemoMode, ensureDemoData } from './db/demo';

async function init() {
  await seedDatabase();
  await seedRowingPrograms();
  if (isDemoMode()) {
    await ensureDemoData();
  }
}

init();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
