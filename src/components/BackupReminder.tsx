import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { exportData, getLastBackupDate } from '../utils/backup';
import { Download, X } from 'lucide-react';

const SNOOZE_KEY = 'lift-backup-reminder-snoozed-until';
const STALE_DAYS = 14;

function isSnoozed(): boolean {
  const until = localStorage.getItem(SNOOZE_KEY);
  return until ? new Date(until).getTime() > Date.now() : false;
}

// iOS can silently wipe local app data on reinstall — nudge for a backup
// on the screen that's actually opened every day, not just in Settings.
export function BackupReminder() {
  const sessionCount = useLiveQuery(() => db.sessions.count()) ?? 0;
  const [snoozed, setSnoozed] = useState(isSnoozed);
  const [exporting, setExporting] = useState(false);

  const lastBackup = getLastBackupDate();
  const daysSince = lastBackup ? Math.floor((Date.now() - lastBackup.getTime()) / 86400000) : null;
  const stale = daysSince === null || daysSince >= STALE_DAYS;

  if (sessionCount === 0 || !stale || snoozed) return null;

  const snooze = () => {
    const until = new Date();
    until.setDate(until.getDate() + 3);
    localStorage.setItem(SNOOZE_KEY, until.toISOString());
    setSnoozed(true);
  };

  const backUpNow = async () => {
    setExporting(true);
    try { await exportData(); } finally { setExporting(false); snooze(); }
  };

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="row-between" style={{ alignItems: 'flex-start', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Download size={15} color="var(--yellow)" />
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.03em',
          }}>
            Back up your data
          </span>
        </div>
        <button onClick={snooze} aria-label="Dismiss for a few days" style={{ color: 'var(--text-muted)', padding: 2 }}>
          <X size={16} />
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
        {daysSince === null ? "You haven't exported a backup yet." : `Last backup was ${daysSince} days ago.`} iOS can clear local app data on reinstall without warning.
      </p>
      <button className="btn btn-sm btn-secondary btn-full" onClick={backUpNow} disabled={exporting}>
        <Download size={14} /> {exporting ? 'Backing up…' : 'Back Up Now'}
      </button>
    </div>
  );
}
