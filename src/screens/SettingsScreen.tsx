import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/database';
import { useRMMode } from '../contexts/RMModeContext';
import { loadCompoundGoals, saveCompoundGoals, COMPOUND_DEFS, type CompoundGoals } from '../utils/compoundGoals';
import { seedStrengthPlan } from '../db/strengthPlan';
import { exportData, importData, getLastBackupDate } from '../utils/backup';
import { isDemoMode, enableDemo, disableDemo } from '../db/demo';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { BodyWeightTracker } from '../components/BodyWeightTracker';
import { Download, Upload, X, FlaskConical, Trash2, Check } from 'lucide-react';

function DeleteAllButton() {
  const [showConfirm, setShowConfirm] = useState(false);
  const deleteAll = async () => {
    await db.transaction('rw', [db.exercises, db.workouts, db.programs, db.sessions, db.activeSession], async () => {
      await db.exercises.clear(); await db.workouts.clear(); await db.programs.clear(); await db.sessions.clear(); await db.activeSession.clear();
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
        <ConfirmDialog title="Delete All Data" message="This will permanently delete all exercises, workouts, programs, and session history. This cannot be undone." confirmLabel="Delete Everything" destructive onConfirm={deleteAll} onCancel={() => setShowConfirm(false)} />
      )}
    </>
  );
}

function HelpContent() {
  return (
    <>
      <h2>Progression Badges</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Each exercise in your workout shows a badge indicating what the progression logic suggests.
      </p>
      {([
        { badge: 'Progress', color: 'green', title: 'Increase weight', desc: 'All working sets hit the top of the rep range last session. Suggests +2.5kg.' },
        { badge: 'Hold', color: 'accent', title: 'Stay at current weight', desc: 'Reps were within range but not all sets hit the top. Keep pushing.' },
        { badge: 'Deload', color: 'red', title: 'Reduce weight by 10%', desc: 'Reps fell below the rep range minimum for two consecutive sessions.' },
        { badge: 'New', color: 'accent', title: 'No previous data', desc: 'First time doing this exercise. No suggestion — pick a starting weight.' },
      ]).map(b => (
        <div key={b.badge} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span className={`badge badge-${b.color}`} style={{ flexShrink: 0, marginTop: 2, width: 64, textAlign: 'center' }}>{b.badge}</span>
          <div style={{ fontSize: 13 }}><strong>{b.title}</strong><div style={{ color: 'var(--text-muted)', marginTop: 2 }}>{b.desc}</div></div>
        </div>
      ))}

      <h2 style={{ marginTop: 24 }}>Set Confirmation</h2>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {([
            { bg: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', label: 'Empty', desc: '— enter weight and reps first' },
            { bg: 'var(--green)', border: 'none', color: 'white', label: 'Ready', desc: '— tap to confirm and start rest timer' },
            { bg: 'var(--accent)', border: 'none', color: 'white', label: 'Confirmed', desc: '— set is logged, tap to undo' },
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

      <h2 style={{ marginTop: 24 }}>Strength Metrics</h2>
      <div className="card">
        <p style={{ fontSize: 13, lineHeight: 1.6 }}><strong>e1RM</strong> — estimated 1-rep max. The classic strength standard.</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.6 }}>weight × (1 + reps / 30)</p>
        <p style={{ fontSize: 13, lineHeight: 1.6, marginTop: 12 }}><strong>e10RM</strong> — estimated 10-rep max. Scaled down from e1RM; useful for tracking hypertrophy-range work.</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.6 }}>weight × (1 + reps / 30) / 1.333</p>
      </div>
    </>
  );
}

