import { type Session } from '../../db/database';

export function E10RMChart({ exerciseId, exerciseName, sessions }: {
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
  const w = 300, h = 120, pad = 20;

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
        {points.map((p, i) => (<circle key={i} cx={p.x} cy={p.y} r="3" fill="var(--accent)" />))}
        <text x={pad} y={h - 4} fill="var(--text-muted)" fontSize="9">{dataPoints[0].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
        <text x={w - pad} y={h - 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{dataPoints[dataPoints.length - 1].date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</text>
        <text x={pad - 4} y={pad + 4} fill="var(--text-muted)" fontSize="9" textAnchor="end">{maxVal.toFixed(1)}</text>
        <text x={pad - 4} y={h - pad} fill="var(--text-muted)" fontSize="9" textAnchor="end">{minVal.toFixed(1)}</text>
      </svg>
    </div>
  );
}
