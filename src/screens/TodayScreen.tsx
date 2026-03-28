import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise, type SessionSet, type SessionExercise, type ActiveSession } from '../db/database';
import { getSuggestion } from '../utils/progression';
import { sessionE10RM } from '../utils/e10rm';
import { useRestTimer } from '../hooks/useRestTimer';
import { Check, X, ChevronRight, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';

interface ExerciseState {
  exerciseId: number;
  sets: { weight: string; reps: string; isWorkingSet: boolean }[];
  restSeconds: number;
  suggestedWeight: number;
  suggestionReason: string;
  repRange: [number, number];
  numSets: number;
}

export function TodayScreen() {
  const programs = useLiveQuery(() => db.programs.toArray()) ?? [];
  const allExercises = useLiveQuery(() => db.exercises.orderBy('name').toArray()) ?? [];
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [selectedDayLabel, setSelectedDayLabel] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>([]);
  const [exercises, setExercises] = useState<Map<number, Exercise>>(new Map());
  const [workoutName, setWorkoutName] = useState('');
  const [programName, setProgramName] = useState('');
  const [workoutId, setWorkoutId] = useState<number>(0);
  const [startedAt, setStartedAt] = useState('');
  const timer = useRestTimer();
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProgram = programs.find(p => p.id === selectedProgramId) ?? null;

  // Persist active session to IndexedDB (debounced)
  const persistSession = useCallback((states: ExerciseState[]) => {
    if (saveRef.current) clearTimeout(saveRef.current);
    saveRef.current = setTimeout(async () => {
      if (!selectedProgramId || !selectedDayLabel) return;
      const data: Omit<ActiveSession, 'id'> = {
        startedAt: startedAt || new Date().toISOString(),
        programId: selectedProgramId,
        programName,
        dayLabel: selectedDayLabel,
        workoutId,
        workoutName,
        exerciseStates: states.map(s => ({
          exerciseId: s.exerciseId,
          sets: s.sets,
          restSeconds: s.restSeconds,
          suggestedWeight: s.suggestedWeight,
          suggestionReason: s.suggestionReason,
          repRange: s.repRange,
          numSets: s.numSets,
        })),
      };
      await db.activeSession.clear();
      await db.activeSession.add(data);
    }, 500);
  }, [selectedProgramId, selectedDayLabel, startedAt, programName, workoutId, workoutName]);

  // Restore active session on mount
  useEffect(() => {
    (async () => {
      const saved = await db.activeSession.toArray();
      if (saved.length === 0) return;
      const active = saved[0];

      const exIds = active.exerciseStates.map(e => e.exerciseId);
      const exList = await db.exercises.where('id').anyOf(exIds).toArray();
      setExercises(new Map(exList.map(e => [e.id!, e])));

      setSelectedProgramId(active.programId);
      setProgramName(active.programName);
      setSelectedDayLabel(active.dayLabel);
      setWorkoutId(active.workoutId);
      setWorkoutName(active.workoutName);
      setStartedAt(active.startedAt);
      setExerciseStates(active.exerciseStates.map(s => ({
        exerciseId: s.exerciseId,
        sets: s.sets,
        restSeconds: s.restSeconds,
        suggestedWeight: s.suggestedWeight,
        suggestionReason: s.suggestionReason,
        repRange: s.repRange,
        numSets: s.numSets,
      })));
      setSessionActive(true);
    })();
  }, []);

  const loadSession = useCallback(async (programId: number, pName: string, dayLabel: string, wkId: number) => {
    const w = await db.workouts.get(wkId);
    if (!w) return;

    setWorkoutId(w.id!);
    setWorkoutName(w.name);
    setProgramName(pName);

    const exIds = w.exercises.map(e => e.exerciseId);
    const exList = await db.exercises.where('id').anyOf(exIds).toArray();
    setExercises(new Map(exList.map(e => [e.id!, e])));

    const states: ExerciseState[] = [];
    for (const we of w.exercises) {
      const suggestion = await getSuggestion(we.exerciseId, we.repRange[1]);
      states.push({
        exerciseId: we.exerciseId,
        sets: Array.from({ length: we.sets }, () => ({
          weight: suggestion.weight > 0 ? String(suggestion.weight) : '',
          reps: '',
          isWorkingSet: true,
        })),
        restSeconds: we.restSeconds,
        suggestedWeight: suggestion.weight,
        suggestionReason: suggestion.reason,
        repRange: we.repRange,
        numSets: we.sets,
      });
    }

    const now = new Date().toISOString();
    setStartedAt(now);
    setExerciseStates(states);
    setSessionActive(true);

    // Save immediately
    const data: Omit<ActiveSession, 'id'> = {
      startedAt: now,
      programId,
      programName: pName,
      dayLabel,
      workoutId: w.id!,
      workoutName: w.name,
      exerciseStates: states.map(s => ({
        exerciseId: s.exerciseId,
        sets: s.sets,
        restSeconds: s.restSeconds,
        suggestedWeight: s.suggestedWeight,
        suggestionReason: s.suggestionReason,
        repRange: s.repRange,
        numSets: s.numSets,
      })),
    };
    await db.activeSession.clear();
    await db.activeSession.add(data);
  }, []);

  const updateSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setExerciseStates(prev => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: value };
      next[exIdx] = ex;
      persistSession(next);
      return next;
    });
  };

  const toggleWorking = (exIdx: number, setIdx: number) => {
    setExerciseStates(prev => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      ex.sets[setIdx] = { ...ex.sets[setIdx], isWorkingSet: !ex.sets[setIdx].isWorkingSet };
      next[exIdx] = ex;
      persistSession(next);
      return next;
    });
  };

  const moveExercise = (idx: number, direction: -1 | 1) => {
    const target = idx + direction;
    setExerciseStates(prev => {
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      persistSession(next);
      return next;
    });
  };

  const addExerciseToSession = async (exerciseId: number) => {
    const ex = allExercises.find(e => e.id === exerciseId);
    if (!ex) return;
    // Add to the exercise map if not already there
    setExercises(prev => {
      const next = new Map(prev);
      next.set(ex.id!, ex);
      return next;
    });
    const suggestion = await getSuggestion(exerciseId, 12);
    const newState: ExerciseState = {
      exerciseId,
      sets: Array.from({ length: 3 }, () => ({
        weight: suggestion.weight > 0 ? String(suggestion.weight) : '',
        reps: '',
        isWorkingSet: true,
      })),
      restSeconds: ex.defaultRestSeconds,
      suggestedWeight: suggestion.weight,
      suggestionReason: suggestion.reason,
      repRange: [8, 12],
      numSets: 3,
    };
    setExerciseStates(prev => {
      const next = [...prev, newState];
      persistSession(next);
      return next;
    });
    setShowAddExercise(false);
  };

  const removeExerciseFromSession = (idx: number) => {
    setExerciseStates(prev => {
      const next = prev.filter((_, i) => i !== idx);
      persistSession(next);
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setExerciseStates(prev => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      const lastSet = ex.sets[ex.sets.length - 1];
      ex.sets.push({
        weight: lastSet?.weight ?? '',
        reps: '',
        isWorkingSet: true,
      });
      next[exIdx] = ex;
      persistSession(next);
      return next;
    });
  };

  const removeLastSet = (exIdx: number) => {
    setExerciseStates(prev => {
      const next = [...prev];
      const ex = { ...next[exIdx], sets: [...next[exIdx].sets] };
      if (ex.sets.length <= 1) return prev;
      ex.sets.pop();
      next[exIdx] = ex;
      persistSession(next);
      return next;
    });
  };

  const logSet = (restSeconds: number) => {
    timer.start(restSeconds);
  };

  const cancelSession = async () => {
    if (!confirm('Discard this session?')) return;
    await db.activeSession.clear();
    setSessionActive(false);
    setExerciseStates([]);
    setSelectedDayLabel(null);
    timer.clear();
  };

  const completeSession = async () => {
    if (!selectedProgramId || !selectedDayLabel) return;

    const sessionExercises: SessionExercise[] = exerciseStates.map(es => {
      const sets: SessionSet[] = es.sets
        .filter(s => s.weight && s.reps)
        .map(s => ({
          weight: parseFloat(s.weight),
          reps: parseInt(s.reps),
          isWorkingSet: s.isWorkingSet,
        }));
      return {
        exerciseId: es.exerciseId,
        sets,
        e10RM: sessionE10RM(sets),
      };
    });

    await db.sessions.add({
      date: startedAt || new Date().toISOString(),
      programId: selectedProgramId,
      dayLabel: selectedDayLabel,
      workoutId,
      exercises: sessionExercises,
    });

    await db.activeSession.clear();
    setSessionActive(false);
    setExerciseStates([]);
    setSelectedDayLabel(null);
    timer.clear();
  };

  // Live elapsed time in seconds
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    if (!sessionActive || !startedAt) return;
    const start = new Date(startedAt).getTime();
    setElapsedSec(Math.floor((Date.now() - start) / 1000));
    const id = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [sessionActive, startedAt]);

  if (!sessionActive) {
    return (
      <div className="screen">
        <h1>Today</h1>

        {programs.length === 0 ? (
          <div className="empty">
            <p>No programs yet. Create one in the Manage tab.</p>
          </div>
        ) : (
          <>
            <div className="form-group">
              <label>Program</label>
              <select
                value={selectedProgramId ?? ''}
                onChange={e => {
                  setSelectedProgramId(e.target.value ? Number(e.target.value) : null);
                  setSelectedDayLabel(null);
                }}
              >
                <option value="">Select a program...</option>
                {programs.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {selectedProgram && (
              <div>
                <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
                  Which day?
                </label>
                {selectedProgram.days.map(day => (
                  <button
                    key={day.label}
                    className="list-item"
                    onClick={() => {
                      setSelectedDayLabel(day.label);
                      loadSession(selectedProgram.id!, selectedProgram.name, day.label, day.workoutId);
                    }}
                  >
                    <div>
                      <div className="title">{day.label}</div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="row-between mb-sm">
        <div>
          <h1 style={{ marginBottom: 0 }}>{selectedDayLabel}</h1>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {workoutName} &middot; {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')} elapsed
          </div>
        </div>
        <button className="btn btn-sm btn-danger" onClick={cancelSession}>
          <X size={16} /> Cancel
        </button>
      </div>

      {timer.active && (
        <div className="timer-bar">
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Rest Timer</div>
            <div className="timer-display">
              {Math.floor(timer.remaining / 60)}:{String(timer.remaining % 60).padStart(2, '0')}
            </div>
            <div className="timer-progress">
              <div
                className="timer-progress-fill"
                style={{ width: `${((timer.total - timer.remaining) / timer.total) * 100}%` }}
              />
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={timer.clear}>Skip</button>
        </div>
      )}

      {exerciseStates.map((es, exIdx) => {
        const exercise = exercises.get(es.exerciseId);
        if (!exercise) return null;

        const filledSets = es.sets
          .filter(s => s.weight && s.reps && s.isWorkingSet)
          .map(s => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps), isWorkingSet: true }));
        const avgE10rm = sessionE10RM(filledSets);

        return (
          <div className="exercise-card" key={`${es.exerciseId}-${exIdx}`}>
            <div className="exercise-card-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>{exercise.name}</h3>
                  <span className={`badge badge-${es.suggestionReason === 'increase' ? 'green' : es.suggestionReason === 'deload' ? 'red' : 'accent'}`}>
                    {es.suggestionReason === 'increase' ? 'Progress' : es.suggestionReason === 'deload' ? 'Deload' : es.suggestionReason === 'first' ? 'New' : 'Hold'}
                  </span>
                </div>
                <div className="suggestion">
                  {es.repRange[0]}–{es.repRange[1]} reps &middot; {es.numSets} sets
                  {es.suggestedWeight > 0 && (
                    <> &middot; {es.suggestionReason === 'increase' && '↑ '}
                      {es.suggestionReason === 'deload' && '↓ '}
                      {es.suggestedWeight}kg</>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <button
                    className="btn btn-sm"
                    style={{ padding: '2px 4px', minHeight: 0, opacity: exIdx === 0 ? 0.3 : 1 }}
                    onClick={() => moveExercise(exIdx, -1)}
                    disabled={exIdx === 0}
                    aria-label="Move up"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{ padding: '2px 4px', minHeight: 0, opacity: exIdx === exerciseStates.length - 1 ? 0.3 : 1 }}
                    onClick={() => moveExercise(exIdx, 1)}
                    disabled={exIdx === exerciseStates.length - 1}
                    aria-label="Move down"
                  >
                    <ChevronDown size={16} />
                  </button>
                </div>
                <button
                  className="btn btn-sm"
                  style={{ padding: '4px', minHeight: 0, color: 'var(--red)' }}
                  onClick={() => {
                    if (confirm(`Remove ${exercise.name} from this session?`)) {
                      removeExerciseFromSession(exIdx);
                    }
                  }}
                  aria-label="Remove exercise"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="set-labels">
              <span>Set</span>
              <span>kg</span>
              <span>Reps</span>
              <span>W</span>
            </div>

            {es.sets.map((set, setIdx) => (
              <div className="set-row" key={setIdx}>
                <span className="set-num">{setIdx + 1}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="kg"
                  value={set.weight}
                  onChange={e => updateSet(exIdx, setIdx, 'weight', e.target.value)}
                  onBlur={() => {
                    if (set.weight && set.reps) logSet(es.restSeconds);
                  }}
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="reps"
                  value={set.reps}
                  onChange={e => updateSet(exIdx, setIdx, 'reps', e.target.value)}
                  onBlur={() => {
                    if (set.weight && set.reps) logSet(es.restSeconds);
                  }}
                />
                <button
                  className={`working-toggle ${set.isWorkingSet ? 'active' : ''}`}
                  onClick={() => toggleWorking(exIdx, setIdx)}
                  aria-label={set.isWorkingSet ? 'Working set' : 'Warm-up set'}
                >
                  {set.isWorkingSet ? 'W' : 'WU'}
                </button>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                className="btn btn-sm btn-secondary"
                style={{ flex: 1, fontSize: 12, padding: '6px 0', minHeight: 0 }}
                onClick={() => removeLastSet(exIdx)}
                disabled={es.sets.length <= 1}
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

            {avgE10rm > 0 && (
              <div className="e10rm">
                Session e10RM: <span className="value">{avgE10rm.toFixed(1)} kg</span>
              </div>
            )}
          </div>
        );
      })}

      <button className="btn btn-secondary btn-full mt-md" onClick={() => setShowAddExercise(true)}>
        <Plus size={18} /> Add Exercise
      </button>

      <button className="btn btn-primary btn-full mt-sm" onClick={completeSession}>
        <Check size={18} /> Complete Session
      </button>

      {showAddExercise && (
        <div className="modal-overlay" onClick={() => setShowAddExercise(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Add Exercise</h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
              This won't modify the saved workout template.
            </p>
            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {allExercises
                .filter(ex => !exerciseStates.some(es => es.exerciseId === ex.id))
                .map(ex => (
                  <button
                    key={ex.id}
                    className="list-item"
                    onClick={() => addExerciseToSession(ex.id!)}
                  >
                    <div>
                      <div className="title">{ex.name}</div>
                      <div className="subtitle">{ex.muscleGroup}</div>
                    </div>
                    <Plus size={16} color="var(--accent)" />
                  </button>
                ))}
            </div>
            <button className="btn btn-secondary btn-full mt-md" onClick={() => setShowAddExercise(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
