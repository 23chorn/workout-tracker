import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Session, type RowingSession } from '../db/database';
import { toDateKey, formatSplit } from '../utils/date';
import { isRowingEnabled } from '../App';
import { CalendarView } from '../components/history/CalendarView';
import { SessionDetail } from '../components/history/SessionDetail';
import { RowingSessionDetail } from '../components/history/RowingSessionDetail';
import { LogPastSession } from '../components/history/LogPastSession';
import { ChevronLeft, ChevronRight, Calendar, List, Dumbbell, Waves, Plus } from 'lucide-react';

type FilterType = 'all' | 'lift' | 'rowing';
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
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [showLogPast, setShowLogPast] = useState(false);
  const showRowing = isRowingEnabled();

  const exMap = new Map(allExercises.map(e => [e.id!, e]));
  const wkMap = new Map(workouts.map(w => [w.id!, w]));

  const allTimeBest = useMemo(() => {
    const map = new Map<number, number>();
    for (const s of sessions) { for (const ex of s.exercises) { const c = map.get(ex.exerciseId) ?? 0; if (ex.e10RM > c) map.set(ex.exerciseId, ex.e10RM); } }
    return map;
  }, [sessions]);

  const sessionsByDate = useMemo(() => {
    const map = new Map<string, Session[]>();
    for (const s of sessions) { const key = toDateKey(new Date(s.date)); const arr = map.get(key) ?? []; arr.push(s); map.set(key, arr); }
    return map;
  }, [sessions]);

  const rowingByDate = useMemo(() => {
    const map = new Map<string, RowingSession[]>();
    for (const s of rowingSessions) { const key = toDateKey(new Date(s.date)); const arr = map.get(key) ?? []; arr.push(s); map.set(key, arr); }
    return map;
  }, [rowingSessions]);

  const combinedList = useMemo(() => {
    const items: ListItem[] = [];
    if (filter !== 'rowing') { for (const s of sessions) items.push({ kind: 'lift', session: s, date: new Date(s.date) }); }
    if (filter !== 'lift' && showRowing) { for (const s of rowingSessions) items.push({ kind: 'rowing', session: s, date: new Date(s.date) }); }
    items.sort((a, b) => b.date.getTime() - a.date.getTime());
    return items;
  }, [sessions, rowingSessions, filter, showRowing]);

  // Day picker: show options when a calendar date has both lift and rowing
  const selectedDateLift = selectedDateKey ? sessionsByDate.get(selectedDateKey) ?? [] : [];
  const selectedDateRowing = selectedDateKey ? rowingByDate.get(selectedDateKey) ?? [] : [];

  if (showLogPast) {
    return <LogPastSession onBack={() => setShowLogPast(false)} onSaved={() => setShowLogPast(false)} />;
  }

  if (selectedDateKey && (selectedDateLift.length > 0 || selectedDateRowing.length > 0)) {
    // If only one type, go straight to it
    if (selectedDateLift.length > 0 && selectedDateRowing.length === 0) {
      return <SessionDetail sessions={selectedDateLift} allSessions={sessions} exMap={exMap} allTimeBest={allTimeBest} onBack={() => setSelectedDateKey(null)} />;
    }
    if (selectedDateRowing.length > 0 && selectedDateLift.length === 0) {
      return <RowingSessionDetail session={selectedDateRowing[0]} onBack={() => setSelectedDateKey(null)} />;
    }
    // Both types — show picker
    return (
      <div className="screen">
        <button className="btn btn-sm btn-secondary mb-md" onClick={() => setSelectedDateKey(null)}>
          <ChevronLeft size={16} /> Back
        </button>
        <h1>{new Date(selectedDateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>Two session types on this day</p>

        {selectedDateLift.map((s, i) => (
          <button key={`lift-${i}`} className="card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 8 }} onClick={() => { setSelectedDaySessions(selectedDateLift); setSelectedDateKey(null); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 32, borderRadius: 3, background: 'var(--accent)', flexShrink: 0 }} />
              <div>
                <div className="title"><Dumbbell size={13} style={{ marginRight: 4, verticalAlign: -2 }} />{s.dayLabel}</div>
                <div className="subtitle">{wkMap.get(s.workoutId)?.name}{s.durationMinutes != null && ` · ${s.durationMinutes}m`}</div>
              </div>
            </div>
          </button>
        ))}

        {selectedDateRowing.map((rs, i) => (
          <button key={`row-${i}`} className="card" style={{ width: '100%', textAlign: 'left', cursor: 'pointer', marginBottom: 8 }} onClick={() => { setSelectedRowingSession(rs); setSelectedDateKey(null); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 6, height: 32, borderRadius: 3, background: 'var(--green)', flexShrink: 0 }} />
              <div>
                <div className="title"><Waves size={13} style={{ marginRight: 4, verticalAlign: -2 }} />{rs.type === 'steady' ? 'Steady State' : rs.type === 'distance' ? 'Distance' : 'Intervals'}</div>
                <div className="subtitle">{rs.totalDistance && `${rs.totalDistance}m`}{rs.avgSplit && ` · ${formatSplit(rs.avgSplit)}/500m`}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    );
  }

  if (selectedDaySessions) {
    return <SessionDetail sessions={selectedDaySessions} allSessions={sessions} exMap={exMap} allTimeBest={allTimeBest} onBack={() => setSelectedDaySessions(null)} />;
  }

  if (selectedRowingSession) {
    return <RowingSessionDetail session={selectedRowingSession} onBack={() => setSelectedRowingSession(null)} />;
  }

  const totalSessions = sessions.length + (showRowing ? rowingSessions.length : 0);

  return (
    <div className="screen">
      <div className="row-between mb-md">
        <h1 style={{ marginBottom: 0 }}>History</h1>
        <div className="row gap-sm">
          <button className="btn btn-sm btn-secondary" onClick={() => setShowLogPast(true)}><Plus size={14} /></button>
          <button className={`btn btn-sm ${view === 'calendar' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('calendar')}><Calendar size={14} /></button>
          <button className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('list')}><List size={14} /></button>
        </div>
      </div>

      {showRowing && view === 'list' && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['all', 'lift', 'rowing'] as FilterType[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: '1px solid var(--border)',
              background: filter === f ? (f === 'rowing' ? 'var(--green)' : 'var(--accent)') : 'var(--bg-input)',
              color: filter === f ? 'white' : 'var(--text-muted)', cursor: 'pointer',
            }}>
              {f === 'all' ? 'All' : f === 'lift' ? 'Lift' : 'Rowing'}
            </button>
          ))}
        </div>
      )}

      {totalSessions === 0 ? (
        <div className="empty"><p>No sessions recorded yet. Start a workout in the Today tab.</p></div>
      ) : view === 'calendar' ? (
        <CalendarView sessions={sessions} sessionsByDate={sessionsByDate} rowingByDate={showRowing ? rowingByDate : new Map()} onSelectDate={setSelectedDateKey} />
      ) : (
        combinedList.map((item) => {
          if (item.kind === 'lift') {
            const session = item.session;
            const wk = wkMap.get(session.workoutId);
            const hasPB = session.exercises.some(se => se.e10RM > 0 && se.e10RM >= (allTimeBest.get(se.exerciseId) ?? 0));
            return (
              <button key={`lift-${session.id}`} className="list-item" style={{ width: '100%' }} onClick={() => setSelectedDaySessions([session])}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{ width: 6, height: 32, borderRadius: 3, background: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div className="title"><Dumbbell size={13} style={{ marginRight: 4, verticalAlign: -2 }} />{session.dayLabel}{hasPB && <span className="pb-badge">PB</span>}</div>
                    <div className="subtitle">{item.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{wk && ` — ${wk.name}`}{session.durationMinutes != null && ` · ${session.durationMinutes}m`}</div>
                  </div>
                </div>
                <ChevronRight size={18} color="var(--text-muted)" />
              </button>
            );
          } else {
            const rs = item.session;
            return (
              <button key={`row-${rs.id}`} className="list-item" style={{ width: '100%' }} onClick={() => setSelectedRowingSession(rs)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <div style={{ width: 6, height: 32, borderRadius: 3, background: 'var(--green)', flexShrink: 0 }} />
                  <div style={{ textAlign: 'left' }}>
                    <div className="title"><Waves size={13} style={{ marginRight: 4, verticalAlign: -2 }} />{typeLabel(rs.type)}{rs.week && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 12 }}> · Wk {rs.week}</span>}</div>
                    <div className="subtitle">{item.date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}{rs.totalDistance && ` · ${rs.totalDistance}m`}{rs.avgSplit && ` · ${formatSplit(rs.avgSplit)}/500m`}</div>
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
