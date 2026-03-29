export function MuscleGroupChips({ groups, selected, onSelect }: {
  groups: string[];
  selected: string | null;
  onSelect: (group: string | null) => void;
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
      {groups.map(mg => (
        <button
          key={mg}
          onClick={() => onSelect(selected === mg ? null : mg)}
          style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
            border: '1px solid var(--border)',
            background: selected === mg ? 'var(--accent)' : 'var(--bg-input)',
            color: selected === mg ? 'white' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          {mg}
        </button>
      ))}
    </div>
  );
}
