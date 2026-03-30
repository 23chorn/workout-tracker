import { useState } from 'react';
import { type Session, type RowingSession } from '../../db/database';
import { toDateKey } from '../../utils/date';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function CalendarView({ sessions, sessionsByDate, rowingByDate, onSelectDate }: {
  sessions: Session[];
  sessionsByDate: Map<string, Session[]>;
  rowingByDate: Map<string, RowingSession[]>;
  onSelectDate: (dateKey: string) => void;
}) {
  const [viewDate, setViewDate] = useState(() => new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPad = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));
  const today = toDateKey(new Date());

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= totalDays; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) { weeks.push(currentWeek); currentWeek = []; }
  }
  if (currentWeek.length > 0) { while (currentWeek.length < 7) currentWeek.push(null); weeks.push(currentWeek); }

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="row-between mb-md">
        <button className="btn btn-sm btn-secondary" onClick={prevMonth}><ChevronLeft size={16} /></button>
        <span style={{ fontWeight: 600, fontSize: 16 }}>{monthLabel}</span>
        <button className="btn btn-sm btn-secondary" onClick={nextMonth}><ChevronRight size={16} /></button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, textAlign: 'center', marginBottom: 4 }}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', padding: '4px 0', fontWeight: 600 }}>{d}</div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
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
          if (hasBoth) bg = 'linear-gradient(135deg, var(--accent) 50%, var(--green) 50%)';
          else if (hasLift) bg = 'var(--accent)';
          else if (hasRowing) bg = 'var(--green)';

          return (
            <button key={i} onClick={() => hasAny && onSelectDate(dateKey)} style={{
              aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, fontSize: 14, fontWeight: isToday ? 700 : 400,
              color: hasAny ? 'var(--text)' : 'var(--text-muted)', background: bg,
              border: isToday && !hasAny ? '1px solid var(--border)' : 'none',
              cursor: hasAny ? 'pointer' : 'default', position: 'relative', minHeight: 40,
            }}>
              {day}
            </button>
          );
        })}
      </div>

      {(() => {
        const monthLift = sessions.filter(s => { const d = new Date(s.date); return d.getMonth() === month && d.getFullYear() === year; }).length;
        const allRowingDates = [...rowingByDate.entries()];
        const monthRowing = allRowingDates.filter(([key]) => { const d = new Date(key); return d.getMonth() === month && d.getFullYear() === year; }).reduce((sum, [, arr]) => sum + arr.length, 0);
        return (
          <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            <div style={{ marginBottom: 4 }}>{monthLift + monthRowing} session{monthLift + monthRowing !== 1 ? 's' : ''} in {viewDate.toLocaleDateString(undefined, { month: 'long' })}</div>
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
