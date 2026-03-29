import { useState, useMemo } from 'react';
import { db, type Session } from '../../db/database';
import { sessionE10RM } from '../../utils/e10rm';
import { ConfirmDialog } from '../ConfirmDialog';
import { SessionSummary } from '../SessionSummary';
import { E10RMChart } from './E10RMChart';
import { ChevronLeft, Trash2, Pencil, BarChart3 } from 'lucide-react';

export function SessionDetail({ sessions: daySessions, allSessions, exMap, allTimeBest, onBack }: {
  sessions: Session[];
  allSessions: Session[];
  exMap: Map<number, { name: string }>;
  allTimeBest: Map<number, number>;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Session>(daySessions[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSets, setEditSets] = useState<{ weight: string; reps: string; isWorkingSet: boolean }[][]>([]);

  const startEditing = () => {
    setEditSets(selected.exercises.map(se => se.sets.map(s => ({ weight: String(s.weight), reps: String(s.reps), isWorkingSet: s.isWorkingSet }))));
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!selected.id) return;
    const updatedExercises = selected.exercises.map((se, exIdx) => {
      const sets = editSets[exIdx].filter(s => s.weight && s.reps).map(s => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps), isWorkingSet: s.isWorkingSet }));
      return { ...se, sets, e10RM: sessionE10RM(sets) };
    });
    await db.sessions.update(selected.id, { exercises: updatedExercises });
    setSelected({ ...selected, exercises: updatedExercises });
    setEditing(false);
  };

  const updateEditSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setEditSets(prev => { const next = prev.map(e => [...e]); next[exIdx][setIdx] = { ...next[exIdx][setIdx], [field]: value }; return next; });
  };

  const toggleEditWorking = (exIdx: number, setIdx: number) => {
    setEditSets(prev => { const next = prev.map(e => [...e]); next[exIdx][setIdx] = { ...next[exIdx][setIdx], isWorkingSet: !next[exIdx][setIdx].isWorkingSet }; return next; });
  };

  const deleteSession = async () => {
    if (!selected.id) return;
    await db.sessions.delete(selected.id);
    setShowDeleteConfirm(false);
    onBack();
  };

  const summaryData = useMemo(() => {
    let totalSets = 0;
    let totalVolume = 0;
    let exerciseCount = 0;
    const pbs: { name: string; e10RM: number }[] = [];

    for (const se of selected.exercises) {
      if (se.sets.length > 0) exerciseCount++;
      for (const set of se.sets) {
        totalSets++;
        totalVolume += set.weight * set.reps;
      }
      if (se.e10RM > 0 && se.e10RM >= (allTimeBest.get(se.exerciseId) ?? 0)) {
        const ex = exMap.get(se.exerciseId);
        if (ex) pbs.push({ name: ex.name, e10RM: se.e10RM });
      }
    }

    return {
      dayLabel: selected.dayLabel,
      date: selected.date,
      duration: selected.durationMinutes,
      exerciseCount, totalSets, totalVolume, pbs,
    };
  }, [selected, allTimeBest, exMap]);

  if (showSummary) {
    return (
      <div className="screen">
        <button className="btn btn-sm btn-secondary mb-md" onClick={() => setShowSummary(false)}>
          <ChevronLeft size={16} /> Details
        </button>
        <SessionSummary
          data={summaryData}
          onDismiss={() => setShowSummary(false)}
          dismissLabel="Back to Details"
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <button className="btn btn-sm btn-secondary mb-md" onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>

      <h1>{selected.dayLabel}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        {new Date(selected.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        {selected.durationMinutes != null && <> &middot; {selected.durationMinutes}m</>}
      </p>

      {daySessions.length > 1 && (
        <div className="sub-tabs" style={{ marginBottom: 16 }}>
          {daySessions.map((s) => (
            <button key={s.id} className={`sub-tab ${selected.id === s.id ? 'active' : ''}`} onClick={() => setSelected(s)}>{s.dayLabel}</button>
          ))}
        </div>
      )}

      {!editing && (
        <div className="row gap-sm mb-md">
          <button className="btn btn-sm btn-secondary" onClick={() => setShowSummary(true)}><BarChart3 size={14} /> Summary</button>
          <button className="btn btn-sm btn-secondary" onClick={startEditing}><Pencil size={14} /> Edit</button>
        </div>
      )}
      {editing && (
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={saveEdits}>Save Changes</button>
        </div>
      )}

      {selected.exercises.map((se, exIdx) => {
        const exercise = exMap.get(se.exerciseId);
        const isPB = se.e10RM > 0 && se.e10RM >= (allTimeBest.get(se.exerciseId) ?? 0);
        return (
          <div className="exercise-card" key={exIdx}>
            <div className="exercise-card-header">
              <div><h3>{exercise?.name ?? 'Unknown'}{isPB && <span className="pb-badge">PB</span>}</h3></div>
              {se.e10RM > 0 && <span className="badge badge-accent">e10RM: {se.e10RM.toFixed(1)}</span>}
            </div>
            <div className="set-labels" style={editing ? { gridTemplateColumns: '40px 1fr 1fr 48px' } : undefined}>
              <span>Set</span><span>kg</span><span>Reps</span><span>{editing ? 'W' : 'Type'}</span>
            </div>
            {editing ? (
              editSets[exIdx]?.map((set, si) => (
                <div className="set-row" key={si} style={{ marginBottom: 4 }}>
                  <span className="set-num">{si + 1}</span>
                  <input type="number" inputMode="decimal" value={set.weight} onChange={e => updateEditSet(exIdx, si, 'weight', e.target.value)} style={{ padding: 6, textAlign: 'center', fontSize: 14 }} />
                  <input type="number" inputMode="numeric" value={set.reps} onChange={e => updateEditSet(exIdx, si, 'reps', e.target.value)} style={{ padding: 6, textAlign: 'center', fontSize: 14 }} />
                  <button className={`working-toggle ${set.isWorkingSet ? 'active' : ''}`} onClick={() => toggleEditWorking(exIdx, si)} style={{ width: 32, height: 32 }}>{set.isWorkingSet ? 'W' : 'WU'}</button>
                </div>
              ))
            ) : (
              se.sets.map((set, si) => (
                <div className="set-row" key={si} style={{ marginBottom: 4 }}>
                  <span className="set-num">{si + 1}</span>
                  <span style={{ textAlign: 'center' }}>{set.weight}</span>
                  <span style={{ textAlign: 'center' }}>{set.reps}</span>
                  <span style={{ textAlign: 'center', fontSize: 12, color: set.isWorkingSet ? 'var(--accent)' : 'var(--text-muted)' }}>{set.isWorkingSet ? 'W' : 'WU'}</span>
                </div>
              ))
            )}
          </div>
        );
      })}

      <h2 style={{ marginTop: 24 }}>Trends</h2>
      {selected.exercises.map((se, idx) => (
        <E10RMChart key={idx} exerciseId={se.exerciseId} exerciseName={exMap.get(se.exerciseId)?.name ?? 'Unknown'} sessions={allSessions} />
      ))}

      <button className="btn btn-danger btn-full" style={{ marginTop: 16 }} onClick={() => setShowDeleteConfirm(true)}>
        <Trash2 size={14} /> Delete Session
      </button>

      {showDeleteConfirm && (
        <ConfirmDialog title="Delete Session" message={`Delete this ${selected.dayLabel} session from ${new Date(selected.date).toLocaleDateString()}? This cannot be undone.`} confirmLabel="Delete" destructive onConfirm={deleteSession} onCancel={() => setShowDeleteConfirm(false)} />
      )}
    </div>
  );
}
