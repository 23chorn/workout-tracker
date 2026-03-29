import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Session, type RowingSession } from '../db/database';
import { ChevronLeft, ChevronRight, Calendar, List, Trash2, Pencil, Dumbbell, Waves } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { sessionE10RM } from '../utils/e10rm';
import { isRowingEnabled } from '../App';

type FilterType = 'all' | 'lift' | 'rowing';

function formatSplit(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

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

function CalendarView({ sessions, sessionsByDate, rowingByDate, onSelectDate }: {
  sessions: Session[];
  sessionsByDate: Map<string, Session[]>;
  rowingByDate: Map<string, RowingSession[]>;
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
          const dayRowing = rowingByDate.get(dateKey);
          const hasLift = !!daySessions && daySessions.length > 0;
          const hasRowing = !!dayRowing && dayRowing.length > 0;
          const hasAny = hasLift || hasRowing;
          const hasBoth = hasLift && hasRowing;
          const isToday = dateKey === today;

          let bg = isToday ? 'var(--bg-input)' : 'transparent';
          if (hasBoth) {
            bg = 'linear-gradient(135deg, var(--accent) 50%, var(--green) 50%)';
          } else if (hasLift) {
            bg = 'var(--accent)';
          } else if (hasRowing) {
            bg = 'var(--green)';
          }

          return (
            <button
              key={i}
              onClick={() => hasAny && daySessions && onSelectDate(daySessions)}
              style={{
                aspectRatio: '1',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: isToday ? 700 : 400,
                color: hasAny ? 'var(--text)' : 'var(--text-muted)',
                background: bg,
                border: isToday && !hasAny ? '1px solid var(--border)' : 'none',
                cursor: hasAny ? 'pointer' : 'default',
                position: 'relative',
                minHeight: 40,
              }}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Month summary + legend */}
      {(() => {
        const monthLift = sessions.filter(s => {
          const d = new Date(s.date);
          return d.getMonth() === month && d.getFullYear() === year;
        }).length;
        const allRowingDates = [...rowingByDate.entries()];
        const monthRowing = allRowingDates.filter(([key]) => {
          const d = new Date(key);
          return d.getMonth() === month && d.getFullYear() === year;
        }).reduce((sum, [, arr]) => sum + arr.length, 0);
        return (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ marginBottom: 4 }}>
              {monthLift + monthRowing} session{monthLift + monthRowing !== 1 ? 's' : ''} in {viewDate.toLocaleDateString(undefined, { month: 'long' })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--accent)', marginRight: 4, verticalAlign: 'middle' }} />Lift</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: 'var(--green)', marginRight: 4, verticalAlign: 'middle' }} />Rowing</span>
            </div>
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSets, setEditSets] = useState<{ weight: string; reps: string; isWorkingSet: boolean }[][]>([]);

  const startEditing = () => {
    setEditSets(selected.exercises.map(se =>
      se.sets.map(s => ({ weight: String(s.weight), reps: String(s.reps), isWorkingSet: s.isWorkingSet }))
    ));
    setEditing(true);
  };

  const saveEdits = async () => {
    if (!selected.id) return;
    const updatedExercises = selected.exercises.map((se, exIdx) => {
      const sets = editSets[exIdx].filter(s => s.weight && s.reps).map(s => ({
        weight: parseFloat(s.weight),
        reps: parseInt(s.reps),
        isWorkingSet: s.isWorkingSet,
      }));
      return { ...se, sets, e10RM: sessionE10RM(sets) };
    });
    await db.sessions.update(selected.id, { exercises: updatedExercises });
    setSelected({ ...selected, exercises: updatedExercises });
    setEditing(false);
  };

  const updateEditSet = (exIdx: number, setIdx: number, field: 'weight' | 'reps', value: string) => {
    setEditSets(prev => {
      const next = prev.map(e => [...e]);
      next[exIdx][setIdx] = { ...next[exIdx][setIdx], [field]: value };
      return next;
    });
  };

  const toggleEditWorking = (exIdx: number, setIdx: number) => {
    setEditSets(prev => {
      const next = prev.map(e => [...e]);
      next[exIdx][setIdx] = { ...next[exIdx][setIdx], isWorkingSet: !next[exIdx][setIdx].isWorkingSet };
      return next;
    });
  };

  const deleteSession = async () => {
    if (!selected.id) return;
    await db.sessions.delete(selected.id);
    setShowDeleteConfirm(false);
    onBack();
  };

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
        {selected.durationMinutes != null && <> &middot; {selected.durationMinutes}m</>}
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

      {!editing && (
        <button className="btn btn-sm btn-secondary mb-md" onClick={startEditing}>
          <Pencil size={14} /> Edit Session
        </button>
      )}
      {editing && (
        <div className="row" style={{ marginBottom: 12 }}>
          <button className="btn btn-sm btn-secondary" style={{ flex: 1 }} onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn btn-sm btn-primary" style={{ flex: 1 }} onClick={saveEdits}>Save Changes</button>
        </div>
      )}

      {selected.exercises.map((se, exIdx) => {
        const exercise = exMap.get(se.exerciseId);
        const isPB = se.e10RM > 0 && se.e10RM >= (allTimeBest.get(se.exerciseId) ?? 0);

        return (
          <div className="exercise-card" key={exIdx}>
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
            <div className="set-labels" style={editing ? { gridTemplateColumns: '40px 1fr 1fr 48px' } : undefined}>
              <span>Set</span>
              <span>kg</span>
              <span>Reps</span>
              <span>{editing ? 'W' : 'Type'}</span>
            </div>
            {editing ? (
              editSets[exIdx]?.map((set, si) => (
                <div className="set-row" key={si} style={{ marginBottom: 4 }}>
                  <span className="set-num">{si + 1}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={set.weight}
                    onChange={e => updateEditSet(exIdx, si, 'weight', e.target.value)}
                    style={{ padding: 6, textAlign: 'center', fontSize: 14 }}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps}
                    onChange={e => updateEditSet(exIdx, si, 'reps', e.target.value)}
                    style={{ padding: 6, textAlign: 'center', fontSize: 14 }}
                  />
                  <button
                    className={`working-toggle ${set.isWorkingSet ? 'active' : ''}`}
                    onClick={() => toggleEditWorking(exIdx, si)}
                    style={{ width: 32, height: 32 }}
                  >
                    {set.isWorkingSet ? 'W' : 'WU'}
                  </button>
                </div>
              ))
            ) : (
              se.sets.map((set, si) => (
                <div className="set-row" key={si} style={{ marginBottom: 4 }}>
                  <span className="set-num">{si + 1}</span>
                  <span style={{ textAlign: 'center' }}>{set.weight}</span>
                  <span style={{ textAlign: 'center' }}>{set.reps}</span>
                  <span style={{ textAlign: 'center', fontSize: 12, color: set.isWorkingSet ? 'var(--accent)' : 'var(--text-muted)' }}>
                    {set.isWorkingSet ? 'W' : 'WU'}
                  </span>
                </div>
              ))
            )}
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

      <button
        className="btn btn-danger btn-full"
        style={{ marginTop: 24 }}
        onClick={() => setShowDeleteConfirm(true)}
      >
        <Trash2 size={14} /> Delete Session
      </button>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Session"
          message={`Delete this ${selected.dayLabel} session from ${new Date(selected.date).toLocaleDateString()}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={deleteSession}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function RowingSessionDetail({ session: rs, onBack }: {
  session: RowingSession;
  onBack: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const deleteRowingSession = async () => {
    if (!rs.id) return;
    await db.rowingSessions.delete(rs.id);
    setShowDeleteConfirm(false);
    onBack();
  };

  const tl = (t: string) => t === 'steady' ? 'Steady State' : t === 'distance' ? 'Distance' : 'Intervals';

  return (
    <div className="screen">
      <button className="btn btn-sm btn-secondary mb-md" onClick={onBack}>
        <ChevronLeft size={16} /> Back
      </button>

      <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Waves size={22} color="var(--green)" />
        {tl(rs.type)}
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
        {new Date(rs.date).toLocaleDateString(undefined, {
          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        })}
        {rs.week && ` · Pete Plan Week ${rs.week}`}
        {rs.totalTime != null && ` · ${rs.totalTime}m`}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {rs.totalDistance != null && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Distance</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{rs.totalDistance.toLocaleString()}m</div>
          </div>
        )}
        {rs.avgSplit != null && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Avg Split</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>{formatSplit(rs.avgSplit)}<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>/500m</span></div>
          </div>
        )}
        {rs.totalTime != null && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Time</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{rs.totalTime} min</div>
          </div>
        )}
        {rs.avgSPM != null && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>SPM</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{rs.avgSPM}</div>
          </div>
        )}
        {rs.calories != null && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Calories</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{rs.calories}</div>
          </div>
        )}
        {rs.hr != null && (
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Heart Rate</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{rs.hr} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>bpm</span></div>
          </div>
        )}
      </div>

      {rs.intervals && rs.intervals.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>Intervals</div>
          <div className="set-labels" style={{ gridTemplateColumns: '32px 1fr 1fr 1fr 1fr' }}>
            <span>Rep</span>
            <span>Dist</span>
            <span>Time</span>
            <span>Split</span>
            <span>SPM</span>
          </div>
          {rs.intervals.map((iv, idx) => (
            <div key={idx} className="set-row" style={{ gridTemplateColumns: '32px 1fr 1fr 1fr 1fr', marginBottom: 2 }}>
              <span className="set-num">{iv.rep}</span>
              <span style={{ textAlign: 'center', fontSize: 13 }}>{iv.distance ?? '—'}m</span>
              <span style={{ textAlign: 'center', fontSize: 13 }}>{iv.time ? `${iv.time}s` : '—'}</span>
              <span style={{ textAlign: 'center', fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>{formatSplit(iv.split)}</span>
              <span style={{ textAlign: 'center', fontSize: 13 }}>{iv.spm ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      <button
        className="btn btn-danger btn-full"
        style={{ marginTop: 16 }}
        onClick={() => setShowDeleteConfirm(true)}
      >
        <Trash2 size={14} /> Delete Session
      </button>

      {showDeleteConfirm && (
        <ConfirmDialog
          title="Delete Rowing Session"
          message={`Delete this ${tl(rs.type)} session from ${new Date(rs.date).toLocaleDateString()}? This cannot be undone.`}
          confirmLabel="Delete"
          destructive
          onConfirm={deleteRowingSession}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

// Unified item for the combined list
type ListItem =
  | { kind: 'lift'; session: Session; date: Date }
  | { kind: 'rowing'; session: RowingSession; date: Date };

const typeLabel = (t: string) => t === 'steady' ? 'Steady State' : t === 'distance' ? 'Distance' : 'Intervals';

export function HistoryScreen() {
  const sessions = useLiveQuery(() => db.sessions.orderBy('date').reverse().toArray()) ?? [];
  const rowingSessions = useLiveQuery(() => db.rowingSessions.orderBy('date').reverse().toArray()) ?? [];
  const allExercises = useLiveQuery(() => db.exercises.toArray()) ?? [];
  const workouts = useLiveQuery(() => db.workouts.toArray()) ?? [];
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedDaySessions, setSelectedDaySessions] = useState<Session[] | null>(null);
  const [selectedRowingSession, setSelectedRowingSession] = useState<RowingSession | null>(null);
  const showRowing = isRowingEnabled();

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

  const rowingByDate = useMemo(() => {
    const map = new Map<string, RowingSession[]>();
    for (const s of rowingSessions) {
      const key = toDateKey(new Date(s.date));
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [rowingSessions]);

  // Combined and sorted list
  const combinedList = useMemo(() => {
    const items: ListItem[] = [];
    if (filter !== 'rowing') {
      for (const s of sessions) items.push({ kind: 'lift', session: s, date: new Date(s.date) });
    }
    if (filter !== 'lift' && showRowing) {
      for (const s of rowingSessions) items.push({ kind: 'rowing', session: s, date: new Date(s.date) });
    }
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [sessions, rowingSessions, filter, showRowing]);

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

  if (selectedRowingSession) {
    return (
      <RowingSessionDetail
        session={selectedRowingSession}
        onBack={() => setSelectedRowingSession(null)}
      />
    );
  }

  const totalSessions = sessions.length + (showRowing ? rowingSessions.length : 0);

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

      {/* Filter chips — only show if rowing is enabled */}
      {showRowing && view === 'list' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['all', 'lift', 'rowing'] as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: '1px solid var(--border)',
                background: filter === f
                  ? f === 'rowing' ? 'var(--green)' : f === 'lift' ? 'var(--accent)' : 'var(--accent)'
                  : 'var(--bg-input)',
                color: filter === f ? 'white' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'All' : f === 'lift' ? 'Lift' : 'Rowing'}
            </button>
          ))}
        </div>
      )}

      {totalSessions === 0 ? (
        <div className="empty">
          <p>No sessions recorded yet. Start a workout in the Today tab.</p>
        </div>
      ) : view === 'calendar' ? (
        <CalendarView
          sessions={sessions}
          sessionsByDate={sessionsByDate}
          rowingByDate={showRowing ? rowingByDate : new Map()}
          onSelectDate={setSelectedDaySessions}
        />
      ) : (
        combinedList.map((item) => {
          if (item.kind === 'lift') {
            const session = item.session;
            const wk = wkMap.get(session.workoutId);
            const hasPB = session.exercises.some(
              se => se.e10RM > 0 && se.e10RM >= (allTimeBest.get(se.exerciseId) ?? 0)
            );
            return (
              <button
                key={`lift-${session.id}`}
                className="list-item"
                style={{ width: '100%' }}
                onClick={() => setSelectedDaySessions([session])}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{
                    width: 6, height: 32, borderRadius: 3, background: 'var(--accent)', flexShrink: 0,
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div className="title">
                      <Dumbbell size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                      {session.dayLabel}
                      {hasPB && <span className="pb-badge">PB</span>}
                    </div>
                    <div className="subtitle">
                      {item.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {wk && ` — ${wk.name}`}
                      {session.durationMinutes != null && ` · ${session.durationMinutes}m`}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </button>
            );
          } else {
            const rs = item.session;
            return (
              <button
                key={`row-${rs.id}`}
                className="list-item"
                style={{ width: '100%' }}
                onClick={() => setSelectedRowingSession(rs)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{
                    width: 6, height: 32, borderRadius: 3, background: 'var(--green)', flexShrink: 0,
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div className="title">
                      <Waves size={13} style={{ marginRight: 4, verticalAlign: -2 }} />
                      {typeLabel(rs.type)}
                      {rs.week && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}> · Wk {rs.week}</span>}
                    </div>
                    <div className="subtitle">
                      {item.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      {rs.totalDistance && ` · ${rs.totalDistance}m`}
                      {rs.avgSplit && ` · ${formatSplit(rs.avgSplit)}/500m`}
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </button>
            );
          }
        })
      )}
    </div>
  );
}
