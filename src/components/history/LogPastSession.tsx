import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Program, type Workout, type Exercise, type SessionExercise } from '../../db/database';
import { sessionE10RM } from '../../utils/e10rm';
import { ScrollPicker, weightValues, dumbbellWeightValues, repValues } from '../ScrollPicker';
import { ExercisePicker } from '../ExercisePicker';
import { ChevronLeft, ChevronUp, ChevronDown, Trash2, Plus, Calendar } from 'lucide-react';

const WEIGHTS = weightValues();
const DB_WEIGHTS = dumbbellWeightValues();
const REPS = repValues();

interface SetInput {
  weight: string;
  reps: string;
  isWorkingSet: boolean;
}

interface ExerciseEntry {
  exerciseId: number;
  exercise: Exercise;
  sets: SetInput[];
}

export function LogPastSession({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const programs = useLiveQuery(() => db.programs.toArray()) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const allExercises = useLiveQuery(() => db.exercises.toArray()) ?? [];

  const [step, setStep] = useState<'select' | 'fill'>('select');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState('');
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [duration, setDuration] = useState('');
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);
  const [picker, setPicker] = useState<{ exIdx: number; setIdx: number; field: 'weight' | 'reps' } | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);

  const exMap = new Map(allExercises.map(e => [e.id!, e]));

  useEffect(() => {
    if (!selectedWorkout) return;
    setEntries(selectedWorkout.exercises.map(we => ({
      exerciseId: we.exerciseId,
      exercise: exMap.get(we.exerciseId)!,
      sets: Array.from({ length: we.sets }, () => ({ weight: '', reps: '', isWorkingSet: true })),
    })).filter(e => e.exercise));
  }, [selectedWorkout]);

  const selectDay = (program: Program, dayLabel: string, workoutId: number) => {
    const wk = workouts.find(w => w.id === workoutId);
    if (!wk) return;
    setSelectedProgram(program);
    setSelectedDayLabel(dayLabel);
    setSelectedWorkout(wk);
    setStep('fill');
  };

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setEntries(prev => prev.map((e, i) => i !== exIdx ? e : {
      ...e,
      sets: e.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
    }));
  };

  const addSet = (exIdx: number) => {
    setEntries(prev => prev.map((e, i) => i !== exIdx ? e : {
      ...e,
      sets: [...e.sets, { weight: '', reps: '', isWorkingSet: true }],
    }));
  };

  const removeLastSet = (exIdx: number) => {
    setEntries(prev => prev.map((e, i) => i !== exIdx ? e : {
      ...e,
      sets: e.sets.length > 1 ? e.sets.slice(0, -1) : e.sets,
    }));
  };

  const removeExercise = (exIdx: number) => {
    setEntries(prev => prev.filter((_, i) => i !== exIdx));
  };

  const moveExercise = (exIdx: number, direction: -1 | 1) => {
    const target = exIdx + direction;
    if (target < 0 || target >= entries.length) return;
    setEntries(prev => {
      const next = [...prev];
      [next[exIdx], next[target]] = [next[target], next[exIdx]];
      return next;
    });
  };

  const addExercise = (exerciseId: number) => {
    const exercise = exMap.get(exerciseId);
    if (!exercise) return;
    setEntries(prev => [...prev, {
      exerciseId,
      exercise,
      sets: [{ weight: '', reps: '', isWorkingSet: true }, { weight: '', reps: '', isWorkingSet: true }, { weight: '', reps: '', isWorkingSet: true }],
    }]);
    setShowAddExercise(false);
  };

  const save = async () => {
    if (!selectedProgram || !selectedWorkout) return;

    const exercises: SessionExercise[] = entries.map(e => {
      const sets = e.sets
        .filter(s => s.weight && s.reps)
        .map(s => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps), isWorkingSet: s.isWorkingSet }));
      return {
        exerciseId: e.exerciseId,
        sets,
        e10RM: sessionE10RM(sets),
      };
    }).filter(e => e.sets.length > 0);

    if (exercises.length === 0) return;

    await db.sessions.add({
      date: new Date(date + 'T12:00:00').toISOString(),
      durationMinutes: duration ? parseInt(duration) : undefined,
      programId: selectedProgram.id!,
      dayLabel: selectedDayLabel,
      workoutId: selectedWorkout.id!,
      exercises,
    });

    onSaved();
  };

  if (step === 'select') {
    return (
      <div className="screen">
        <button className="btn btn-sm btn-secondary mb-md" onClick={onBack}>
          <ChevronLeft size={16} /> Back
        </button>
        <h1 style={{ marginBottom: 4 }}>Log Past Session</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>Select which workout you did</p>

        <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4, display: 'block' }}>Date</label>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
            borderRadius: 'var(--radius)', background: 'var(--bg-input)', border: '1px solid var(--border)',
          }}>
            <Calendar size={18} color="var(--accent)" />
            <span style={{ fontSize: 16, color: 'var(--text)', fontWeight: 500 }}>
              {new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            style={{
              position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer',
            }}
          />
        </div>

        {programs.length === 0 ? (
          <div className="empty"><p>No programs created yet.</p></div>
        ) : (
          programs.map(p => (
            <div key={p.id} className="card" style={{ marginBottom: 12 }}>
              <div className="title" style={{ marginBottom: 8 }}>{p.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.days.map(d => {
                  const wk = workouts.find(w => w.id === d.workoutId);
                  return (
                    <button
                      key={d.label}
                      className="btn btn-secondary"
                      style={{ textAlign: 'left', justifyContent: 'flex-start' }}
                      onClick={() => selectDay(p, d.label, d.workoutId)}
                    >
                      {d.label} — {wk?.name ?? 'Unknown'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      <button className="btn btn-sm btn-secondary mb-md" onClick={() => setStep('select')}>
        <ChevronLeft size={16} /> Back
      </button>
      <h1 style={{ marginBottom: 4 }}>{selectedDayLabel}</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 4 }}>
        {selectedWorkout?.name} — {new Date(date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>

      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Duration (minutes)</label>
        <input
          type="number"
          inputMode="numeric"
          value={duration}
          onChange={e => setDuration(e.target.value)}
          placeholder="Optional"
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 'var(--radius)',
            background: 'var(--bg-input)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: 14, marginTop: 4,
          }}
        />
      </div>

      {entries.map((entry, exIdx) => (
        <div key={`${entry.exerciseId}-${exIdx}`} className="card" style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="title">{entry.exercise.name}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button
                className="btn btn-sm btn-secondary"
                style={{ padding: '4px 6px', minHeight: 0 }}
                onClick={() => moveExercise(exIdx, -1)}
                disabled={exIdx === 0}
              >
                <ChevronUp size={14} />
              </button>
              <button
                className="btn btn-sm btn-secondary"
                style={{ padding: '4px 6px', minHeight: 0 }}
                onClick={() => moveExercise(exIdx, 1)}
                disabled={exIdx === entries.length - 1}
              >
                <ChevronDown size={14} />
              </button>
              <button
                className="btn btn-sm btn-secondary"
                style={{ padding: '4px 6px', minHeight: 0, color: 'var(--red)' }}
                onClick={() => removeExercise(exIdx)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr', gap: 6 }}>
            <div />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Weight</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', textAlign: 'center' }}>Reps</div>
          </div>
          {entry.sets.map((set, setIdx) => (
            <div key={setIdx} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr', gap: 6, marginTop: 4 }}>
              <span className="set-num" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{setIdx + 1}</span>
              <button
                className="picker-input"
                onClick={() => setPicker({ exIdx, setIdx, field: 'weight' })}
              >
                {set.weight ? <span>{set.weight}</span> : <span className="placeholder">kg</span>}
              </button>
              <button
                className="picker-input"
                onClick={() => setPicker({ exIdx, setIdx, field: 'reps' })}
              >
                {set.reps ? <span>{set.reps}</span> : <span className="placeholder">reps</span>}
              </button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              className="btn btn-sm btn-secondary"
              style={{ flex: 1, fontSize: 12, padding: '6px 0', minHeight: 0 }}
              onClick={() => removeLastSet(exIdx)}
              disabled={entry.sets.length <= 1}
            >
              − Remove Set
            </button>
            <button
              className="btn btn-sm btn-secondary"
              style={{ flex: 1, fontSize: 12, padding: '6px 0', minHeight: 0 }}
              onClick={() => addSet(exIdx)}
            >
              + Add Set
            </button>
          </div>
        </div>
      ))}

      <button
        className="btn btn-secondary"
        style={{ width: '100%', marginBottom: 12 }}
        onClick={() => setShowAddExercise(true)}
      >
        <Plus size={16} style={{ marginRight: 6 }} /> Add Exercise
      </button>

      <button
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: 24 }}
        onClick={save}
        disabled={entries.length === 0 || entries.every(e => e.sets.every(s => !s.weight || !s.reps))}
      >
        Save Session
      </button>

      {picker && (
        <ScrollPicker
          label={picker.field === 'weight' ? 'Weight (kg)' : 'Reps'}
          values={picker.field === 'weight'
            ? (entries[picker.exIdx]?.exercise.category === 'dumbbell' ? DB_WEIGHTS : WEIGHTS)
            : REPS}
          value={(() => {
            const entry = entries[picker.exIdx];
            const set = entry?.sets[picker.setIdx];
            if (picker.field === 'weight') {
              return set?.weight || '20';
            }
            return set?.reps || '10';
          })()}
          suffix={picker.field === 'weight' ? 'kg' : undefined}
          onChange={(val) => updateSet(picker.exIdx, picker.setIdx, picker.field, val)}
          onClose={() => setPicker(null)}
        />
      )}

      {showAddExercise && (
        <ExercisePicker
          exercises={allExercises.filter(ex => !entries.some(e => e.exerciseId === ex.id))}
          suggestBy={{ muscleGroups: new Set(
            entries.flatMap(e => {
              const ex = e.exercise;
              return ex ? [ex.muscleGroup, ...(ex.secondaryMuscleGroup ? [ex.secondaryMuscleGroup] : [])] : [];
            })
          )}}
          onAdd={addExercise}
          onClose={() => setShowAddExercise(false)}
        />
      )}
    </div>
  );
}
