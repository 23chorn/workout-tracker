import { useState, useEffect, useCallback, useRef } from 'react';

function isNotifyEnabled(): boolean {
  return localStorage.getItem('lift-timer-notify') === '1' && 'Notification' in window && Notification.permission === 'granted';
}

export function useRestTimer() {
  const [endTime, setEndTime] = useState<number | null>(null);
  const [total, setTotal] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const hasAlertedRef = useRef(false);
  const intervalRef = useRef<number | null>(null);

  const active = endTime !== null;
  const expired = active && remaining <= 0;

  const clear = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setEndTime(null);
    setRemaining(0);
    setTotal(0);
    hasAlertedRef.current = false;
  }, []);

  const start = useCallback((seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    const end = Date.now() + seconds * 1000;
    setEndTime(end);
    setTotal(seconds);
    setRemaining(seconds);
    hasAlertedRef.current = false;
  }, []);

  useEffect(() => {
    if (endTime === null) return;

    const tick = () => {
      const left = Math.ceil((endTime - Date.now()) / 1000);
      setRemaining(left);
      if (left <= 0 && !hasAlertedRef.current) {
        hasAlertedRef.current = true;
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        // Screen flash overlay
        const overlay = document.createElement('div');
        overlay.className = 'timer-flash-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('animationend', () => overlay.remove(), { once: true });
        if (isNotifyEnabled()) {
          try {
            new Notification('LIFT — Rest Complete', {
              body: 'Time for your next set',
              icon: '/icon-192.png',
              tag: 'rest-timer',
            });
          } catch {
            // Notification may fail in some contexts
          }
        }
      }
    };

    tick();
    intervalRef.current = window.setInterval(tick, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [endTime]);

  const resume = useCallback((endTimeMs: number, originalTotal: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setEndTime(endTimeMs);
    setTotal(originalTotal);
    const left = Math.ceil((endTimeMs - Date.now()) / 1000);
    setRemaining(left);
    if (left <= 0) hasAlertedRef.current = true;
  }, []);

  return { remaining, total, active, expired, start, resume, clear };
}
