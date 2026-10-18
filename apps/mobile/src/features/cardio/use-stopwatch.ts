import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Cronómetro que no deriva: mide con la hora del reloj (`Date.now`) y no sumando ticks, así
 * sigue exacto aunque la app pase un rato en segundo plano o JavaScript se retrase.
 */
export function useStopwatch() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const startedAt = useRef<number | null>(null);
  const base = useRef(0);

  useEffect(() => {
    if (!running) return undefined;
    const tick = () => {
      if (startedAt.current !== null) {
        const nextSec = Math.floor((base.current + (Date.now() - startedAt.current)) / 1000);
        setSeconds((prev) => (prev !== nextSec ? nextSec : prev));
      }
    };
    const timer = setInterval(tick, 500);
    return () => clearInterval(timer);
  }, [running]);

  const start = useCallback(() => {
    startedAt.current = Date.now();
    setRunning(true);
  }, []);
  const pause = useCallback(() => {
    if (startedAt.current !== null) base.current += Date.now() - startedAt.current;
    startedAt.current = null;
    const finalSec = Math.floor(base.current / 1000);
    setSeconds(finalSec);
    setRunning(false);
  }, []);
  const reset = useCallback(() => {
    startedAt.current = null;
    base.current = 0;
    setSeconds(0);
    setRunning(false);
  }, []);
  /** Minutos escritos a mano: sustituyen lo medido (quien olvidó darle a iniciar). */
  const setManualSeconds = useCallback((newSec: number) => {
    startedAt.current = null;
    base.current = newSec * 1000;
    setSeconds(newSec);
    setRunning(false);
  }, []);

  return { seconds, running, start, pause, reset, setManualSeconds };
}
