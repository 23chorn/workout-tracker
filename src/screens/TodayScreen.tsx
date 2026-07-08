import { useState, useCallback, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Exercise, type SessionSet, type SessionExercise, type ActiveSession, type LiftingPlan } from '../db/database';
import { getSuggestion } from '../utils/progression';
import { getTodayContext, skipDay, type TodayContext } from '../utils/plan';
import { calcE10RM, calcE1RM, sessionE10RM, sessionE1RM } from '../utils/e10rm';
import { useRMMode } from '../contexts/RMModeContext';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { useRestTimer } from '../hooks/useRestTimer';
import { Check, ChevronRight, ChevronUp, ChevronDown, Plus, Trash2, Notebook } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ExercisePicker } from '../components/ExercisePicker';
import { SessionSummary, type SessionSummaryData } from '../components/SessionSummary';
import { ScrollPicker, weightValues, dumbbellWeightValues, bodyweightWeightValues, repValues } from '../components/ScrollPicker';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function PlanOverviewModal({ ctx, onClose }: { ctx: TodayContext; onClose: () => void }) {
  const allWorkouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const allExercises = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const workoutMap = new Map(allWorkouts.map(w => [w.id!, w]));
  const exMap = new Map(allExercises.map(e => [e.id!, e]));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="row-between mb-md">
          <h2 style={{ marginBottom: 0 }}>{ctx.plan.name}</h2>
          <button className="btn btn-sm btn-secondary" onClick={onClose}>Close</button>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
          Started {new Date(ctx.plan.startDate).toLocaleDateString()} · Currently in {ctx.phase.name}, Week {ctx.week}
        </div>

        {ctx.plan.phases.map((phase) => {
          const isCurrent = ctx.week >= phase.startWeek && ctx.week <= phase.endWeek;
          return (
            <div key={phase.name} style={{ marginBottom: 20 }}>
              <div style={{
                fontSize: 14, fontWeight: 700, marginBottom: 4,
                color: isCurrent ? 'var(--accent)' : 'var(--text)',
              }}>
                {phase.name} — Weeks {phase.startWeek}–{phase.endWeek}
                {isCurrent && <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--accent)' }}>• current</span>}
              </div>
              {phase.notes && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginBottom: 8 }}>
                  {phase.notes}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {phase.days.map((day) => {
                  const wk = day.workoutId ? workoutMap.get(day.workoutId) : null;
                  const isRest = !day.workoutId && !day.rowingSlot;
                  return (
                    <div
                      key={day.dayOfWeek}
                      className="card"
                      style={{ padding: 10, marginBottom: 0, background: isRest ? 'transparent' : 'var(--bg-card)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
                            {DAY_NAMES[day.dayOfWeek]} — {day.label}
                          </div>
                          {wk && (
                            <>
                              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{wk.name}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                                {wk.exercises.map(we => {
                                  const ex = exMap.get(we.exerciseId);
                                  const name = ex?.name ?? '?';
                                  const range = we.repRange[0] === we.repRange[1]
                                    ? `${we.repRange[0]}`
                                    : `${we.repRange[0]}-${we.repRange[1]}`;
                                  return `${name} ${we.sets}×${range}`;
                                }).join(' · ')}
                              </div>
                            </>
                          )}
                          {day.rowingSlot && !wk && (
                            <div style={{ fontSize: 13, fontWeight: 600 }}>Rowing only (slot {day.rowingSlot})</div>
                          )}
                          {day.rowingSlot && wk && (
                            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4 }}>+ Rowing slot {day.rowingSlot}</div>
                          )}
                          {isRest && (
                            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Rest</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Strength Targets</div>
          {ctx.plan.targets.map(t => {
            const ex = exMap.get(t.exerciseId);
            return (
              <div key={t.exerciseId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>{ex?.name ?? 'Unknown'}</span>
                <span style={{ color: 'var(--text-muted)' }}>{t.startWeight}kg → {t.targetWeight}kg</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* A station tag, like a numbered peg on a rack — outlined while you haven't
   reached it, filled steel while you're on it, filled olive with a check once
   every set is confirmed. Order is real information here: it's the sequence
   you actually move through during the session. */
function StationMarker({ index, done, current, size = 28 }: { index: number; done: boolean; current: boolean; size?: number }) {
  if (done) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size >= 28 ? 6 : 5, background: 'var(--green)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Check size={size >= 28 ? 14 : 11} color="white" />
      </div>
    );
  }
  return (
    <div className="num" style={{
      width: size, height: size, borderRadius: size >= 28 ? 6 : 5,
      background: current ? 'var(--accent)' : 'var(--bg-input)',
      border: current ? 'none' : '1px solid var(--border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontSize: size >= 28 ? 13 : 11, fontWeight: 600,
      color: current ? '#14120f' : 'var(--text-muted)',
    }}>
      {index + 1}
    </div>
  );
}

function PlanTodayCard({ ctx, workoutName, onStart, onSkip, onOpenRowing }: {
  ctx: TodayContext;
  workoutName: string;
  onStart: () => void;
  onSkip: () => void;
  onOpenRowing?: () => void;
}) {
  const [showOverview, setShowOverview] = useState(false);
  const dayName = DAY_NAMES[ctx.phaseDay.dayOfWeek];
  const isRest = !ctx.phaseDay.workoutId;

  return (
    <div>
      <div className="hero-card">
        <div className="hero-card-band">
          <span>{ctx.plan.name}</span>
          <span className="num">Wk {ctx.week}</span>
        </div>
        <div className="hero-card-body">
          <div className="title" style={{ fontSize: 16, marginBottom: 2 }}>
            {ctx.phase.name} · {dayName}
          </div>
          <div className="subtitle">
            {ctx.phaseDay.label}{workoutName && ` — ${workoutName}`}
          </div>
          {ctx.phase.notes && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 8 }}>
              {ctx.phase.notes}
            </div>
          )}
        </div>
        <div className="hero-card-tear" />
        <div className="hero-card-actions">
          <div style={{ display: 'flex', gap: 8 }}>
            {!isRest && (
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={onStart}>
                Start Workout
              </button>
            )}
            <button className="btn btn-secondary" style={{ flex: isRest ? 1 : 0 }} onClick={onSkip}>
              Skip Day
            </button>
          </div>
          <button
            className="btn btn-sm btn-secondary btn-full"
            style={{ fontSize: 12 }}
            onClick={() => setShowOverview(true)}
          >
            View Full Plan
          </button>
        </div>
      </div>

      {showOverview && <PlanOverviewModal ctx={ctx} onClose={() => setShowOverview(false)} />}

      {isRest && (
        <div className="card" style={{ marginBottom: 12, textAlign: 'center', color: 'var(--text-muted)' }}>
          Rest day — no workout scheduled.
        </div>
      )}

      {ctx.rowingSession && (
        <button
          className="card"
          style={{ width: '100%', textAlign: 'left', cursor: onOpenRowing ? 'pointer' : 'default', marginBottom: 12 }}
          onClick={onOpenRowing}
          disabled={!onOpenRowing}
        >
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
            Rowing today
          </div>
          <div className="title" style={{ fontSize: 15, marginBottom: 4 }}>
            {ctx.rowingSession.target}
          </div>
          {ctx.rowingSession.guidance && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>
              {ctx.rowingSession.guidance}
            </div>
          )}
          {onOpenRowing && (
            <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 6 }}>
              Tap to open rowing →
            </div>
          )}
        </button>
      )}
    </div>
  );
}

interface ExerciseState {
  exerciseId: number;
  sets: { weight: string; reps: string; isWorkingSet: boolean }[];
  restSeconds: number;
  suggestedWeight: number;
  suggestionReason: string;
  repRange: [number, number];
  numSets: number;
  lastSession?: { weight: number; reps: number[]; e10RM: number };
}

export function TodayScreen({ onNavigateRowing }: { onNavigateRowing?: () => void } = {}) {
  const { rmMode } = useRMMode();
  const programs = useLiveQuery(() => db.programs.toArray()) ?? [];
  const activePlanProgress = useLiveQuery(() => db.liftingPlanProgress.filter(p => p.active).first()) ?? null;
  const activePlan = useLiveQuery(
    async () => {
      if (!activePlanProgress) return null;
      return (await db.liftingPlans.get(activePlanProgress.planId)) ?? null;
    },
    [activePlanProgress?.planId],
  ) as LiftingPlan | null | undefined;
  const planContext: TodayContext | null = activePlan ? getTodayContext(activePlan) : null;
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
  const BW_WEIGHTS = bodyweightWeightValues();
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
  const [inlineTimerEl, setInlineTimerEl] = useState<HTMLDivElement | null>(null);
  const [inlineTimerVisible, setInlineTimerVisible] = useState(true);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exerciseRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollToExercise = (idx: number) => {
    setCollapsedExercises(prev => { if (!prev.has(idx)) return prev; const n = new Set(prev); n.delete(idx); return n; });
    requestAnimationFrame(() => {
      exerciseRefs.current.get(idx)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

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
          lastSession: s.lastSession,
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
        lastSession: s.lastSession ? { ...s.lastSession, e10RM: s.lastSession.e10RM ?? 0 } : undefined,
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
        ? { weight: prevWorking[0].weight, reps: prevWorking.map(s => s.reps), e10RM: prevEx?.e10RM ?? 0 }
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
        lastSession: s.lastSession,
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
      ? { weight: prevWorking[0].weight, reps: prevWorking.map(s => s.reps), e10RM: prevEx?.e10RM ?? 0 }
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
        .filter(s => s.weight !== '' && s.reps !== '')
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
    if (!inlineTimerEl) { setInlineTimerVisible(true); return; }
    const screen = inlineTimerEl.closest('.screen');
    if (!screen) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInlineTimerVisible(entry.isIntersecting),
      { root: screen, threshold: 0 }
    );
    observer.observe(inlineTimerEl);
    return () => observer.disconnect();
  }, [inlineTimerEl]);

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

        {planContext ? (
          <PlanTodayCard
            ctx={planContext}
            workoutName={planContext.phaseDay.workoutId ? (workoutMap.get(planContext.phaseDay.workoutId)?.name ?? '') : ''}
            onStart={() => {
              const wkId = planContext.phaseDay.workoutId;
              if (!wkId) return;
              const wk = workoutMap.get(wkId);
              const dayLabel = `${planContext.phase.name} · Wk ${planContext.week} · ${planContext.phaseDay.label}`;
              setConfirmAction({
                title: 'Start Session',
                message: `Start ${wk?.name ?? planContext.phaseDay.label}?`,
                onConfirm: () => {
                  setConfirmAction(null);
                  setSelectedDayLabel(dayLabel);
                  loadSession(planContext.plan.id!, planContext.plan.name, dayLabel, wkId);
                },
              });
            }}
            onSkip={() => {
              setConfirmAction({
                title: 'Skip Day',
                message: 'Skip today? The plan will shift forward by one day.',
                onConfirm: async () => {
                  setConfirmAction(null);
                  await skipDay(planContext.plan.id!);
                },
              });
            }}
            onOpenRowing={onNavigateRowing}
          />
        ) : programs.length === 0 ? (
          <div className="empty">
            <Notebook size={28} />
            <div className="empty-title">No program set up</div>
            <p>Build one in Manage to see today's plan here.</p>
          </div>
        ) : (
          <div className="hero-card">
            <div className="hero-card-band">
              <span>Today</span>
            </div>
            <div className="hero-card-body" style={{ paddingBottom: selectedProgram ? 14 : undefined }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
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
            </div>

            {selectedProgram && (
              <>
                <div className="hero-card-tear" />
                <div className="hero-card-body">
                  <label style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, display: 'block' }}>
                    Which day?
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedProgram.days.map((day, dayIdx) => {
                      const wk = workoutMap.get(day.workoutId);
                      const exNames = wk?.exercises.map(we => exerciseMap.get(we.exerciseId)?.name).filter(Boolean) ?? [];
                      const dayLabel = wk?.name ?? `Day ${dayIdx + 1}`;
                      return (
                        <button
                          key={dayIdx}
                          className="card"
                          style={{ cursor: 'pointer', textAlign: 'left', width: '100%', margin: 0 }}
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
                </div>
              </>
            )}
          </div>
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

  const currentExIdx = exerciseStates.findIndex((e, i) =>
    !e.sets.every((_, si) => confirmedSets.has(`${i}-${si}`))
  );

  return (
    <div className="screen">
      <div className="row-between" style={{ alignItems: 'flex-start' }}>
        <h1 style={{ marginBottom: 0 }}>{selectedDayLabel}</h1>
        <div className="num" style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          {Math.floor(elapsedSec / 60)}:{String(elapsedSec % 60).padStart(2, '0')}
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>{workoutName}</div>

      {exerciseStates.length > 1 && (
        <div className="session-rail mb-sm">
          {exerciseStates.map((es, i) => {
            const done = es.sets.length > 0 && es.sets.every((_, si) => confirmedSets.has(`${i}-${si}`));
            return (
              <button
                key={i}
                className="session-rail-token"
                onClick={() => scrollToExercise(i)}
                aria-label={`Jump to ${exercises.get(es.exerciseId)?.name ?? `exercise ${i + 1}`}`}
              >
                <StationMarker index={i} done={done} current={i === currentExIdx && !done} size={22} />
              </button>
            );
          })}
        </div>
      )}

      {/* Fixed timer when inline is scrolled out of view — position:fixed keeps it out of document flow so it can't trigger IntersectionObserver feedback */}
      {timer.active && confirmedSets.size > 0 && !inlineTimerVisible && (
        <div className="timer-bar" style={{
          position: 'fixed',
          top: 'calc(env(safe-area-inset-top, 0px) + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'calc(100% - 32px)',
          maxWidth: 448,
          zIndex: 50,
          boxSizing: 'border-box',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: timer.expired ? 'var(--red)' : 'var(--text-muted)' }}>
              {timer.expired ? 'Rest Over' : 'Rest Timer'}
            </div>
            <div className={`timer-display ${!timer.expired ? 'timer-pulse' : ''}`} style={{ color: timer.expired ? 'var(--red)' : 'var(--text)' }}>
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

        const showTimerHere = timer.active && confirmedSets.size > 0 && exIdx === currentExIdx;
        const isCurrent = exIdx === currentExIdx && !allConfirmed;
        const nextSetIdx = isCurrent ? es.sets.findIndex((_, si) => !confirmedSets.has(`${exIdx}-${si}`)) : -1;

        const filledSets = es.sets
          .filter(s => s.weight !== '' && s.reps !== '' && s.isWorkingSet)
          .map(s => ({ weight: parseFloat(s.weight), reps: parseInt(s.reps), isWorkingSet: true }));
        const avgE10rm = rmMode === 'e10RM' ? sessionE10RM(filledSets) : sessionE1RM(filledSets);

        return (
          <div
            key={`${es.exerciseId}-${exIdx}`}
            ref={(el) => { if (el) exerciseRefs.current.set(exIdx, el); else exerciseRefs.current.delete(exIdx); }}
          >
          {showTimerHere && (
            <div className="timer-bar" ref={setInlineTimerEl}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: timer.expired ? 'var(--red)' : 'var(--text-muted)' }}>
                  {timer.expired ? 'Rest Over' : 'Rest Timer'}
                </div>
                <div className={`timer-display ${!timer.expired ? 'timer-pulse' : ''}`} style={{ color: timer.expired ? 'var(--red)' : 'var(--text)' }}>
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
              style={{
                padding: '12px 16px', cursor: 'pointer',
                opacity: allConfirmed ? 0.55 : 1,
              }}
              onClick={() => setCollapsedExercises(prev => { const n = new Set(prev); n.delete(exIdx); return n; })}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StationMarker index={exIdx} done={allConfirmed} current={isCurrent} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{exercise.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {es.sets.filter((_, si) => confirmedSets.has(`${exIdx}-${si}`)).length}/{es.sets.length} sets
                    {avgE10rm > 0 && <> &middot; {rmMode}: {avgE10rm.toFixed(1)} kg</>}
                  </div>
                </div>
                <ChevronDown size={16} color="var(--text-muted)" />
              </div>
            </div>
          ) : (
          <div
            className="exercise-card"
            style={{ opacity: allConfirmed ? 0.55 : 1 }}
          >
            <div
              className="exercise-card-header"
              style={{ display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer' }}
              onClick={(e) => {
                // Only collapse if clicking the header background, not a child button/input/link
                if ((e.target as HTMLElement).closest('button, a, h3')) return;
                setCollapsedExercises(prev => new Set(prev).add(exIdx));
              }}
            >
              <div style={{ marginTop: 2 }}>
                <StationMarker index={exIdx} done={allConfirmed} current={isCurrent} />
              </div>
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
                    {es.lastSession.e10RM > 0 && (() => {
                      const lastSets = es.lastSession!.reps.map(r => ({ weight: es.lastSession!.weight, reps: r, isWorkingSet: true }));
                      const lastRMVal = rmMode === 'e10RM' ? sessionE10RM(lastSets) : sessionE1RM(lastSets);
                      return lastRMVal > 0 ? (
                        <span style={{ marginLeft: 6, color: 'var(--accent)' }}>
                          {rmMode} {lastRMVal.toFixed(1)}
                        </span>
                      ) : null;
                    })()}
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

            <div className="set-labels" style={{ gridTemplateColumns: '32px 1fr 1fr 44px 40px 30px' }}>
              <span>Set</span>
              <span>kg</span>
              <span>Reps</span>
              <span>{rmMode}</span>
              <span></span>
              <span>W</span>
            </div>

            {es.sets.map((set, setIdx) => {
              const w = parseFloat(set.weight) || 0;
              const r = parseInt(set.reps) || 0;
              const setE10rm = w > 0 && r > 0 ? (rmMode === 'e10RM' ? calcE10RM(w, r) : calcE1RM(w, r)) : 0;
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

              const isNextUp = setIdx === nextSetIdx;

              return (
                <div className="set-row" key={setIdx} style={{ gridTemplateColumns: '32px 1fr 1fr 44px 40px 30px', opacity: isConfirmed ? 0.45 : 1, transition: 'opacity 0.2s' }}>
                  {isNextUp ? (
                    <span className="num" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 22, height: 22, borderRadius: 5, margin: '0 auto',
                      background: 'var(--accent)', color: '#14120f', fontSize: 11, fontWeight: 600,
                    }}>{setIdx + 1}</span>
                  ) : (
                    <span className="set-num">{setIdx + 1}</span>
                  )}
                  <button
                    className="picker-input"
                    onClick={() => setPicker({ exIdx, setIdx, field: 'weight' })}
                  >
                    {set.weight !== '' ? <span>{exercise?.category === 'bodyweight' ? `+${set.weight}` : set.weight}</span> : <span className="placeholder">{exercise?.category === 'bodyweight' ? '+kg' : 'kg'}</span>}
                  </button>
                  <button
                    className="picker-input"
                    onClick={() => setPicker({ exIdx, setIdx, field: 'reps' })}
                  >
                    {set.reps ? <span>{set.reps}</span> : <span className="placeholder">reps</span>}
                  </button>
                  <span style={{ textAlign: 'center', fontSize: 12, color: setE10rm > 0 ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {setE10rm > 0 ? setE10rm.toFixed(1) : '—'}
                  </span>
                  <button
                    className={`working-toggle set-confirm ${isFilled && !isConfirmed ? 'set-confirm-ready' : ''}`}
                    style={{
                      background: tickBg,
                      borderColor: tickBorder,
                      color: tickColor,
                      width: 36, height: 36, fontSize: 15,
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
                    className={`working-toggle ghost ${set.isWorkingSet ? 'active' : ''}`}
                    onClick={() => toggleWorking(exIdx, setIdx)}
                    aria-label={set.isWorkingSet ? 'Working set' : 'Warm-up set'}
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
                Session {rmMode}: <span className="value">{avgE10rm.toFixed(1)} kg</span>
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
          label={picker.field === 'weight'
            ? (exercises.get(exerciseStates[picker.exIdx]?.exerciseId)?.category === 'bodyweight' ? 'Added Weight (kg)' : 'Weight (kg)')
            : 'Reps'}
          values={picker.field === 'weight'
            ? ((() => {
                const cat = exercises.get(exerciseStates[picker.exIdx]?.exerciseId)?.category;
                return cat === 'bodyweight' ? BW_WEIGHTS : cat === 'dumbbell' ? DB_WEIGHTS : WEIGHTS;
              })())
            : REPS}
          value={(() => {
            const es = exerciseStates[picker.exIdx];
            const set = es?.sets[picker.setIdx];
            if (picker.field === 'weight') {
              if (set?.weight !== undefined && set.weight !== '') return set.weight;
              return es?.suggestedWeight != null ? String(es.suggestedWeight) : '0';
            }
            // Default reps to midpoint of rep range
            const mid = es ? Math.round((es.repRange[0] + es.repRange[1]) / 2) : 10;
            if (set?.reps !== undefined && set.reps !== '') return set.reps;
            return String(mid);
          })()}
          suffix={picker.field === 'weight' ? 'kg' : undefined}
          onChange={(val) => updateSet(picker.exIdx, picker.setIdx, picker.field, val)}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
