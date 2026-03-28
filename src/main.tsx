import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { db } from './db/database';
import { seedDatabase } from './db/seed';
import { isDemoMode, ensureDemoData } from './db/demo';

async function init() {
  // One-time cleanup: wipe leftover demo data from user DB after two-DB split
  if (!isDemoMode() && !localStorage.getItem('lift-legacy-cleanup-v2')) {
    await db.transaction('rw', [db.exercises, db.workouts, db.programs, db.sessions, db.activeSession], async () => {
      await db.exercises.clear();
      await db.workouts.clear();
      await db.programs.clear();
      await db.sessions.clear();
      await db.activeSession.clear();
    });
    localStorage.setItem('lift-legacy-cleanup-v2', '1');
  }

  await seedDatabase();
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
