import { Check } from 'lucide-react';

export interface SessionSummaryData {
  dayLabel: string;
  date?: string;
  duration?: number;
  exerciseCount: number;
  totalSets: number;
  totalVolume: number;
  pbs: { name: string; e10RM: number }[];
}

function formatVolume(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}K kg`;
  return `${Math.round(kg)} kg`;
}

function ReceiptRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="receipt-row">
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</span>
      <span className="num" style={{ fontSize: 14, fontWeight: 600, color: color ?? 'var(--text)' }}>{value}</span>
    </div>
  );
}

// The punch-out to the Today card's punch-in: same ticket, now stamped complete.
export function SessionSummary({ data, onDismiss, dismissLabel }: {
  data: SessionSummaryData;
  onDismiss: () => void;
  dismissLabel?: string;
}) {
  return (
    <div>
      <div className="hero-card">
        <div className="hero-card-band">
          <span>Complete</span>
          {data.date ? (
            <span className="num">{new Date(data.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          ) : data.duration != null ? (
            <span className="num">{data.duration}m</span>
          ) : null}
        </div>

        <div className="hero-card-body" style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 10, background: 'var(--green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '4px auto 14px',
          }}>
            <Check size={28} color="white" />
          </div>
          <h1 style={{ marginBottom: 4 }}>{data.dayLabel}</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            {data.date
              ? new Date(data.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
              : 'Nice work.'}
          </p>
        </div>

        <div className="hero-card-tear" />
        <div className="hero-card-body">
          <ReceiptRow label="Duration" value={data.duration != null ? `${data.duration}m` : '—'} />
          <ReceiptRow label="Exercises" value={data.exerciseCount} />
          <ReceiptRow label="Total Sets" value={data.totalSets} />
          <ReceiptRow label="Volume" value={formatVolume(data.totalVolume)} />
        </div>

        {data.pbs.length > 0 && (
          <>
            <div className="hero-card-tear" />
            <div className="hero-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="pb-badge" style={{ marginLeft: 0 }}>PB</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)',
                }}>
                  New Personal Bests
                </span>
              </div>
              {data.pbs.map((pb, i) => (
                <ReceiptRow key={i} label={pb.name} value={`${pb.e10RM.toFixed(1)} kg`} color="var(--yellow)" />
              ))}
            </div>
          </>
        )}

        <div className="hero-card-tear" />
        <div className="hero-card-actions">
          <button className="btn btn-primary btn-full" onClick={onDismiss}>
            {dismissLabel ?? 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}
