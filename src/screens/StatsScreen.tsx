import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Session, type LiftingPlan } from '../db/database';
import { sessionE10RM, sessionE1RM } from '../utils/e10rm';
import { useRMMode } from '../contexts/RMModeContext';
import { loadCompoundGoals, COMPOUND_DEFS, type CompoundGoalKey } from '../utils/compoundGoals';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { Flame, Dumbbell, Target, TrendingUp, Trophy, Calendar } from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { getCurrentWeek, getPhaseForWeek, totalWeeks } from '../utils/plan';

function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

function WeeklyChart({ sessions }: { sessions: Session[] }) {
  const weeklyData = useMemo(() => {
    const weeks = new Map<string, number>();
    for (const s of sessions) {
      const key = getWeekKey(new Date(s.date));
      weeks.set(key, (weeks.get(key) ?? 0) + 1);
    }
    const sorted = [...weeks.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.slice(-12);
  }, [sessions]);

  if (weeklyData.length === 0) return null;

  const maxVal = Math.max(...weeklyData.map(d => d[1]));

  return (
    <div className="chart">
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Workouts per Week</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
        {weeklyData.map(([week, count]) => (
          <div key={week} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{count}</span>
            <div style={{
              width: '100%',
              height: `${(count / maxVal) * 60}px`,
              background: 'var(--accent)',
              borderRadius: 4,
              minHeight: 4,
            }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {new Date(week).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MuscleVolumeChart({ sessions }: { sessions: Session[] }) {
  const allExercises = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const exMap = new Map(allExercises.map(e => [e.id!, e]));

  const volumeByMuscle = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      for (const se of s.exercises) {
        const ex = exMap.get(se.exerciseId);
        if (!ex) continue;
        for (const set of se.sets) {
          if (!set.isWorkingSet) continue;
          const vol = set.weight * set.reps;
          map.set(ex.muscleGroup, (map.get(ex.muscleGroup) ?? 0) + vol);
          if (ex.secondaryMuscleGroup) {
            map.set(ex.secondaryMuscleGroup, (map.get(ex.secondaryMuscleGroup) ?? 0) + vol * 0.5);
          }
        }
      }
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [sessions, exMap]);

  if (volumeByMuscle.length === 0) return null;

  const maxVol = volumeByMuscle[0][1];

  const formatVol = (v: number) => {
    if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
    return String(Math.round(v));
  };

  return (
    <div className="chart">
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Volume by Muscle Group (kg)</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {volumeByMuscle.map(([muscle, vol]) => (
          <div key={muscle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
              <span>{muscle}</span>
              <span style={{ color: 'var(--text-muted)' }}>{formatVol(vol)} kg</span>
            </div>
            <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(vol / maxVol) * 100}%`,
                background: 'var(--accent)',
                borderRadius: 4,
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlanProgressCard({ sessions }: { sessions: Session[] }) {
  const activeProgress = useLiveQuery(() => db.liftingPlanProgress.filter(p => p.active).first()) ?? null;
  const plan = useLiveQuery(
    async () => {
      if (!activeProgress) return null;
      return (await db.liftingPlans.get(activeProgress.planId)) ?? null;
    },
    [activeProgress?.planId],
  ) as LiftingPlan | null | undefined;
  const exercises = useLiveQuery(() => db.exercises.toArray()) ?? [];

  if (!plan) return null;

  const week = getCurrentWeek(plan);
  const phase = getPhaseForWeek(plan, week);
  const total = totalWeeks(plan);

  // Current best e10RM per target exercise
  const bestByEx = new Map<number, number>();
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const cur = bestByEx.get(ex.exerciseId) ?? 0;
      if (ex.e10RM > cur) bestByEx.set(ex.exerciseId, ex.e10RM);
    }
  }

  const exMap = new Map(exercises.map(e => [e.id!, e]));
  const timeRatio = total > 0 ? week / total : 0;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
        Plan Progress
      </div>
      <div className="title" style={{ fontSize: 15, marginBottom: 2 }}>
        {plan.name}
      </div>
      <div className="subtitle" style={{ marginBottom: 12 }}>
        {phase ? `${phase.name} · ` : ''}Week {week} of {total}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {plan.targets.map(t => {
          const ex = exMap.get(t.exerciseId);
          const current = bestByEx.get(t.exerciseId) ?? t.startWeight;
          const span = t.targetWeight - t.startWeight;
          const progressRatio = span > 0 ? Math.max(0, Math.min(1, (current - t.startWeight) / span)) : 0;
          const onTrack = progressRatio >= timeRatio - 0.05;
          return (
            <div key={t.exerciseId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span>{ex?.name ?? 'Unknown'}</span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {current.toFixed(1)} / {t.targetWeight} kg
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${progressRatio * 100}%`,
                  background: onTrack ? 'var(--accent)' : 'var(--yellow)',
                  borderRadius: 4,
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CompoundGoalsCard({ sessions }: { sessions: Session[] }) {
  const { rmMode } = useRMMode();
  const allExercises = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const latestBWEntry = useLiveQuery(() => db.bodyWeight.orderBy('date').reverse().first()) ?? null;
  const goals = loadCompoundGoals();

  const exIdByKey = useMemo(() => {
    const map = new Map<CompoundGoalKey, number>();
    for (const c of COMPOUND_DEFS) {
      const ex = allExercises.find(e => c.exactNames.includes(e.name.toLowerCase()));
      if (ex?.id != null) map.set(c.key, ex.id);
    }
    return map;
  }, [allExercises]);

  const bestByEx = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        const val = rmMode === 'e10RM' ? sessionE10RM(ex.sets) : sessionE1RM(ex.sets);
        const cur = map.get(ex.exerciseId) ?? 0;
        if (val > cur) map.set(ex.exerciseId, val);
      }
    }
    return map;
  }, [sessions, rmMode]);

  const hasAnyGoal = COMPOUND_DEFS.some(c => (goals[c.key] ?? 0) > 0);
  if (!hasAnyGoal) return null;

  const bw = latestBWEntry?.weight ?? null;

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
        Compound Goals · {rmMode}
      </div>
      {bw == null && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          Add your bodyweight in Settings to see goal progress.
        </p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {COMPOUND_DEFS.map(c => {
          const percent = goals[c.key];
          if (percent == null || percent <= 0) return null;
          const target = bw != null ? (bw * percent) / 100 : null;
          const exId = exIdByKey.get(c.key);
          const current = exId != null ? (bestByEx.get(exId) ?? 0) : 0;
          const ratio = target != null && target > 0 ? Math.min(1, current / target) : 0;
          const achieved = ratio >= 1;
          return (
            <div key={c.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: 600 }}>{c.label}</span>
                <span style={{ color: achieved ? 'var(--yellow)' : 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {current > 0 ? current.toFixed(1) : '—'} / {target != null ? target.toFixed(1) : '?'} kg
                  {achieved && <span style={{ marginLeft: 4, fontWeight: 700 }}>✓</span>}
                </span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${ratio * 100}%`,
                  background: achieved ? 'var(--yellow)' : 'var(--accent)',
                  borderRadius: 4,
                }} />
              </div>
              {target != null && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                  {(ratio * 100).toFixed(0)}% · target ×{(percent / 100).toFixed(2)} BW
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PersonalBests({ sessions, onSelectExercise }: {
  sessions: Session[];
  onSelectExercise: (id: number, name: string, best: number) => void;
}) {
  const allExercises = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const exMap = new Map(allExercises.map(e => [e.id!, e]));
  const { rmMode } = useRMMode();

  const bests = useMemo(() => {
    const map = new Map<number, { value: number; date: string; sessions: number }>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        const val = rmMode === 'e10RM' ? sessionE10RM(ex.sets) : sessionE1RM(ex.sets);
        if (val <= 0) continue;
        const current = map.get(ex.exerciseId);
        if (!current) {
          map.set(ex.exerciseId, { value: val, date: s.date, sessions: 1 });
        } else {
          current.sessions++;
          if (val > current.value) {
            current.value = val;
            current.date = s.date;
          }
        }
      }
    }
    return [...map.entries()]
      .map(([id, data]) => ({ id, name: exMap.get(id)?.name ?? 'Unknown', ...data }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [sessions, exMap, rmMode]);

  if (bests.length === 0) return null;

  return (
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Trophy size={18} color="var(--yellow)" /> Personal Bests ({rmMode})
      </h2>
      {bests.map((pb, i) => (
        <button
          key={i}
          className="list-item"
          style={{ width: '100%' }}
          onClick={() => onSelectExercise(pb.id, pb.name, pb.value)}
        >
          <div style={{ textAlign: 'left' }}>
            <div className="title">{pb.name}</div>
            <div className="subtitle">
              {new Date(pb.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <span className="num" style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>
            {pb.value.toFixed(1)}
          </span>
        </button>
      ))}
    </div>
  );
}

export function StatsScreen() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray()) ?? [];
  const [selectedExercise, setSelectedExercise] = useState<{ id: number; name: string; best: number } | null>(null);

  const stats = useMemo(() => {
    let totalSets = 0;
    let totalReps = 0;
    let totalWeight = 0;
    let totalWorkingSets = 0;

    for (const s of sessions) {
      for (const ex of s.exercises) {
        for (const set of ex.sets) {
          totalSets++;
          totalReps += set.reps;
          totalWeight += set.weight * set.reps;
          if (set.isWorkingSet) totalWorkingSets++;
        }
      }
    }

    // Week streak: consecutive weeks (ending this week or last week) with >=1 session
    const weeksSeen = new Set<string>();
    for (const s of sessions) {
      weeksSeen.add(getWeekKey(new Date(s.date)));
    }
    let streak = 0;
    const cursor = new Date();
    cursor.setHours(12, 0, 0, 0); // avoid DST edge cases
    // If this week has no sessions yet, start counting from last week so the streak isn't broken mid-week
    if (!weeksSeen.has(getWeekKey(cursor))) {
      cursor.setDate(cursor.getDate() - 7);
    }
    while (weeksSeen.has(getWeekKey(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 7);
    }

    // Average sessions per week
    let avgPerWeek = 0;
    if (sessions.length >= 2) {
      const oldest = new Date(sessions[sessions.length - 1].date);
      const newest = new Date(sessions[0].date);
      const weeks = Math.max(1, (newest.getTime() - oldest.getTime()) / (7 * 24 * 60 * 60 * 1000));
      avgPerWeek = sessions.length / weeks;
    }

    // This month sessions
    const now = new Date();
    const thisMonth = sessions.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return {
      totalWorkouts: sessions.length,
      totalSets,
      totalReps,
      totalWeight,
      totalWorkingSets,
      streak,
      avgPerWeek,
      thisMonth,
    };
  }, [sessions]);

  const formatWeight = (kg: number) => {
    if (kg >= 1000000) return `${(kg / 1000000).toFixed(1)}M kg`;
    if (kg >= 1000) return `${(kg / 1000).toFixed(1)}K kg`;
    return `${Math.round(kg)} kg`;
  };

  if (selectedExercise) {
    return (
      <div className="screen">
        <ExerciseDetail
          exerciseId={selectedExercise.id}
          backLabel="Personal Bests"
          onBack={() => setSelectedExercise(null)}
        />
      </div>
    );
  }

  return (
    <div className="screen">
      <h1>Stats</h1>

      {sessions.length === 0 ? (
        <div className="empty">
          <TrendingUp size={28} />
          <div className="empty-title">No numbers yet</div>
          <p>Finish a workout and your stats start here.</p>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <StatCard icon={Dumbbell} label="Total Workouts" value={stats.totalWorkouts} />
            <StatCard icon={Flame} label="Week Streak" value={stats.streak} sub={stats.streak === 1 ? 'week' : 'weeks'} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <StatCard icon={Target} label="Total Sets" value={stats.totalSets.toLocaleString()} sub={`${stats.totalWorkingSets.toLocaleString()} working`} />
            <StatCard icon={TrendingUp} label="Total Reps" value={stats.totalReps.toLocaleString()} />
          </div>

          <StatCard icon={Dumbbell} label="Total Volume Lifted" value={formatWeight(stats.totalWeight)} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16, marginTop: 8 }}>
            <StatCard icon={Calendar} label="This Month" value={stats.thisMonth} sub="sessions" />
            <StatCard icon={TrendingUp} label="Avg / Week" value={stats.avgPerWeek.toFixed(1)} sub="sessions" />
          </div>

          <PlanProgressCard sessions={sessions} />

          <WeeklyChart sessions={sessions} />

          <div style={{ marginTop: 16 }}>
            <MuscleVolumeChart sessions={sessions} />
          </div>

          <div style={{ marginTop: 16 }}>
            <CompoundGoalsCard sessions={sessions} />
            <PersonalBests
              sessions={sessions}
              onSelectExercise={(id, name, best) => setSelectedExercise({ id, name, best })}
            />
          </div>
        </>
      )}
    </div>
  );
}
