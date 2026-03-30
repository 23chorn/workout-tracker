import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Program, type ProgramDay } from '../../db/database';
import { ConfirmDialog } from '../ConfirmDialog';
import { Plus, Trash2, X } from 'lucide-react';

export function ProgramManager() {
  const programs = useLiveQuery(() => db.programs.toArray()) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const [editing, setEditing] = useState<Program | null>(null);
  const [name, setName] = useState('');
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [confirmDeleteProgramId, setConfirmDeleteProgramId] = useState<number | null>(null);
  const [defaultProgramId, setDefaultProgramId] = useState<number | null>(() => {
    const stored = localStorage.getItem('lift-default-program');
    return stored ? Number(stored) : null;
  });

  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const setAsDefault = (id: number) => { localStorage.setItem('lift-default-program', String(id)); setDefaultProgramId(id); };
  const startNew = () => { setName(''); setDays([]); setEditing({ name: '', days: [] }); };
  const startEdit = (p: Program) => { setName(p.name); setDays([...p.days]); setEditing(p); };
  const addDay = () => { setDays(prev => [...prev, { label: '', workoutId: workouts[0]?.id ?? 0 }]); };
  const updateDayWorkout = (idx: number, workoutId: number) => { setDays(prev => { const next = [...prev]; next[idx] = { ...next[idx], workoutId }; return next; }); };
  const removeDay = (idx: number) => { setDays(prev => prev.filter((_, i) => i !== idx)); };

  const save = async () => {
    if (!name.trim()) return;
    const resolvedDays = days.map((d, i) => {
      const wk = workouts.find(w => w.id === d.workoutId);
      return { ...d, label: wk?.name ?? `Day ${i + 1}` };
    });
    const data = { name: name.trim(), days: resolvedDays };
    if (editing?.id) { await db.programs.update(editing.id, data); } else { await db.programs.add(data); }
    setEditing(null);
  };

  const deleteProgram = async (id: number) => { await db.programs.delete(id); setConfirmDeleteProgramId(null); };

  if (editing) {
    return (
      <div>
        <div className="row-between mb-md">
          <h2 style={{ marginBottom: 0 }}>{editing.id ? 'Edit' : 'New'} Program</h2>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowCancelConfirm(true)}><X size={16} /> Cancel</button>
        </div>
        <div className="form-group"><label>Program Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Pull Legs" /></div>
        {days.map((day, idx) => (
          <div className="card" key={idx}>
            <div className="row-between mb-sm">
              <strong style={{ fontSize: 14 }}>Day {idx + 1}</strong>
              <button onClick={() => removeDay(idx)} style={{ color: 'var(--red)' }}><Trash2 size={16} /></button>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Workout</label>
              <select value={day.workoutId} onChange={e => updateDayWorkout(idx, Number(e.target.value))}>
                <option value={0}>Select workout...</option>
                {workouts.map(w => (<option key={w.id} value={w.id}>{w.name}</option>))}
              </select>
            </div>
          </div>
        ))}
        <button className="btn btn-secondary btn-full mb-md" onClick={addDay}><Plus size={16} /> Add Day</button>
        <button className="btn btn-primary btn-full" onClick={save}>Save Program</button>
        {showCancelConfirm && (
          <ConfirmDialog title="Discard Changes" message="You have unsaved changes. Discard them?" confirmLabel="Discard" destructive onConfirm={() => { setShowCancelConfirm(false); setEditing(null); }} onCancel={() => setShowCancelConfirm(false)} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="row-between mb-md">
        <h2 style={{ marginBottom: 0 }}>Programs</h2>
        <button className="btn btn-sm btn-primary" onClick={startNew}><Plus size={16} /> New</button>
      </div>
      {programs.length === 0 ? (
        <div className="empty"><p>No programs yet.</p></div>
      ) : (
        programs.map(p => {
          const isDefault = p.id === defaultProgramId;
          return (
            <div key={p.id} className="list-item" onClick={() => startEdit(p)}>
              <div style={{ flex: 1 }}>
                <div className="title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {p.name}
                  {isDefault && <span className="badge badge-accent">Default</span>}
                </div>
                <div className="subtitle">
                  {p.days.length} days
                  {!isDefault && <> &middot; <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setAsDefault(p.id!); }}>Set as default</span></>}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setConfirmDeleteProgramId(p.id!); }} style={{ color: 'var(--red)', padding: 8 }}><Trash2 size={16} /></button>
            </div>
          );
        })
      )}
      {confirmDeleteProgramId !== null && (
        <ConfirmDialog title="Delete Program" message="This program will be permanently deleted." confirmLabel="Delete" destructive onConfirm={() => deleteProgram(confirmDeleteProgramId)} onCancel={() => setConfirmDeleteProgramId(null)} />
      )}
    </div>
  );
}
