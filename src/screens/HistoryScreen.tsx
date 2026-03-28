import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Session } from '../db/database';
import { ChevronLeft, ChevronRight, Calendar, List } from 'lucide-react';

function E10RMChart({ exerciseId, exerciseName, sessions }: {
  exerciseId: number;
  exerciseName: string;
  sessions: Session[];
}) {
  const dataPoints = sessions
    .filter(s => s.exercises.some(e => e.exerciseId === exerciseId))
    .map(s => {
      const ex = s.exercises.find(e => e.exerciseId === exerciseId)!;
      return { date: new Date(s.date), e10RM: ex.e10RM };
    })
    .filter(d => d.e10RM > 0)
    .reverse();

  if (dataPoints.length < 2) return null;

  const maxVal = Math.max(...dataPoints.map(d => d.e10RM));
  const minVal = Math.min(...dataPoints.map(d => d.e10RM));
  const range = maxVal - minVal || 1;

  const w = 300;
  const h = 120;
  const pad = 20;

  const points = dataPoints.map((d, i) => {
    const x = pad + (i / (dataPoints.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.e10RM - minVal) / range) * (h - pad * 2);
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <div className="chart">
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{exerciseName} — e10RM</div>
      <svg viewBox={`0 0 ${w} ${h}`} height={h}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--border)" strokeWidth="1" />
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />
        ))}
        <text x={pad} y={h - 4} fill="var(--text-muted)" fontSize="9">
          {dataPoints[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </text>
        <text x={w - pad} y={h - 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">
          {dataPoints[dataPoints.length - 1].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </text>
        <text x={pad - 4} y={pad + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">
          {maxVal.toFixed(1)}
        </text>
        <text x={pad - 4} y={h - pad} fill="var(--text-muted)" fontSize="9" textAnchor="end">
          {minVal.toFixed(1)}
        </text>
      </svg>
    </div>
  );
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function CalendarView({ sessions, sessionsByDate, onSelectDate }: {
  sessions: Session[];
  sessionsByDate: Map<string, Session[]>;
  onSelectDate: (sessions: Session[]) => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7; // Monday start
  const totalDays = lastDay.getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const today = toDateKey(new Date());

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= totalDays; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="row-between mb-md">
        <button className="btn btn-sm btn-secondary" onClick={prevMonth}>
          <ChevronLeft size={16} />
        </button>
        <span style={{ fontWeight: 600, fontSize: 16 }}>{monthLabel}</span>
        <button className="btn btn-sm btn-secondary" onClick={nextMonth}>
          <ChevronRight size={16} />
        </button>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2,
        textAlign: 'center',
        marginBottom: 4,
      }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0', fontWeight: 600 }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: 2,
      }}>
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={i} />;

          const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const daySessions = sessionsByDate.get(dateKey);
          const hasSession = !!daySessions && daySessions.length > 0;
          const isToday = dateKey === today;

          return (
            <button
              key={i}
              onClick={() => daySessions && onSelectDate(daySessions)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isToday ? 700 : 400,
                color: hasSession ? 'var(--text)' : 'var(--text-muted)',
                background: hasSession ? 'var(--accent)' : isToday ? 'var(--bg-input)' : 'transparent',
                border: isToday && !hasSession ? '1px solid var(--border)' : 'none',
                cursor: hasSession ? 'pointer' : 'default',
                position: 'relative',
                minHeight: 40,
              }}
            >
              {day}
              {hasSession && daySessions.length > 1 && (
                <span style={{ fontSize: 9, opacity: 0.8 }}>{daySessions.length}x</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Month summary */}
      {(() => {
        const monthSessions = sessions.filter(s => {
          const d = new Date(s.date);
          return d.getMonth() === month && d.getFullYear() === year;
        });
        return (
          <div style={{
            marginTop: 12, padding: '8px 0', fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
          }}>
            {monthSessions.length} session{monthSessions.length !== 1 ? 's' : ''} in {viewDate.toLocaleDateString(undefined, { month: 'long' })}
          </div>
        );
      })()}
    </div>
  );
}

function SessionDetail({ sessions: daySessions, allSessions, exMap, allTimeBest, onBack }: {
  sessions: Session[];
  allSessions: Session[];
  exMap: Map<number, { name: string }>;
  allTimeBest: Map<number, number>;
  onBack: () => void;
}) {
  const [selected, setSelected] = useState<Session>(daySessions[0]);

  return (
    <div className="screen">
      <button className="btn btn-sm btn-secondary mb-md" onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>

      <h1>{selected.dayLabel}</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        {new Date(selected.date).toLocaleDateString(undefined, {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}
      </p>

      {daySessions.length > 1 && (
        <div className="sub-tabs" style={{ marginBottom: 16 }}>
          {daySessions.map((s) => (
            <button
              key={s.id}
              className={`sub-tab ${selected.id === s.id ? 'active' : ''}`}
              onClick={() => setSelected(s)}
            >
              {s.dayLabel}
            </button>
          ))}
        </div>
      )}

      {selected.exercises.map((se, idx) => {
        const exercise = exMap.get(se.exerciseId);
        const isPB = se.e10RM > 0 && se.e10RM >= (allTimeBest.get(se.exerciseId) ?? 0);

        return (
          <div className="exercise-card" key={idx}>
            <div className="exercise-card-header">
              <div>
                <h3>
                  {exercise?.name ?? 'Unknown'}
                  {isPB && <span className="pb-badge">PB</span>}
                </h3>
              </div>
              {se.e10RM > 0 && (
                <span className="badge badge-accent">e10RM: {se.e10RM.toFixed(1)}</span>
              )}
            </div>
            <div className="set-labels">
              <span>Set</span>
              <span>kg</span>
              <span>Reps</span>
              <span>Type</span>
            </div>
            {se.sets.map((set, si) => (
              <div className="set-row" key={si} style={{ marginBottom: 4 }}>
                <span className="set-num">{si + 1}</span>
                <span style={{ textAlign: 'center' }}>{set.weight}</span>
                <span style={{ textAlign: 'center' }}>{set.reps}</span>
                <span style={{ textAlign: 'center', fontSize: 12, color: set.isWorkingSet ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {set.isWorkingSet ? 'W' : 'WU'}
                </span>
              </div>
            ))}
          </div>
        );
      })}

      <h2 style={{ marginTop: 24 }}>Trends</h2>
      {selected.exercises.map((se, idx) => (
        <E10RMChart
          key={idx}
          exerciseId={se.exerciseId}
          exerciseName={exMap.get(se.exerciseId)?.name ?? 'Unknown'}
          sessions={allSessions}
        />
      ))}
    </div>
  );
}

export function HistoryScreen() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray()) ?? [];
  const allExercises = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedDaySessions, setSelectedDaySessions] = useState<Session[] | null>(null);

  const exMap = new Map(allExercises.map(e => [e.id!, e]));
  const wkMap = new Map(workouts.map(w => [w.id!, w]));

  const allTimeBest = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of sessions) {
      for (const ex of s.exercises) {
        const current = map.get(ex.exerciseId) ?? 0;
        if (ex.e10RM > current) map.set(ex.exerciseId, ex.e10RM);
      }
    }
    return map;
  }, [sessions]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) {
      const key = toDateKey(new Date(s.date));
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [sessions]);

  if (selectedDaySessions) {
    return (
      <SessionDetail
        sessions={selectedDaySessions}
        allSessions={sessions}
        exMap={exMap}
        allTimeBest={allTimeBest}
        onBack={() => setSelectedDaySessions(null)}
      />
    );
  }

  return (
    <div className="screen">
      <div className="row-between mb-md">
        <h1 style={{ marginBottom: 0 }}>History</h1>
        <div className="row gap-sm">
          <button
            className={`btn btn-sm ${view === 'calendar' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('calendar')}
          >
            <Calendar size={14} />
          </button>
          <button
            className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setView('list')}
          >
            <List size={14} />
          </button>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="empty">
          <p>No sessions recorded yet. Start a workout in the Today tab.</p>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView
          sessions={sessions}
          sessionsByDate={sessionsByDate}
          onSelectDate={setSelectedDaySessions}
        />
      ) : (
        sessions.map(session => {
          const wk = wkMap.get(session.workoutId);
          const hasPB = session.exercises.some(
            se => se.e10RM > 0 && se.e10RM >= (allTimeBest.get(se.exerciseId) ?? 0)
          );

          return (
            <button
              key={session.id}
              className="list-item"
              style={{ width: '100%' }}
              onClick={() => setSelectedDaySessions([session])}
            >
              <div style={{ textAlign: 'left' }}>
                <div className="title">
                  {session.dayLabel}
                  {hasPB && <span className="pb-badge">PB</span>}
                </div>
                <div className="subtitle">
                  {new Date(session.date).toLocaleDateString(undefined, {
                    weekday: 'short', month: 'short', day: 'numeric'
                  })}
                  {wk && ` — ${wk.name}`}
                </div>
              </div>
              <ChevronRight size={18} color="var(--text-muted)" />
            </button>
          );
        })
      )}
    </div>
  );
}
