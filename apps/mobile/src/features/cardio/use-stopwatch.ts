import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cronómetro que no deriva: mide con la hora del reloj (`Date.now`) y no sumando ticks, así
 * sigue exacto aunque la app pase un rato en segundo plano o JavaScript se retrase.
 */
export function useStopwatch() {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      if (startedAt.current !== null) setElapsedMs(base.current + (Date.now() - startedAt.current));
    }, 250);
    return () => clearInterval(timer);
  }, [running]);

  const start = useCallback(() => {
    startedAt.current = Date.now();
    setRunning(true);
  }, []);
  const pause = useCallback(() => {
    if (startedAt.current !== null) base.current += Date.now() - startedAt.current;
    startedAt.current = null;
    setElapsedMs(base.current);
    setRunning(false);
  }, []);
  const reset = useCallback(() => {
    startedAt.current = null;
    base.current = 0;
    setElapsedMs(0);
    setRunning(false);
  }, []);
  /** Minutos escritos a mano: sustituyen lo medido (quien olvidó darle a iniciar). */
  const setManualSeconds = useCallback((seconds: number) => {
    startedAt.current = null;
    base.current = seconds * 1000;
    setElapsedMs(base.current);
    setRunning(false);
  }, []);

  return { seconds: Math.floor(elapsedMs / 1000), running, start, pause, reset, setManualSeconds };
}
