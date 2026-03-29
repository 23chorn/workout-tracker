export function StatCard({ icon: Icon, label, value, sub, color }: {
  icon?: React.ComponentType<{ size: number; color?: string }>;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  if (Icon) {
    return (
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} color="var(--accent)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: color ?? 'var(--text)' }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: color ?? 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
