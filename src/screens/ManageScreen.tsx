import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Workout, type WorkoutExercise, type Program, type ProgramDay } from '../db/database';
import { exportData, importData } from '../utils/backup';
import { isDemoMode, enableDemo, disableDemo } from '../db/demo';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { Plus, Trash2, Download, Upload, X, FlaskConical, Camera, Dumbbell } from 'lucide-react';

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
  const filtered = search.trim()
    ? exercises.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.muscleGroup.toLowerCase().includes(search.toLowerCase()) ||
        (e.secondaryMuscleGroup?.toLowerCase().includes(search.toLowerCase()))
      )
    : exercises;
  const groups = [...new Set(filtered.map(e => e.muscleGroup))].sort();
  const viewing = viewingExercise !== null ? exercises.find(e => e.id === viewingExercise) : null;

  if (viewing) {
    return (
      <div>
        <ExerciseDetail
          exerciseId={viewing.id!}
          backLabel="Exercises"
          onBack={closeExercise}
        >
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
        onChange={e => setSearch(e.target.value)}
        placeholder="Search exercises..."
        style={{ marginBottom: 12 }}
      />

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

  const updateWExercise = (idx: number, field: string, value: number) => {
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

  const deleteWorkout = async (id: number) => {
    await db.workouts.delete(id);
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

        <div className="form-group">
          <label>Add Exercise</label>
          <select onChange={e => { addExercise(Number(e.target.value)); e.target.value = ''; }} value="">
            <option value="">Pick an exercise...</option>
            {exercises.map(ex => (
              <option key={ex.id} value={ex.id}>{ex.name}</option>
            ))}
          </select>
        </div>

        {wExercises.map((we, idx) => {
          const ex = exercises.find(e => e.id === we.exerciseId);
          return (
            <div className="card" key={idx}>
              <div className="row-between mb-sm">
                <strong style={{ fontSize: 14 }}>{ex?.name ?? 'Unknown'}</strong>
                <button onClick={() => removeExercise(idx)} style={{ color: 'var(--red)' }}>
                  <Trash2 size={16} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Sets</label>
                  <input type="number" value={we.sets} onChange={e => updateWExercise(idx, 'sets', parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Min</label>
                  <input type="number" value={we.repRange[0]} onChange={e => updateWExercise(idx, 'repMin', parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Max</label>
                  <input type="number" value={we.repRange[1]} onChange={e => updateWExercise(idx, 'repMax', parseInt(e.target.value) || 0)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Rest</label>
                  <input type="number" value={we.restSeconds} onChange={e => updateWExercise(idx, 'restSeconds', parseInt(e.target.value) || 0)} />
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
            <button onClick={e => { e.stopPropagation(); deleteWorkout(w.id!); }} style={{ color: 'var(--red)', padding: 8 }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))
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

  const deleteProgram = async (id: number) => {
    await db.programs.delete(id);
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
              <button onClick={e => { e.stopPropagation(); deleteProgram(p.id!); }} style={{ color: 'var(--red)', padding: 8 }}>
                <Trash2 size={16} />
              </button>
            </div>
          );
        })
      )}
    </div>
  );
}

export function ManageScreen() {
  const [tab, setTab] = useState<Tab>('exercises');
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('This will overwrite all existing data. Continue?')) return;
    try {
      await importData(file);
      alert('Import successful!');
    } catch {
      alert('Import failed — invalid file.');
    }
    if (fileRef.current) fileRef.current.value = '';
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
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </div>
      </div>

      <button
        className={`btn btn-sm btn-full mb-md ${demo ? 'btn-danger' : 'btn-secondary'}`}
        onClick={toggleDemo}
        disabled={demoLoading}
        style={{ fontSize: 13 }}
      >
        <FlaskConical size={14} />
        {demoLoading ? 'Loading...' : demo ? 'Demo Mode ON — tap to clear' : 'Load Demo Data'}
      </button>

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
    </div>
  );
}
