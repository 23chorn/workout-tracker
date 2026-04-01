import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise, type SessionSet, type SessionExercise, type ActiveSession } from '../db/database';
import { getSuggestion } from '../utils/progression';
import { calcE10RM, sessionE10RM } from '../utils/e10rm';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { useRestTimer } from '../hooks/useRestTimer';
import { Check, ChevronRight, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExercisePicker } from '../components/ExercisePicker';
import { SessionSummary, type SessionSummaryData } from '../components/SessionSummary';
import { ScrollPicker, weightValues, dumbbellWeightValues, repValues } from '../components/ScrollPicker';

interface ExerciseState {
  exerciseId: number;
  sets: { weight: string; reps: string; isWorkingSet: boolean }[];
  restSeconds: number;
  suggestedWeight: number;
  suggestionReason: string;
  repRange: [number, number];
  numSets: number;
  lastSession?: { weight: number; reps: number[] };
}

export function TodayScreen() {
  const programs = useLiveQuery(() => db.programs.toArray()) ?? [];
  const allExercises = useLiveQuery(() => db.exercises.orderBy('name').toArray()) ?? [];
  const allWorkouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const workoutMap = new Map(allWorkouts.map(w => [w.id!, w]));
  const exerciseMap = new Map(allExercises.map(e => [e.id!, e]));

  const getDefaultProgramId = (): number | null => {
    const stored = localStorage.getItem('lift-default-program');
    if (stored) return Number(stored);
    return null;
  };
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(getDefaultProgramId);
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [viewingExerciseId, setViewingExerciseId] = useState<number | null>(null);
  const [confirmedSets, setConfirmedSets] = useState<Set<string>>(new Set());
  const [collapsedExercises, setCollapsedExercises] = useState<Set<number>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  const [picker, setPicker] = useState<{ exIdx: number; setIdx: number; field: 'weight' | 'reps' } | null>(null);

  const WEIGHTS = weightValues();
  const DB_WEIGHTS = dumbbellWeightValues();
  const REPS = repValues();
  const [summary, setSummary] = useState<SessionSummaryData | null>(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  // Auto-select default program when programs load
  useEffect(() => {
    if (sessionActive || programs.length === 0 || selectedProgramId !== null) return;
    const defaultId = getDefaultProgramId();
    if (defaultId && programs.some(p => p.id === defaultId)) {
      setSelectedProgramId(defaultId);
    } else if (programs[0]?.id) {
      setSelectedProgramId(programs[0].id);
      localStorage.setItem('lift-default-program', String(programs[0].id));
    }
  }, [programs, sessionActive, selectedProgramId]);
  const [exerciseStates, setExerciseStates] = useState<ExerciseState[]>([]);
  const [exercises, setExercises] = useState<Map<number, Exercise>>(new Map());
  const [workoutName, setWorkoutName] = useState('');
  const [programName, setProgramName] = useState('');
  const [workoutId, setWorkoutId] = useState<number>(0);
  const [startedAt, setStartedAt] = useState('');
  const timer = useRestTimer();
  const inlineTimerRef = useRef<HTMLDivElement>(null);
  const [inlineTimerVisible, setInlineTimerVisible] = useState(true);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedProgram = programs.find(p => p.id === selectedProgramId) ?? null;

  // Persist active session to IndexedDB (debounced)
  const confirmedRef = useRef(confirmedSets);
  confirmedRef.current = confirmedSets;

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
        confirmedSets: [...confirmedRef.current],
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

      // Restore confirmed sets and auto-collapse fully confirmed exercises
      if (active.confirmedSets?.length) {
        const restored = new Set(active.confirmedSets);
        setConfirmedSets(restored);
        const collapsed = new Set<number>();
        active.exerciseStates.forEach((es, exIdx) => {
          const allDone = es.sets.every((_: unknown, si: number) => restored.has(`${exIdx}-${si}`));
          if (allDone) collapsed.add(exIdx);
        });
        setCollapsedExercises(collapsed);
      }

      // Restore rest timer with original total for correct progress bar
      if (active.restTimerEnd && active.restTimerTotal) {
        timer.resume(new Date(active.restTimerEnd).getTime(), active.restTimerTotal);
      }

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

    const prevSessions = await db.sessions.orderBy('date').reverse().toArray();
    const states: ExerciseState[] = [];
    for (const we of w.exercises) {
      const suggestion = await getSuggestion(we.exerciseId, we.repRange[1], we.repRange[0]);
      // Find last session's working sets for this exercise
      const prevSession = prevSessions.find(s => s.exercises.some(e => e.exerciseId === we.exerciseId));
      const prevEx = prevSession?.exercises.find(e => e.exerciseId === we.exerciseId);
      const prevWorking = prevEx?.sets.filter(s => s.isWorkingSet) ?? [];
      const lastSession = prevWorking.length > 0
        ? { weight: prevWorking[0].weight, reps: prevWorking.map(s => s.reps) }
        : undefined;
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
        lastSession,
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
    // Auto-unconfirm if weight or reps is cleared
    const setKey = `${exIdx}-${setIdx}`;
    if (value === '' && confirmedSets.has(setKey)) {
      setConfirmedSets(prev => {
        const next = new Set(prev);
        next.delete(setKey);
        setCollapsedExercises(cp => { const n = new Set(cp); n.delete(exIdx); return n; });
        db.activeSession.toArray().then(saved => {
          if (saved.length > 0) {
            db.activeSession.update(saved[0].id!, { confirmedSets: [...next] });
          }
        });
        return next;
      });
    }
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
    const suggestion = await getSuggestion(exerciseId, 12, 8);
    const prevSessions = await db.sessions.orderBy('date').reverse().toArray();
    const prevSession = prevSessions.find(s => s.exercises.some(e => e.exerciseId === exerciseId));
    const prevEx = prevSession?.exercises.find(e => e.exerciseId === exerciseId);
    const prevWorking = prevEx?.sets.filter(s => s.isWorkingSet) ?? [];
    const lastSession = prevWorking.length > 0
      ? { weight: prevWorking[0].weight, reps: prevWorking.map(s => s.reps) }
      : undefined;
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
      lastSession,
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

  const logSet = async (restSeconds: number) => {
    timer.start(restSeconds);
    // Persist timer end time so it survives browser close
    const endTime = new Date(Date.now() + restSeconds * 1000).toISOString();
    const existing = await db.activeSession.toArray();
    if (existing.length > 0) {
      await db.activeSession.update(existing[0].id!, { restTimerEnd: endTime, restTimerTotal: restSeconds });
    }
  };

  const cancelSession = () => {
    setConfirmAction({
      title: 'Discard Session',
      message: 'All progress in this session will be lost.',
      onConfirm: async () => {
        setConfirmAction(null);
        await db.activeSession.clear();
        setSessionActive(false);
        setExerciseStates([]);
        setSelectedDayLabel(null);
        setConfirmedSets(new Set());
        setCollapsedExercises(new Set());
        timer.clear();
      },
    });
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

    // Compute PBs before saving (compare against existing sessions)
    const existingSessions = await db.sessions.toArray();
    const allTimeBest = new Map<number, number>();
    for (const s of existingSessions) {
      for (const ex of s.exercises) {
        const cur = allTimeBest.get(ex.exerciseId) ?? 0;
        if (ex.e10RM > cur) allTimeBest.set(ex.exerciseId, ex.e10RM);
      }
    }
    const pbs: { name: string; e10RM: number }[] = [];
    for (const se of sessionExercises) {
      if (se.e10RM > 0 && se.e10RM > (allTimeBest.get(se.exerciseId) ?? 0)) {
        const ex = exercises.get(se.exerciseId);
        if (ex) pbs.push({ name: ex.name, e10RM: se.e10RM });
      }
    }

    // Compute stats
    let totalSets = 0;
    let totalVolume = 0;
    for (const se of sessionExercises) {
      for (const set of se.sets) {
        totalSets++;
        totalVolume += set.weight * set.reps;
      }
    }
    const duration = Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000);

    await db.sessions.add({
      date: startedAt || new Date().toISOString(),
      durationMinutes: duration,
      programId: selectedProgramId,
      dayLabel: selectedDayLabel,
      workoutId,
      exercises: sessionExercises,
    });

    await db.activeSession.clear();

    setSummary({
      dayLabel: selectedDayLabel,
      duration,
      exerciseCount: sessionExercises.filter(e => e.sets.length > 0).length,
      totalSets,
      totalVolume,
      pbs,
    });

    setSessionActive(false);
    setExerciseStates([]);
    setConfirmedSets(new Set());
    setCollapsedExercises(new Set());
    timer.clear();
  };

  // Track if inline timer is scrolled out of view
  useEffect(() => {
    const el = inlineTimerRef.current;
    if (!el) { setInlineTimerVisible(true); return; }
    const screen = el.closest('.screen');
    if (!screen) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInlineTimerVisible(entry.isIntersecting),
      { root: screen, threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  });

  // Live elapsed time — always computed from startedAt timestamp
  const [elapsedSec, setElapsedSec] = useState(0);
  useEffect(() => {
    if (!sessionActive || !startedAt) return;
    const startMs = new Date(startedAt).getTime();
    const tick = () => setElapsedSec(Math.floor((Date.now() - startMs) / 1000));
    tick();
    const id = window.setInterval(tick, 500);
    return () => clearInterval(id);
  }, [sessionActive, startedAt]);

  if (summary) {
    return (
      <div className="screen">
        <SessionSummary
          data={summary}
          onDismiss={() => { setSummary(null); setSelectedDayLabel(null); }}
        />
      </div>
    );
  }

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
                {selectedProgram.days.map((day, dayIdx) => {
                  const wk = workoutMap.get(day.workoutId);
                  const exNames = wk?.exercises.map(we => exerciseMap.get(we.exerciseId)?.name).filter(Boolean) ?? [];
                  const dayLabel = wk?.name ?? `Day ${dayIdx + 1}`;
                  return (
                    <button
                      key={dayIdx}
                      className="card"
                      style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                      onClick={() => {
                        setConfirmAction({
                          title: 'Start Session',
                          message: `Start ${wk?.name ?? dayLabel}?`,
                          onConfirm: () => {
                            setConfirmAction(null);
                            setSelectedDayLabel(dayLabel);
                            loadSession(selectedProgram.id!, selectedProgram.name, dayLabel, day.workoutId);
                          },
                        });
                      }}
                    >
                      <div className="row-between" style={{ marginBottom: exNames.length > 0 ? 8 : 0 }}>
                        <div>
                          <div className="subtitle" style={{ marginBottom: 2 }}>Day {dayIdx + 1}</div>
                          <div className="title">{wk?.name ?? 'No workout'}</div>
                        </div>
                        <ChevronRight size={18} color="var(--text-muted)" />
                      </div>
                      {exNames.length > 0 && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                          {exNames.join(' · ')}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {confirmAction && (
          <ConfirmDialog
            title={confirmAction.title}
            message={confirmAction.message}
            confirmLabel="Start"
            onConfirm={confirmAction.onConfirm}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </div>
    );
  }

  if (viewingExerciseId !== null) {
    return (
      <div className="screen">
        <ExerciseDetail
          exerciseId={viewingExerciseId}
          backLabel="Workout"
          onBack={() => setViewingExerciseId(null)}
        />
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
      </div>

      {/* Sticky timer when inline is scrolled out of view */}
      {timer.active && confirmedSets.size > 0 && (
        <div className="timer-bar" style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          opacity: inlineTimerVisible ? 0 : 1,
          pointerEvents: inlineTimerVisible ? 'none' : 'auto',
          maxHeight: inlineTimerVisible ? 0 : 200,
          padding: inlineTimerVisible ? 0 : undefined,
          marginBottom: inlineTimerVisible ? 0 : undefined,
          borderWidth: inlineTimerVisible ? 0 : undefined,
          overflow: 'hidden',
          transition: 'opacity 0.15s ease',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: timer.expired ? 'var(--red)' : 'var(--text-muted)' }}>
              {timer.expired ? 'Rest Over' : 'Rest Timer'}
            </div>
            <div className="timer-display" style={{ color: timer.expired ? 'var(--red)' : 'var(--text)' }}>
              {timer.expired ? '+' : ''}{Math.floor(Math.abs(timer.remaining) / 60)}:{String(Math.abs(timer.remaining) % 60).padStart(2, '0')}
            </div>
            {!timer.expired && (
              <div className="timer-progress">
                <div className="timer-progress-fill" style={{ width: `${Math.min(100, ((timer.total - timer.remaining) / timer.total) * 100)}%` }} />
              </div>
            )}
          </div>
        </div>
      )}

      {exerciseStates.map((es, exIdx) => {
        const exercise = exercises.get(es.exerciseId);
        if (!exercise) return null;

        const allConfirmed = es.sets.length > 0 && es.sets.every((_, setIdx) => confirmedSets.has(`${exIdx}-${setIdx}`));

        const firstUncompletedIdx = exerciseStates.findIndex((e, i) =>
          !e.sets.every((_, si) => confirmedSets.has(`${i}-${si}`))
        );
        const showTimerHere = timer.active && confirmedSets.size > 0 && exIdx === firstUncompletedIdx;

        const filledSets = es.sets
          .filter(s => s.weight && s.reps && s.isWorkingSet)
          .map(s => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps), isWorkingSet: true }));
        const avgE10rm = sessionE10RM(filledSets);

        return (
          <div key={`${es.exerciseId}-${exIdx}`}>
          {showTimerHere && (
            <div className="timer-bar" ref={inlineTimerRef}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: timer.expired ? 'var(--red)' : 'var(--text-muted)' }}>
                  {timer.expired ? 'Rest Over' : 'Rest Timer'}
                </div>
                <div className="timer-display" style={{ color: timer.expired ? 'var(--red)' : 'var(--text)' }}>
                  {timer.expired ? '+' : ''}{Math.floor(Math.abs(timer.remaining) / 60)}:{String(Math.abs(timer.remaining) % 60).padStart(2, '0')}
                </div>
                {!timer.expired && (
                  <div className="timer-progress">
                    <div
                      className="timer-progress-fill"
                      style={{ width: `${Math.min(100, ((timer.total - timer.remaining) / timer.total) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          {collapsedExercises.has(exIdx) ? (
            <div
              className="exercise-card"
              style={{ padding: '12px 16px', cursor: 'pointer' }}
              onClick={() => setCollapsedExercises(prev => { const n = new Set(prev); n.delete(exIdx); return n; })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {allConfirmed ? (
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, background: 'var(--green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Check size={14} color="white" />
                  </div>
                ) : (
                  <div style={{
                    width: 28, height: 28, borderRadius: 6, background: 'var(--bg-input)',
                    border: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <ChevronRight size={14} color="var(--text-muted)" />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{exercise.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {es.sets.filter((_, si) => confirmedSets.has(`${exIdx}-${si}`)).length}/{es.sets.length} sets
                    {avgE10rm > 0 && <> &middot; e10RM: {avgE10rm.toFixed(1)} kg</>}
                  </div>
                </div>
                <ChevronDown size={16} color="var(--text-muted)" />
              </div>
            </div>
          ) : (
          <div className="exercise-card">
            <div
              className="exercise-card-header"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
              onClick={(e) => {
                // Only collapse if clicking the header background, not a child button/input/link
                if ((e.target as HTMLElement).closest('button, a, h3')) return;
                setCollapsedExercises(prev => new Set(prev).add(exIdx));
              }}
            >
              {exercise.imageUrl && (
                <img src={exercise.imageUrl} alt="" style={{
                  width: 40, height: 40, borderRadius: 8, objectFit: 'cover',
                  border: '1px solid var(--border)', flexShrink: 0,
                }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3
                    style={{ margin: 0, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border)', textUnderlineOffset: 3 }}
                    onClick={() => setViewingExerciseId(es.exerciseId)}
                  >{exercise.name}</h3>
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
                {es.lastSession && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Last: {es.lastSession.weight}kg &times; {es.lastSession.reps.join(', ')}
                  </div>
                )}
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
                    setConfirmAction({
                      title: 'Remove Exercise',
                      message: `Remove ${exercise.name} from this session?`,
                      onConfirm: () => { setConfirmAction(null); removeExerciseFromSession(exIdx); },
                    });
                  }}
                  aria-label="Remove exercise"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            <div className="set-labels" style={{ gridTemplateColumns: '32px 1fr 1fr 44px 36px 36px' }}>
              <span>Set</span>
              <span>kg</span>
              <span>Reps</span>
              <span>e10RM</span>
              <span></span>
              <span>W</span>
            </div>

            {es.sets.map((set, setIdx) => {
              const w = parseFloat(set.weight) || 0;
              const r = parseInt(set.reps) || 0;
              const setE10rm = w > 0 && r > 0 ? calcE10RM(w, r) : 0;
              const isFilled = set.weight !== '' && set.reps !== '';
              const setKey = `${exIdx}-${setIdx}`;
              const isConfirmed = confirmedSets.has(setKey);

              // 3 states: empty (grey), filled but unconfirmed (green), confirmed (accent/blue)
              let tickBg = 'var(--bg-input)';
              let tickBorder = 'var(--border)';
              let tickColor = 'var(--text-muted)';
              if (isConfirmed) {
                tickBg = 'var(--accent)';
                tickBorder = 'var(--accent)';
                tickColor = 'white';
              } else if (isFilled) {
                tickBg = 'var(--green)';
                tickBorder = 'var(--green)';
                tickColor = 'white';
              }

              return (
                <div className="set-row" key={setIdx} style={{ gridTemplateColumns: '32px 1fr 1fr 44px 36px 36px' }}>
                  <span className="set-num">{setIdx + 1}</span>
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
                  <span style={{ textAlign: 'center', fontSize: 12, color: setE10rm > 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {setE10rm > 0 ? setE10rm.toFixed(0) : '—'}
                  </span>
                  <button
                    className="working-toggle"
                    style={{
                      background: tickBg,
                      borderColor: tickBorder,
                      color: tickColor,
                      width: 32, height: 32, fontSize: 14,
                    }}
                    onClick={() => {
                      if (isConfirmed) {
                        // Un-confirm: toggle back to grey/green
                        setConfirmedSets(prev => {
                          const next = new Set(prev);
                          next.delete(setKey);
                          // Un-collapse the exercise if it was auto-collapsed
                          setCollapsedExercises(cp => { const n = new Set(cp); n.delete(exIdx); return n; });
                          db.activeSession.toArray().then(saved => {
                            if (saved.length > 0) {
                              db.activeSession.update(saved[0].id!, { confirmedSets: [...next] });
                            }
                          });
                          return next;
                        });
                      } else if (isFilled) {
                        // Confirm
                        setConfirmedSets(prev => {
                          const next = new Set(prev).add(setKey);
                          const allDone = es.sets.every((_, si) => next.has(`${exIdx}-${si}`));
                          if (allDone) {
                            setCollapsedExercises(cp => new Set(cp).add(exIdx));
                          }
                          db.activeSession.toArray().then(saved => {
                            if (saved.length > 0) {
                              db.activeSession.update(saved[0].id!, { confirmedSets: [...next] });
                            }
                          });
                          return next;
                        });
                        logSet(es.restSeconds);
                      }
                    }}
                    disabled={!isFilled && !isConfirmed}
                    aria-label={isConfirmed ? 'Undo confirm' : 'Confirm set'}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className={`working-toggle ${set.isWorkingSet ? 'active' : ''}`}
                    onClick={() => toggleWorking(exIdx, setIdx)}
                    aria-label={set.isWorkingSet ? 'Working set' : 'Warm-up set'}
                    style={{ width: 32, height: 32 }}
                  >
                    {set.isWorkingSet ? 'W' : 'WU'}
                  </button>
                </div>
              );
            })}

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

      <button
        className="btn btn-full"
        style={{ marginTop: 24, background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 13 }}
        onClick={cancelSession}
      >
        End Session Without Saving
      </button>

      {showAddExercise && (
        <ExercisePicker
          exercises={allExercises.filter(ex => !exerciseStates.some(es => es.exerciseId === ex.id))}
          suggestBy={{ muscleGroups: new Set(
            exerciseStates.flatMap(es => {
              const ex = exercises.get(es.exerciseId);
              return ex ? [ex.muscleGroup, ...(ex.secondaryMuscleGroup ? [ex.secondaryMuscleGroup] : [])] : [];
            })
          )}}
          onAdd={(id) => addExerciseToSession(id)}
          onClose={() => setShowAddExercise(false)}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          confirmLabel="Yes"
          cancelLabel="No"
          destructive
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {picker && (
        <ScrollPicker
          label={picker.field === 'weight' ? 'Weight (kg)' : 'Reps'}
          values={picker.field === 'weight'
            ? (exercises.get(exerciseStates[picker.exIdx]?.exerciseId)?.category === 'dumbbell' ? DB_WEIGHTS : WEIGHTS)
            : REPS}
          value={(() => {
            const es = exerciseStates[picker.exIdx];
            const set = es?.sets[picker.setIdx];
            if (picker.field === 'weight') {
              return set?.weight || (es?.suggestedWeight ? String(es.suggestedWeight) : '20');
            }
            // Default reps to midpoint of rep range
            const mid = es ? Math.round((es.repRange[0] + es.repRange[1]) / 2) : 10;
            return set?.reps || String(mid);
          })()}
          suffix={picker.field === 'weight' ? 'kg' : undefined}
          onChange={(val) => updateSet(picker.exIdx, picker.setIdx, picker.field, val)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
