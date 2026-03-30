import { X } from 'lucide-react';

export function OptionPicker({ title, options, value, onChange, onClose, allowEmpty }: {
  title: string;
  options: string[];
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  allowEmpty?: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="row-between mb-md">
          <h2 style={{ marginBottom: 0 }}>{title}</h2>
          <button className="btn btn-sm btn-secondary" onClick={onClose}><X size={14} /></button>
        </div>
        <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
          {allowEmpty && (
            <button
              className="list-item"
              style={{ width: '100%', background: !value ? 'var(--accent)' : undefined, color: !value ? 'white' : undefined }}
              onClick={() => { onChange(''); onClose(); }}
            >
              <span style={{ fontSize: 14 }}>None</span>
            </button>
          )}
          {options.map(opt => (
            <button
              key={opt}
              className="list-item"
              style={{ width: '100%', background: opt === value ? 'var(--accent)' : undefined, color: opt === value ? 'white' : undefined }}
              onClick={() => { onChange(opt); onClose(); }}
            >
              <span style={{ fontSize: 14 }}>{opt}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
