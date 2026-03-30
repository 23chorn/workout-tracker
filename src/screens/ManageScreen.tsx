import { useState, useRef } from 'react';
import { db } from '../db/database';
import { exportData, importData } from '../utils/backup';
import { isDemoMode, enableDemo, disableDemo } from '../db/demo';
import { ExerciseManager } from '../components/manage/ExerciseManager';
import { WorkoutManager } from '../components/manage/WorkoutManager';
import { ProgramManager } from '../components/manage/ProgramManager';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Download, Upload, X, FlaskConical, Trash2, Check } from 'lucide-react';

type Tab = 'exercises' | 'workouts' | 'programs';

function DeleteAllButton() {
  const [showConfirm, setShowConfirm] = useState(false);

  const deleteAll = async () => {
    await db.transaction('rw', [db.exercises, db.workouts, db.programs, db.sessions, db.activeSession], async () => {
      await db.exercises.clear();
      await db.workouts.clear();
      await db.programs.clear();
      await db.sessions.clear();
      await db.activeSession.clear();
    });
    setShowConfirm(false);
    window.location.reload();
  };

  return (
    <>
      <button className="btn btn-danger btn-full" onClick={() => setShowConfirm(true)}>
        <Trash2 size={14} /> Delete All Data
      </button>
      {showConfirm && (
        <ConfirmDialog
          title="Delete All Data"
          message="This will permanently delete all exercises, workouts, programs, and session history. This cannot be undone."
          confirmLabel="Delete Everything"
          destructive
          onConfirm={deleteAll}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}

function HelpSection({ demo, demoLoading, onToggleDemo, onRowingToggle }: {
  demo: boolean;
  demoLoading: boolean;
  onToggleDemo: () => void;
  onRowingToggle?: () => void;
}) {
  const [rowingEnabled, setRowingEnabled] = useState(localStorage.getItem('lift-rowing-enabled') === '1');

  const toggleRowing = () => {
    const next = !rowingEnabled;
    if (next) { localStorage.setItem('lift-rowing-enabled', '1'); } else { localStorage.removeItem('lift-rowing-enabled'); }
    setRowingEnabled(next);
    onRowingToggle?.();
  };

  return (
    <div>
      <h2>Progression Badges</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Each exercise in your workout shows a badge indicating what the progression logic suggests.
      </p>

      {([
        { badge: 'Progress', color: 'green', title: 'Increase weight', desc: 'All working sets hit the top of the rep range last session. Suggests +2.5kg.' },
        { badge: 'Hold', color: 'accent', title: 'Stay at current weight', desc: 'Reps were within range but not all sets hit the top. Keep pushing at this weight.' },
        { badge: 'Deload', color: 'red', title: 'Reduce weight by 10%', desc: 'Reps fell below the rep range minimum for two consecutive sessions.' },
        { badge: 'New', color: 'accent', title: 'No previous data', desc: 'First time doing this exercise. No suggestion — pick a starting weight.' },
      ]).map(b => (
        <div key={b.badge} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span className={`badge badge-${b.color}`} style={{ flexShrink: 0, marginTop: 2, width: 64, textAlign: 'center' }}>{b.badge}</span>
          <div style={{ fontSize: 13 }}>
            <strong>{b.title}</strong>
            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{b.desc}</div>
          </div>
        </div>
      ))}

      <h2 style={{ marginTop: 24 }}>Set Confirmation</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>The tick button next to each set has three states:</p>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {([
            { bg: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', label: 'Empty', desc: '— enter weight and reps first' },
            { bg: 'var(--green)', border: 'none', color: 'white', label: 'Ready', desc: '— tap to confirm and start rest timer' },
            { bg: 'var(--accent)', border: 'none', color: 'white', label: 'Confirmed', desc: '— set is logged' },
          ]).map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: s.bg, border: s.border, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Check size={14} color={s.color} />
              </div>
              <div style={{ fontSize: 13 }}><strong>{s.label}</strong> {s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Working Sets vs Warm-ups</h2>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'white' }}>W</div>
            <div style={{ fontSize: 13 }}><strong>Working set</strong> — counts toward e10RM and progression</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>WU</div>
            <div style={{ fontSize: 13 }}><strong>Warm-up</strong> — logged but excluded from calculations</div>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>e10RM</h2>
      <div className="card">
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          <strong>Estimated 10-rep max</strong> — a normalised strength metric that lets you compare performance across different weight/rep combinations.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>Per set: weight x (1 + reps / 30) / 1.333</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.6 }}>Session average: mean of all working sets for that exercise. Plotted over time in the exercise detail view. PB flagged when session average beats your all-time best.</p>
      </div>

      <h2 style={{ marginTop: 24 }}>Data</h2>
      <div className="card">
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>All data is stored locally on your device in the browser. Nothing is sent to a server. Use the export/import buttons at the top of this screen to back up your data as a JSON file.</p>
      </div>

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16 }}>Modules</h2>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Rowing</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Pete Plan + freeform rowing tracker</div>
          </div>
          <button onClick={toggleRowing} style={{ width: 48, height: 28, borderRadius: 14, padding: 2, cursor: 'pointer', background: rowingEnabled ? 'var(--accent)' : 'var(--border)', border: 'none', transition: 'background 0.2s', position: 'relative' }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: 'white', transition: 'transform 0.2s', transform: rowingEnabled ? 'translateX(20px)' : 'translateX(0)' }} />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16 }}>Demo Mode</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Load sample data to explore the app. Your real data is kept separate and unaffected.</p>
        <button className={`btn btn-full mb-md ${demo ? 'btn-danger' : 'btn-secondary'}`} onClick={onToggleDemo} disabled={demoLoading} style={{ fontSize: 13 }}>
          <FlaskConical size={14} />
          {demoLoading ? 'Loading...' : demo ? 'Demo Mode ON — tap to disable' : 'Enable Demo Mode'}
        </button>
      </div>

      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ color: 'var(--red)', fontSize: 16 }}>Danger Zone</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>This cannot be undone. Export your data first if you want a backup.</p>
        <DeleteAllButton />
      </div>
    </div>
  );
}

