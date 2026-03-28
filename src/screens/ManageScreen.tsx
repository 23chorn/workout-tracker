import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Workout, type WorkoutExercise, type Program, type ProgramDay } from '../db/database';
import { exportData, importData } from '../utils/backup';
import { isDemoMode, enableDemo, disableDemo } from '../db/demo';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { Plus, Trash2, Download, Upload, X, FlaskConical, Camera, Dumbbell, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExercisePicker } from '../components/ExercisePicker';

type Tab = 'exercises' | 'workouts' | 'programs';

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height *= maxSize / width; width = maxSize; }
        } else {
          if (height > maxSize) { width *= maxSize / height; height = maxSize; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function ExerciseManager() {
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray()) ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [secondaryMuscleGroup, setSecondaryMuscleGroup] = useState('');
  const [rest, setRest] = useState('90');
  const [viewingExercise, setViewingExercise] = useState<number | null>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef(0);

  const openExercise = (id: number) => {
    const screenEl = document.querySelector('.screen');
    scrollRef.current = screenEl?.scrollTop ?? 0;
    setViewingExercise(id);
  };

  const closeExercise = () => {
    setViewingExercise(null);
    requestAnimationFrame(() => {
      const screenEl = document.querySelector('.screen');
      if (screenEl) screenEl.scrollTop = scrollRef.current;
    });
  };

  const addExercise = async () => {
    if (!name.trim()) return;
    await db.exercises.add({
      name: name.trim(),
      muscleGroup: muscleGroup.trim(),
      secondaryMuscleGroup: secondaryMuscleGroup.trim() || undefined,
      defaultRestSeconds: parseInt(rest) || 90,
    });
    setName(''); setMuscleGroup(''); setSecondaryMuscleGroup(''); setRest('90'); setShowAdd(false);
  };

  const handlePhoto = async (exId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImage(file, 400);
    await db.exercises.update(exId, { imageUrl: dataUrl });
  };

  const removePhoto = async (exId: number) => {
    await db.exercises.update(exId, { imageUrl: undefined });
  };

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<string | null>(null);
  const allMuscleGroups = [...new Set(exercises.flatMap(e => [e.muscleGroup, ...(e.secondaryMuscleGroup ? [e.secondaryMuscleGroup] : [])]))].sort();

  const filtered = (() => {
    let list = exercises;
    if (muscleFilter) {
      list = list.filter(e => e.muscleGroup === muscleFilter || e.secondaryMuscleGroup === muscleFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.toLowerCase().includes(q) ||
        (e.secondaryMuscleGroup?.toLowerCase().includes(q))
      );
    }
    return list;
  })();
  const groups = [...new Set(filtered.map(e => e.muscleGroup))].sort();
  const [editingFields, setEditingFields] = useState(false);
  const [showDeleteExercise, setShowDeleteExercise] = useState(false);

  const deleteExercise = async (id: number) => {
    await db.exercises.delete(id);
    setShowDeleteExercise(false);
    closeExercise();
  };
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [editSecondary, setEditSecondary] = useState('');
  const [editRest, setEditRest] = useState('');

  const viewing = viewingExercise !== null ? exercises.find(e => e.id === viewingExercise) : null;

  const startEditing = () => {
    if (!viewing) return;
    setEditName(viewing.name);
    setEditMuscle(viewing.muscleGroup);
    setEditSecondary(viewing.secondaryMuscleGroup ?? '');
    setEditRest(String(viewing.defaultRestSeconds));
    setEditingFields(true);
  };

  const saveEditing = async () => {
    if (!viewing || !editName.trim()) return;
    await db.exercises.update(viewing.id!, {
      name: editName.trim(),
      muscleGroup: editMuscle.trim(),
      secondaryMuscleGroup: editSecondary.trim() || undefined,
      defaultRestSeconds: parseInt(editRest) || 90,
    });
    setEditingFields(false);
  };

  if (viewing) {
    return (
      <div>
        <ExerciseDetail
          exerciseId={viewing.id!}
          backLabel="Exercises"
          onBack={() => { closeExercise(); setEditingFields(false); }}
        >
          {editingFields ? (
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label>Name</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Primary Muscle Group</label>
                <input value={editMuscle} onChange={e => setEditMuscle(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Secondary Muscle Group</label>
                <input value={editSecondary} onChange={e => setEditSecondary(e.target.value)} placeholder="Optional" />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Default Rest (seconds)</label>
                <input type="number" value={editRest} onChange={e => setEditRest(e.target.value)} />
              </div>
              <div className="modal-actions" style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={() => setEditingFields(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEditing}>Save</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary btn-full mb-md" onClick={startEditing}>
              Edit Details
            </button>
          )}

          {viewing.imageUrl ? (
            <div style={{ marginBottom: 16 }}>
              <img
                src={viewing.imageUrl}
                alt={viewing.name}
                style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => {
                  photoRef.current?.click();
                }}>
                  <Camera size={14} /> Replace Photo
                </button>
                <button className="btn btn-sm btn-danger" style={{ flex: 1 }} onClick={() => removePhoto(viewing.id!)}>
                  <Trash2 size={14} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-secondary btn-full mb-md"
              onClick={() => photoRef.current?.click()}
            >
              <Camera size={16} /> Add Photo
            </button>
          )}
          <input
            ref={photoRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handlePhoto(viewing.id!, e)}
            style={{ display: 'none' }}
          />
        </ExerciseDetail>
        <button
          className="btn btn-danger btn-full"
          style={{ marginTop: 24 }}
          onClick={() => setShowDeleteExercise(true)}
        >
          <Trash2 size={14} /> Delete Exercise
        </button>
        {showDeleteExercise && (
          <ConfirmDialog
            title="Delete Exercise"
            message={`Delete "${viewing.name}"? This won't remove it from existing sessions but it will be removed from the library and any workout templates.`}
            confirmLabel="Delete"
            destructive
            onConfirm={() => deleteExercise(viewing.id!)}
            onCancel={() => setShowDeleteExercise(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="row-between mb-md">
        <h2 style={{ marginBottom: 0 }}>Exercises ({exercises.length})</h2>
        <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={16} /> Add
        </button>
      </div>

      <input
        value={search}
        onChange={e => { setSearch(e.target.value); if (e.target.value) setMuscleFilter(null); }}
        placeholder="Search exercises..."
        style={{ marginBottom: 8 }}
      />

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {allMuscleGroups.map(mg => (
          <button
            key={mg}
            onClick={() => { setMuscleFilter(muscleFilter === mg ? null : mg); setSearch(''); }}
            style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
              border: '1px solid var(--border)',
              background: muscleFilter === mg ? 'var(--accent)' : 'var(--bg-input)',
              color: muscleFilter === mg ? 'white' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            {mg}
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Exercise</h2>
            <div className="form-group">
              <label>Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Barbell Row" />
            </div>
            <div className="form-group">
              <label>Primary Muscle Group</label>
              <input value={muscleGroup} onChange={e => setMuscleGroup(e.target.value)} placeholder="e.g. Back" />
            </div>
            <div className="form-group">
              <label>Secondary Muscle Group (optional)</label>
              <input value={secondaryMuscleGroup} onChange={e => setSecondaryMuscleGroup(e.target.value)} placeholder="e.g. Biceps" />
            </div>
            <div className="form-group">
              <label>Default Rest (seconds)</label>
              <input type="number" value={rest} onChange={e => setRest(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addExercise}>Add</button>
            </div>
          </div>
        </div>
      )}

      {groups.map(group => (
        <div key={group} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            {group}
          </div>
          {filtered.filter(e => e.muscleGroup === group).map(ex => (
            <button key={ex.id} className="list-item" style={{ width: '100%', justifyContent: 'flex-start', gap: 10 }} onClick={() => openExercise(ex.id!)}>
                {ex.imageUrl ? (
                  <img src={ex.imageUrl} alt="" style={{
                    width: 36, height: 36, borderRadius: 6, objectFit: 'cover',
                    border: '1px solid var(--border)', flexShrink: 0,
                  }} />
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: 6, background: 'var(--bg-input)',
                    border: '1px solid var(--border)', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Dumbbell size={14} color="var(--text-muted)" />
                  </div>
                )}
                <div style={{ textAlign: 'left' }}>
                  <div className="title">{ex.name}</div>
                  <div className="subtitle">
                    {ex.muscleGroup}{ex.secondaryMuscleGroup && ` / ${ex.secondaryMuscleGroup}`} &middot; {ex.defaultRestSeconds}s
                  </div>
                </div>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

function WorkoutManager() {
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray()) ?? [];
  const [editing, setEditing] = useState<Workout | null>(null);
  const [name, setName] = useState('');
  const [wExercises, setWExercises] = useState<WorkoutExercise[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const startNew = () => {
    setName('');
    setWExercises([]);
    setEditing({ name: '', exercises: [] });
  };

  const startEdit = (w: Workout) => {
    setName(w.name);
    setWExercises([...w.exercises]);
    setEditing(w);
  };

  const addExercise = (exId: number) => {
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    setWExercises(prev => [...prev, {
      exerciseId: exId,
      sets: 3,
      repRange: [8, 12] as [number, number],
      restSeconds: ex.defaultRestSeconds,
    }]);
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

  const removeExercise = (idx: number) => {
    setWExercises(prev => prev.filter((_, i) => i !== idx));
  };

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
    if (editing?.id) {
      await db.workouts.update(editing.id, data);
    } else {
      await db.workouts.add(data);
    }
    setEditing(null);
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const deleteWorkout = async (id: number) => {
    await db.workouts.delete(id);
    setConfirmDeleteId(null);
  };

  if (editing) {
    return (
      <div>
        <div className="row-between mb-md">
          <h2 style={{ marginBottom: 0 }}>{editing.id ? 'Edit' : 'New'} Workout</h2>
          <button className="btn btn-sm btn-secondary" onClick={() => setEditing(null)}>
            <X size={16} /> Cancel
          </button>
        </div>

        <div className="form-group">
          <label>Workout Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Upper Body A" />
        </div>

        <button className="btn btn-secondary btn-full mb-md" onClick={() => setShowPicker(true)}>
          <Plus size={16} /> Add Exercise
        </button>

        {showPicker && (
          <ExercisePicker
            exercises={exercises.filter(ex => !wExercises.some(we => we.exerciseId === ex.id))}
            suggestBy="recent"
            onAdd={(id) => { addExercise(id); setShowPicker(false); }}
            onClose={() => setShowPicker(false)}
          />
        )}

        {wExercises.map((we, idx) => {
          const ex = exercises.find(e => e.id === we.exerciseId);
          return (
            <div className="card" key={idx}>
              <div className="row-between mb-sm">
                <strong style={{ fontSize: 14 }}>{ex?.name ?? 'Unknown'}</strong>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '2px 4px', minHeight: 0, opacity: idx === 0 ? 0.3 : 1 }}
                      onClick={() => moveWExercise(idx, -1)}
                      disabled={idx === 0}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="btn btn-sm"
                      style={{ padding: '2px 4px', minHeight: 0, opacity: idx === wExercises.length - 1 ? 0.3 : 1 }}
                      onClick={() => moveWExercise(idx, 1)}
                      disabled={idx === wExercises.length - 1}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                  <button onClick={() => removeExercise(idx)} style={{ color: 'var(--red)', padding: 4 }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Sets</label>
                  <input type="number" value={we.sets || ''} onChange={e => updateWExercise(idx, 'sets', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Min</label>
                  <input type="number" value={we.repRange[0] || ''} onChange={e => updateWExercise(idx, 'repMin', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Max</label>
                  <input type="number" value={we.repRange[1] || ''} onChange={e => updateWExercise(idx, 'repMax', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Rest</label>
                  <input type="number" value={we.restSeconds || ''} onChange={e => updateWExercise(idx, 'restSeconds', e.target.value)} />
                </div>
              </div>
            </div>
          );
        })}

        <button className="btn btn-primary btn-full mt-md" onClick={save}>
          Save Workout
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="row-between mb-md">
        <h2 style={{ marginBottom: 0 }}>Workouts</h2>
        <button className="btn btn-sm btn-primary" onClick={startNew}>
          <Plus size={16} /> New
        </button>
      </div>

      {workouts.length === 0 ? (
        <div className="empty"><p>No workouts yet.</p></div>
      ) : (
        workouts.map(w => (
          <div key={w.id} className="list-item" onClick={() => startEdit(w)}>
            <div>
              <div className="title">{w.name}</div>
              <div className="subtitle">{w.exercises.length} exercises</div>
            </div>
            <button onClick={e => { e.stopPropagation(); setConfirmDeleteId(w.id!); }} style={{ color: 'var(--red)', padding: 8 }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}

      {confirmDeleteId !== null && (
        <ConfirmDialog
          title="Delete Workout"
          message="This workout will be permanently deleted."
          confirmLabel="Delete"
          destructive
          onConfirm={() => deleteWorkout(confirmDeleteId)}
          onCancel={() => setConfirmDeleteId(null)}
        />
      )}
    </div>
  );
}

function ProgramManager() {
  const programs = useLiveQuery(() => db.programs.toArray()) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const [editing, setEditing] = useState<Program | null>(null);
  const [name, setName] = useState('');
  const [defaultProgramId, setDefaultProgramId] = useState<number | null>(() => {
    const stored = localStorage.getItem('lift-default-program');
    return stored ? Number(stored) : null;
  });

  const setAsDefault = (id: number) => {
    localStorage.setItem('lift-default-program', String(id));
    setDefaultProgramId(id);
  };
  const [days, setDays] = useState<ProgramDay[]>([]);

  const startNew = () => {
    setName('');
    setDays([]);
    setEditing({ name: '', days: [] });
  };

  const startEdit = (p: Program) => {
    setName(p.name);
    setDays([...p.days]);
    setEditing(p);
  };

  const addDay = () => {
    setDays(prev => [...prev, { label: '', workoutId: workouts[0]?.id ?? 0 }]);
  };

  const updateDayWorkout = (idx: number, workoutId: number) => {
    setDays(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], workoutId };
      return next;
    });
  };

  const removeDay = (idx: number) => {
    setDays(prev => prev.filter((_, i) => i !== idx));
  };

  const save = async () => {
    if (!name.trim()) return;
    // Auto-derive day labels from workout names
    const resolvedDays = days.map((d, i) => {
      const wk = workouts.find(w => w.id === d.workoutId);
      return { ...d, label: wk?.name ?? `Day ${i + 1}` };
    });
    const data = { name: name.trim(), days: resolvedDays };
    if (editing?.id) {
      await db.programs.update(editing.id, data);
    } else {
      await db.programs.add(data);
    }
    setEditing(null);
  };

  const [confirmDeleteProgramId, setConfirmDeleteProgramId] = useState<number | null>(null);

  const deleteProgram = async (id: number) => {
    await db.programs.delete(id);
    setConfirmDeleteProgramId(null);
  };

  if (editing) {
    return (
      <div>
        <div className="row-between mb-md">
          <h2 style={{ marginBottom: 0 }}>{editing.id ? 'Edit' : 'New'} Program</h2>
          <button className="btn btn-sm btn-secondary" onClick={() => setEditing(null)}>
            <X size={16} /> Cancel
          </button>
        </div>

        <div className="form-group">
          <label>Program Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Push Pull Legs" />
        </div>

        {days.map((day, idx) => (
          <div className="card" key={idx}>
            <div className="row-between mb-sm">
              <strong style={{ fontSize: 14 }}>Day {idx + 1}</strong>
              <button onClick={() => removeDay(idx)} style={{ color: 'var(--red)' }}>
                <Trash2 size={16} />
              </button>
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Workout</label>
              <select value={day.workoutId} onChange={e => updateDayWorkout(idx, Number(e.target.value))}>
                <option value={0}>Select workout...</option>
                {workouts.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        <button className="btn btn-secondary btn-full mb-md" onClick={addDay}>
          <Plus size={16} /> Add Day
        </button>

        <button className="btn btn-primary btn-full" onClick={save}>
          Save Program
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="row-between mb-md">
        <h2 style={{ marginBottom: 0 }}>Programs</h2>
        <button className="btn btn-sm btn-primary" onClick={startNew}>
          <Plus size={16} /> New
        </button>
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
                  {!isDefault && (
                    <> &middot; <span
                      style={{ color: 'var(--accent)', cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); setAsDefault(p.id!); }}
                    >Set as default</span></>
                  )}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); setConfirmDeleteProgramId(p.id!); }} style={{ color: 'var(--red)', padding: 8 }}>
                <Trash2 size={16} />
              </button>
            </div>
          );
        })
      )}

      {confirmDeleteProgramId !== null && (
        <ConfirmDialog
          title="Delete Program"
          message="This program will be permanently deleted."
          confirmLabel="Delete"
          destructive
          onConfirm={() => deleteProgram(confirmDeleteProgramId)}
          onCancel={() => setConfirmDeleteProgramId(null)}
        />
      )}
    </div>
  );
}

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

function HelpSection({ demo, demoLoading, onToggleDemo }: {
  demo: boolean;
  demoLoading: boolean;
  onToggleDemo: () => void;
}) {
  return (
    <div>
      <h2>Progression Badges</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        Each exercise in your workout shows a badge indicating what the progression logic suggests.
      </p>

      <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span className="badge badge-green" style={{ flexShrink: 0, marginTop: 2, width: 64, textAlign: 'center' }}>Progress</span>
        <div style={{ fontSize: 13 }}>
          <strong>Increase weight</strong>
          <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            All working sets hit the top of the rep range last session. Suggests +2.5kg.
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span className="badge badge-accent" style={{ flexShrink: 0, marginTop: 2, width: 64, textAlign: 'center' }}>Hold</span>
        <div style={{ fontSize: 13 }}>
          <strong>Stay at current weight</strong>
          <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            Reps were within range but not all sets hit the top. Keep pushing at this weight.
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span className="badge badge-red" style={{ flexShrink: 0, marginTop: 2, width: 64, textAlign: 'center' }}>Deload</span>
        <div style={{ fontSize: 13 }}>
          <strong>Reduce weight by 10%</strong>
          <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            Reps were missed for two consecutive sessions. Suggests dropping to 90% of current weight to rebuild.
          </div>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <span className="badge badge-accent" style={{ flexShrink: 0, marginTop: 2, width: 64, textAlign: 'center' }}>New</span>
        <div style={{ fontSize: 13 }}>
          <strong>No previous data</strong>
          <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
            First time doing this exercise. No suggestion — pick a starting weight.
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Set Confirmation</h2>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
        The tick button next to each set has three states:
      </p>

      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={14} color="var(--text-muted)" />
            </div>
            <div style={{ fontSize: 13 }}><strong>Empty</strong> — enter weight and reps first</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={14} color="white" />
            </div>
            <div style={{ fontSize: 13 }}><strong>Ready</strong> — tap to confirm and start rest timer</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Check size={14} color="white" />
            </div>
            <div style={{ fontSize: 13 }}><strong>Confirmed</strong> — set is logged</div>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>Working Sets vs Warm-ups</h2>
      <div className="card">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 600, color: 'white' }}>
              W
            </div>
            <div style={{ fontSize: 13 }}><strong>Working set</strong> — counts toward e10RM and progression</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--bg-input)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>
              WU
            </div>
            <div style={{ fontSize: 13 }}><strong>Warm-up</strong> — logged but excluded from calculations</div>
          </div>
        </div>
      </div>

      <h2 style={{ marginTop: 24 }}>e10RM</h2>
      <div className="card">
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          <strong>Estimated 10-rep max</strong> — a normalised strength metric that lets you compare performance across different weight/rep combinations.
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.6 }}>
          Per set: weight x (1 + reps / 30) / 1.333
        </p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.6 }}>
          Session average: mean of all working sets for that exercise. Plotted over time in the exercise detail view. PB flagged when session average beats your all-time best.
        </p>
      </div>

      <h2 style={{ marginTop: 24 }}>Data</h2>
      <div className="card">
        <p style={{ fontSize: 13, lineHeight: 1.6 }}>
          All data is stored locally on your device in the browser. Nothing is sent to a server. Use the export/import buttons at the top of this screen to back up your data as a JSON file.
        </p>
      </div>

      <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 16 }}>Demo Mode</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          Load sample data to explore the app. Your real data is kept separate and unaffected.
        </p>
        <button
          className={`btn btn-full mb-md ${demo ? 'btn-danger' : 'btn-secondary'}`}
          onClick={onToggleDemo}
          disabled={demoLoading}
          style={{ fontSize: 13 }}
        >
          <FlaskConical size={14} />
          {demoLoading ? 'Loading...' : demo ? 'Demo Mode ON — tap to disable' : 'Enable Demo Mode'}
        </button>
      </div>

      <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid var(--border)' }}>
        <h2 style={{ color: 'var(--red)', fontSize: 16 }}>Danger Zone</h2>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
          This cannot be undone. Export your data first if you want a backup.
        </p>
        <DeleteAllButton />
      </div>
    </div>
  );
}

export function ManageScreen() {
  const [tab, setTab] = useState<Tab>('exercises');
  const [showHelp, setShowHelp] = useState(false);
  const [demo, setDemo] = useState(isDemoMode);
  const [demoLoading, setDemoLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleDemo = async () => {
    setDemoLoading(true);
    try {
      if (demo) {
        await disableDemo();
        setDemo(false);
      } else {
        await enableDemo();
        setDemo(true);
      }
    } finally {
      setDemoLoading(false);
    }
  };

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSuccess, setImportSuccess] = useState<boolean | null>(null);

  const handleImportSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    try {
      await importData(importFile);
      setImportSuccess(true);
    } catch {
      setImportSuccess(false);
    }
    setImportFile(null);
  };

  return (
    <div className="screen">
      <div className="row-between mb-md">
        <h1 style={{ marginBottom: 0 }}>Manage</h1>
        <div className="row gap-sm">
          <button className="btn btn-sm btn-secondary" onClick={exportData}>
            <Download size={14} />
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => fileRef.current?.click()}>
            <Upload size={14} />
          </button>
          <button className="btn btn-sm btn-secondary" onClick={() => setShowHelp(true)}
            style={{ fontWeight: 700, fontSize: 16, width: 36, padding: 0 }}
          >
            ?
          </button>
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
              <button className="btn btn-sm btn-secondary" onClick={() => setShowHelp(false)}>
                <X size={14} />
              </button>
            </div>
            <HelpSection demo={demo} demoLoading={demoLoading} onToggleDemo={toggleDemo} />
          </div>
        </div>
      )}

      {importFile && (
        <ConfirmDialog
          title="Import Data"
          message="This will overwrite all existing data. Are you sure?"
          confirmLabel="Import"
          destructive
          onConfirm={handleImportConfirm}
          onCancel={() => setImportFile(null)}
        />
      )}

      {importSuccess !== null && (
        <div className="modal-overlay" onClick={() => setImportSuccess(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
            <h2>{importSuccess ? 'Import Successful' : 'Import Failed'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              {importSuccess ? 'All data has been restored.' : 'The file could not be read.'}
            </p>
            <button className="btn btn-primary btn-full" onClick={() => setImportSuccess(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