export function SettingsScreen({ onRowingToggle }: { onRowingToggle?: () => void }) {
  const { rmMode, setRMMode } = useRMMode();
  const [goals, setGoals] = useState<CompoundGoals>(loadCompoundGoals);
  const [demo] = useState(isDemoMode);
  const [demoLoading, setDemoLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);
  const [lastBackup, setLastBackup] = useState(getLastBackupDate);
  const [rowingEnabled, setRowingEnabled] = useState(localStorage.getItem('lift-rowing-enabled') === '1');
  const plans = useLiveQuery(() => db.liftingPlans.toArray()) ?? [];
  const activeProgress = useLiveQuery(() => db.liftingPlanProgress.filter(p => p.active).first()) ?? null;

  const togglePlan = async () => {
    if (activeProgress) {
      // Disable — mark all inactive
      await db.liftingPlanProgress.toCollection().modify({ active: false });
    } else if (plans.length > 0) {
      // Re-enable the first available plan
      await db.liftingPlanProgress.clear();
      await db.liftingPlanProgress.add({ planId: plans[0].id!, active: true });
    } else {
      // No plan seeded yet — seed it and enable
      await seedStrengthPlan();
    }
  };

  const restartPlan = async () => {
    if (plans.length === 0) return;
    const plan = plans[0];
    await db.liftingPlans.update(plan.id!, { startDate: new Date().toISOString().split('T')[0] });
    await db.liftingPlanProgress.clear();
    await db.liftingPlanProgress.add({ planId: plan.id!, active: true });
  };

  const toggleDemo = async () => {
    setDemoLoading(true);
    try { if (demo) { await disableDemo(); } else { await enableDemo(); } } finally { setDemoLoading(false); }
  };

  const toggleRowing = () => {
    const next = !rowingEnabled;
    if (next) { localStorage.setItem('lift-rowing-enabled', '1'); } else { localStorage.removeItem('lift-rowing-enabled'); }
    setRowingEnabled(next);
    onRowingToggle?.();
  };

  const handleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return; setImportFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    try { await importData(importFile); setImportSuccess(true); } catch { setImportSuccess(false); }
    setImportFile(null);
  };

  return (
    <div className="screen">
      <h1>Settings</h1>

      {/* Body Weight */}
      <BodyWeightTracker />

      {/* Data */}
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16 }}>Data</h2>
        {(() => {
          const daysSince = lastBackup ? Math.floor((Date.now() - lastBackup.getTime()) / 86400000) : null;
          const stale = daysSince === null || daysSince >= 14;
          return (
            <p style={{ fontSize: 12, color: stale ? 'var(--yellow)' : 'var(--text-muted)', marginBottom: 10 }}>
              {daysSince === null ? 'No backup yet' : daysSince === 0 ? 'Backed up today' : `Last backup: ${daysSince} day${daysSince === 1 ? '' : 's'} ago`}
            </p>
          );
        })()}
        <div className="row gap-sm mb-md">
          <button
            className="btn btn-sm btn-secondary"
            style={{ flex: 1 }}
            onClick={async () => { await exportData(); setLastBackup(getLastBackupDate()); }}
          >
            <Download size={14} /> Export
          </button>
          <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImportSelect} style={{ display: 'none' }} />
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>All data stored locally. Nothing sent to a server. iOS can clear this data unexpectedly — back up regularly.</p>
      </div>

      {/* Help */}
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-secondary btn-full" onClick={() => setShowHelp(true)}>
          Help &amp; Guide
        </button>
      </div>

      {/* Display */}
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16 }}>Display</h2>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Strength Metric</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Charts and personal bests</div>
          </div>
          <div className="sub-tabs" style={{ marginBottom: 0 }}>
            <button className={`sub-tab ${rmMode === 'e10RM' ? 'active' : ''}`} onClick={() => setRMMode('e10RM')}>e10RM</button>
            <button className={`sub-tab ${rmMode === 'e1RM' ? 'active' : ''}`} onClick={() => setRMMode('e1RM')}>e1RM</button>
          </div>
        </div>
      </div>

      {/* Compound Goals */}
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16 }}>Compound Goals</h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Target {rmMode} as a % of bodyweight. E.g. 120 = 1.2× BW. Shown in Stats.
        </p>
        {COMPOUND_DEFS.map(({ key, label }) => (
          <div key={key} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{label}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                max={500}
                value={goals[key] ?? ''}
                onChange={e => {
                  const raw = e.target.value;
                  const updated: CompoundGoals = { ...goals, [key]: raw === '' ? null : Number(raw) };
                  setGoals(updated);
                  saveCompoundGoals(updated);
                }}
                placeholder="—"
                style={{
                  width: 64, textAlign: 'right', padding: '4px 8px', fontSize: 14,
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 6, color: 'var(--text)',
                }}
              />
              <span style={{ fontSize: 13, color: 'var(--text-muted)', width: 32 }}>% BW</span>
            </div>
          </div>
        ))}
      </div>

      {/* Lifting Plan */}
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16 }}>Lifting Plan</h2>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {plans[0]?.name ?? '24-Week Strength + Pete Plan'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {activeProgress ? 'Active — driving Today screen' : 'Off — use manual programs'}
            </div>
          </div>
          <button onClick={togglePlan} style={{ width: 48, height: 28, borderRadius: 14, padding: 2, cursor: 'pointer', background: activeProgress ? 'var(--accent)' : 'var(--border)', border: 'none', transition: 'background 0.2s', position: 'relative' }}>
            <div style={{ width: 24, height: 24, borderRadius: 12, background: 'white', transition: 'transform 0.2s', transform: activeProgress ? 'translateX(20px)' : 'translateX(0)' }} />
          </button>
        </div>
        {plans.length > 0 && (
          <button className="btn btn-sm btn-secondary btn-full" onClick={restartPlan}>
            Restart plan from today
          </button>
        )}
      </div>

      {/* Modules */}
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
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

      {/* Demo */}
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16 }}>Demo Mode</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Load sample data to explore the app. Your real data is kept separate.</p>
        <button className={`btn btn-full mb-md ${demo ? 'btn-danger' : 'btn-secondary'}`} onClick={toggleDemo} disabled={demoLoading} style={{ fontSize: 13 }}>
          <FlaskConical size={14} />
          {demoLoading ? 'Loading...' : demo ? 'Demo Mode ON — tap to disable' : 'Enable Demo Mode'}
        </button>
      </div>

      {/* Danger Zone */}
      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ color: 'var(--red)', fontSize: 16 }}>Danger Zone</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>Export your data first if you want a backup.</p>
        <DeleteAllButton />
      </div>

      {/* Help Modal */}
      {showHelp && (
        <div className="modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh' }}>
            <div className="row-between mb-md">
              <h2 style={{ marginBottom: 0 }}>Help</h2>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowHelp(false)}><X size={14} /></button>
            </div>
            <HelpContent />
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