export function ManageScreen({ onRowingToggle }: { onRowingToggle?: () => void }) {
  const [tab, setTab] = useState<Tab>('exercises');
  const [demo] = useState(isDemoMode);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);

  const toggleDemo = async () => {
    setDemoLoading(true);
    try {
      if (demo) { await disableDemo(); } else { await enableDemo(); }
    } finally {
      setDemoLoading(false);
    }
  };

  const handleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    try { await importData(importFile); setImportSuccess(true); } catch { setImportSuccess(false); }
    setImportFile(null);
  };

  return (
    <div className="screen">
      <div className="row-between mb-md">
        <h1 style={{ marginBottom: 0 }}>Manage</h1>
        <div className="row gap-sm">
          <button className="btn btn-sm btn-secondary" onClick={exportData}><Download size={14} /></button>
          <button className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}><Upload size={14} /></button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowHelp(true)} style={{ fontWeight: 700, fontSize: 16, width: 36, padding: 0 }}>?</button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImportSelect} style={{ display: 'none' }} />
        </div>
      </div>

      <div className="sub-tabs">
        {(['exercises', 'workouts', 'programs'] as Tab[]).map(t => (
          <button key={t} className={`sub-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'exercises' && <ExerciseManager />}
      {tab === 'workouts' && <WorkoutManager />}
      {tab === 'programs' && <ProgramManager />}

      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="row-between mb-md">
              <h2 style={{ marginBottom: 0 }}>Help</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowHelp(false)}><X size={14} /></button>
            </div>
            <HelpSection demo={demo} demoLoading={demoLoading} onToggleDemo={toggleDemo} onRowingToggle={onRowingToggle} />
          </div>
        </div>
      )}

      {importFile && (
        <ConfirmDialog title="Import Data" message="This will overwrite all existing data. Are you sure?" confirmLabel="Import" destructive onConfirm={handleImportConfirm} onCancel={() => setImportFile(null)} />
      )}

      {importSuccess !== null && (
        <div className="modal-overlay" onClick={() => setImportSuccess(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2>{importSuccess ? 'Import Successful' : 'Import Failed'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>{importSuccess ? 'All data has been restored.' : 'The file could not be read.'}</p>
            <button className="btn btn-primary btn-full" onClick={() => setImportSuccess(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
