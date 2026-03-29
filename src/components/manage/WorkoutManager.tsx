import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Workout, type WorkoutExercise } from '../../db/database';
import { ConfirmDialog } from '../ConfirmDialog';
import { ExercisePicker } from '../ExercisePicker';
import { Plus, Trash2, X, ChevronUp, ChevronDown } from 'lucide-react';

export function WorkoutManager() {
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray()) ?? [];
  const [editing, setEditing] = useState<Workout | null>(null);
  const [name, setName] = useState('');
  const [wExercises, setWExercises] = useState<WorkoutExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const startNew = () => { setName(''); setWExercises([]); setEditing({ name: '', exercises: [] }); };
  const startEdit = (w: Workout) => { setName(w.name); setWExercises([...w.exercises]); setEditing(w); };

  const addExercise = (exId: number) => {
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    setWExercises(prev => [...prev, { exerciseId: exId, sets: 3, repRange: [8, 12] as [number, number], restSeconds: ex.defaultRestSeconds }]);
  };

  const updateWExercise = (idx: number, field: string, raw: string) => {
    const value = raw === '' ? 0 : parseInt(raw);
    if (isNaN(value)) return;
    setWExercises(prev => {
      const next = [...prev];
      if (field === 'sets') next[idx] = { ...next[idx], sets: value };
      else if (field === 'repMin') next[idx] = { ...next[idx], repRange: [value, next[idx].repRange[1]] };
      else if (field === 'repMax') next[idx] = { ...next[idx], repRange: [next[idx].repRange[0], value] };
      else if (field === 'restSeconds') next[idx] = { ...next[idx], restSeconds: value };
      return next;
    });
  };

  const removeExercise = (idx: number) => { setWExercises(prev => prev.filter((_, i) => i !== idx)); };

  const moveWExercise = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    setWExercises(prev => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const save = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), exercises: wExercises };
    if (editing?.id) { await db.workouts.update(editing.id, data); } else { await db.workouts.add(data); }
    setEditing(null);
  };

  const deleteWorkout = async (id: number) => { await db.workouts.delete(id); setConfirmDeleteId(null); };

  if (editing) {
    return (
      <div>
        <div className="row-between mb-md">
          <h2 style={{ marginBottom: 0 }}>{editing.id ? 'Edit' : 'New'} Workout</h2>
          <button className="btn btn-sm btn-secondary" onClick={() => setEditing(null)}><X size={16} /> Cancel</button>
        </div>
        <div className="form-group">
          <label>Workout Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Upper Body A" />
        </div>
        <button className="btn btn-secondary btn-full mb-md" onClick={() => setShowPicker(true)}>
          <Plus size={16} /> Add Exercise
        </button>
        {showPicker && (
          <ExercisePicker exercises={exercises.filter(ex => !wExercises.some(we => we.exerciseId === ex.id))} suggestBy="recent" onAdd={(id) => { addExercise(id); setShowPicker(false); }} onClose={() => setShowPicker(false)} />
        )}
        {wExercises.map((we, idx) => {
          const ex = exercises.find(e => e.id === we.exerciseId);
          return (
            <div className="card" key={idx}>
              <div className="row-between mb-sm">
                <strong style={{ fontSize: 14 }}>{ex?.name ?? 'Unknown'}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button className="btn btn-sm" style={{ padding: '2px 4px', minHeight: 0, opacity: idx === 0 ? 0.3 : 1 }} onClick={() => moveWExercise(idx, -1)} disabled={idx === 0}><ChevronUp size={14} /></button>
                    <button className="btn btn-sm" style={{ padding: '2px 4px', minHeight: 0, opacity: idx === wExercises.length - 1 ? 0.3 : 1 }} onClick={() => moveWExercise(idx, 1)} disabled={idx === wExercises.length - 1}><ChevronDown size={14} /></button>
                  </div>
                  <button onClick={() => removeExercise(idx)} style={{ color: 'var(--red)', padding: 4 }}><Trash2 size={16} /></button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Sets</label><input type="number" value={we.sets || ''} onChange={e => updateWExercise(idx, 'sets', e.target.value)} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Min</label><input type="number" value={we.repRange[0] || ''} onChange={e => updateWExercise(idx, 'repMin', e.target.value)} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Max</label><input type="number" value={we.repRange[1] || ''} onChange={e => updateWExercise(idx, 'repMax', e.target.value)} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Rest</label><input type="number" value={we.restSeconds || ''} onChange={e => updateWExercise(idx, 'restSeconds', e.target.value)} /></div>
              </div>
            </div>
          );
        })}
        <button className="btn btn-primary btn-full mt-md" onClick={save}>Save Workout</button>
      </div>
    );
  }

  return (
    <div>
      <div className="row-between mb-md">
        <h2 style={{ marginBottom: 0 }}>Workouts</h2>
        <button className="btn btn-sm btn-primary" onClick={startNew}><Plus size={16} /> New</button>
      </div>
      {workouts.length === 0 ? (
        <div className="empty"><p>No workouts yet.</p></div>
      ) : (
        workouts.map(w => (
          <div key={w.id} className="list-item" onClick={() => startEdit(w)}>
            <div><div className="title">{w.name}</div><div className="subtitle">{w.exercises.length} exercises</div></div>
            <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(w.id!); }} style={{ color: 'var(--red)', padding: 8 }}><Trash2 size={16} /></button>
          </div>
        ))
      )}
      {confirmDeleteId !== null && (
        <ConfirmDialog title="Delete Workout" message="This workout will be permanently deleted." confirmLabel="Delete" destructive onConfirm={() => deleteWorkout(confirmDeleteId)} onCancel={() => setConfirmDeleteId(null)} />
      )}
    </div>
  );
}
