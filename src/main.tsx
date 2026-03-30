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

// Unregister any stale service workers and clear caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(r => r.unregister());
  });
  caches.keys().then(keys => {
    keys.forEach(k => caches.delete(k));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
