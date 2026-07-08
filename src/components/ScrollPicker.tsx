import { useRef, useEffect, useState, useCallback } from 'react';

const ITEM_HEIGHT = 44;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

export function ScrollPicker({ values, value, onChange, onClose, label, suffix }: {
  values: (string | number)[];
  value: string;
  onChange: (val: string) => void;
  onClose: () => void;
  label: string;
  suffix?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedIdx, setSelectedIdx] = useState(() => {
    let idx = values.findIndex(v => String(v) === value);
    if (idx < 0 && value) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        let closest = 0;
        let closestDist = Infinity;
        for (let i = 0; i < values.length; i++) {
          const dist = Math.abs(Number(values[i]) - num);
          if (dist < closestDist) { closest = i; closestDist = dist; }
        }
        idx = closest;
      }
    }
    return Math.max(0, idx);
  });
  const [manualMode, setManualMode] = useState(false);
  const [manualValue, setManualValue] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = selectedIdx * ITEM_HEIGHT;
  }, []);

  useEffect(() => {
    if (manualMode) manualInputRef.current?.focus();
  }, [manualMode]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const clamped = Math.max(0, Math.min(values.length - 1, idx));
    setSelectedIdx(clamped);
  }, [values.length]);

  const confirm = () => {
    onChange(String(values[selectedIdx]));
    onClose();
  };

  const confirmManual = () => {
    const num = parseFloat(manualValue);
    if (!isNaN(num) && num >= 0) {
      onChange(String(num));
      onClose();
    }
  };

  const selectedValue = values[selectedIdx];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ paddingBottom: 16 }}>
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
          {!manualMode && (
            <div className="num" style={{ fontSize: 28, fontWeight: 600, color: 'var(--accent)' }}>
              {selectedValue}{suffix && <span style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 4 }}>{suffix}</span>}
            </div>
          )}
          <button
            onClick={() => { setManualMode(m => !m); setManualValue(''); }}
            style={{
              position: 'absolute', top: 0, right: 0,
              fontSize: 11, color: 'var(--text-muted)',
              background: 'none', border: 'none', padding: '2px 4px',
              cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            {manualMode ? 'scroll' : 'type'}
          </button>
        </div>

        {manualMode ? (
          <div style={{ padding: '16px 0 8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={manualInputRef}
                type="number"
                inputMode="decimal"
                value={manualValue}
                onChange={e => setManualValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') confirmManual(); }}
                placeholder="e.g. 67.5"
                className="num"
                style={{
                  width: 120, fontSize: 24, fontWeight: 600, textAlign: 'center',
                  background: 'var(--bg-input)', border: '1px solid var(--border)',
                  borderRadius: 8, color: 'var(--text)', padding: '8px 12px',
                }}
              />
              {suffix && <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>{suffix}</span>}
            </div>
          </div>
        ) : (
          <div style={{ position: 'relative', height: PICKER_HEIGHT, overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: ITEM_HEIGHT * 2, left: 16, right: 16,
              height: ITEM_HEIGHT, background: 'transparent',
              borderRadius: 8, border: '2px solid var(--accent)',
              pointerEvents: 'none', zIndex: 1,
            }} />
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: ITEM_HEIGHT * 2, background: 'linear-gradient(var(--bg-card), transparent)', pointerEvents: 'none', zIndex: 2 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: ITEM_HEIGHT * 2, background: 'linear-gradient(transparent, var(--bg-card))', pointerEvents: 'none', zIndex: 2 }} />

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              style={{
                height: PICKER_HEIGHT, overflowY: 'scroll',
                scrollSnapType: 'y mandatory',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div style={{ height: ITEM_HEIGHT * 2 }} />
              {values.map((v, i) => {
                const isSelected = i === selectedIdx;
                return (
                  <div key={i} className="num" style={{
                    height: ITEM_HEIGHT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    scrollSnapAlign: 'center',
                    fontSize: isSelected ? 20 : 16,
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'var(--text)' : 'var(--text-muted)',
                  }}>
                    {v}
                  </div>
                );
              })}
              <div style={{ height: ITEM_HEIGHT * 2 }} />
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 12 }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={manualMode ? confirmManual : confirm}
            disabled={manualMode && (isNaN(parseFloat(manualValue)) || parseFloat(manualValue) < 0)}
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}

export function weightValues(max = 200, step = 2.5): number[] {
  const vals: number[] = [];
  for (let w = 0; w <= max; w += step) {
    vals.push(Math.round(w * 10) / 10);
  }
  return vals;
}

export function dumbbellWeightValues(max = 100): number[] {
  const vals: number[] = [];
  for (let w = 0; w <= max; w += 1) vals.push(w);
  return vals;
}

export function bodyweightWeightValues(max = 80, step = 2.5): number[] {
  const vals: number[] = [];
  for (let w = 0; w <= max; w += step) {
    vals.push(Math.round(w * 10) / 10);
  }
  return vals;
}

export function repValues(max = 30): number[] {
  return Array.from({ length: max }, (_, i) => i + 1);
}
