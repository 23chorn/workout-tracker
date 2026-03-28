import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Session } from '../db/database';
import { ExerciseDetail } from '../components/ExerciseDetail';
import { Flame, Dumbbell, Target, TrendingUp, Trophy, Calendar } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub }: {
  icon: React.ComponentType<{ size: number; color?: string }>;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: 'var(--bg-input)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color="var(--accent)" />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

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

function PersonalBests({ sessions, onSelectExercise }: {
  sessions: Session[];
  onSelectExercise: (id: number, name: string, best: number) => void;
}) {
  const allExercises = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const exMap = new Map(allExercises.map(e => [e.id!, e]));

  const bests = useMemo(() => {
    const map = new Map<number, { e10RM: number; date: string }>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        if (ex.e10RM <= 0) continue;
        const current = map.get(ex.exerciseId);
        if (!current || ex.e10RM > current.e10RM) {
          map.set(ex.exerciseId, { e10RM: ex.e10RM, date: s.date });
        }
      }
    }
    return [...map.entries()]
      .map(([id, data]) => ({ id, name: exMap.get(id)?.name ?? 'Unknown', ...data }))
      .sort((a, b) => b.e10RM - a.e10RM)
      .slice(0, 10);
  }, [sessions, exMap]);

  if (bests.length === 0) return null;

  return (
    <div>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Trophy size={18} color="var(--yellow)" /> Personal Bests (e10RM)
      </h2>
      {bests.map((pb, i) => (
        <button
          key={i}
          className="list-item"
          style={{ width: '100%' }}
          onClick={() => onSelectExercise(pb.id, pb.name, pb.e10RM)}
        >
          <div style={{ textAlign: 'left' }}>
            <div className="title">{pb.name}</div>
            <div className="subtitle">
              {new Date(pb.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>
            {pb.e10RM.toFixed(1)}
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

    // Week streak: consecutive weeks with at least 1 session
    const weeksSeen = new Set<string>();
    for (const s of sessions) {
      weeksSeen.add(getWeekKey(new Date(s.date)));
    }
    const sortedWeeks = [...weeksSeen].sort().reverse();
    let streak = 0;
    const currentWeek = getWeekKey(new Date());
    for (let i = 0; i < sortedWeeks.length; i++) {
      const expected = new Date(currentWeek);
      expected.setDate(expected.getDate() - i * 7);
      const expectedKey = getWeekKey(expected);
      if (sortedWeeks[i] === expectedKey) {
        streak++;
      } else {
        break;
      }
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
          <p>Complete your first workout to see stats.</p>
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

          <WeeklyChart sessions={sessions} />

          <div style={{ marginTop: 16 }}>
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
