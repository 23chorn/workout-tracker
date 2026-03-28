import { useState, useEffect, useCallback, useRef } from 'react';

export function useRestTimer() {
  const [remaining, setRemaining] = useState(0);
  const [total, setTotal] = useState(0);
  const [active, setActive] = useState(false);
  const [startCount, setStartCount] = useState(0);
  const intervalRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setActive(false);
    setRemaining(0);
  }, []);

  const start = useCallback((seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setTotal(seconds);
    setRemaining(seconds);
    setActive(true);
    setStartCount(c => c + 1);
  }, []);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clear();
          if ('vibrate' in navigator) navigator.vibrate(300);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [active, startCount, clear]);

  return { remaining, total, active, start, clear };
}
