'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * El reloj de una story: avance de 0 a 1 y aviso al terminar.
 *
 * Es movimiento funcional —dice cuánto queda— así que no se apaga con
 * `prefers-reduced-motion`: apagarlo dejaría la barra congelada mientras la
 * story sigue avanzando, que es peor que moverse. Lo que sí se evita es
 * repintar a 60 fps: sólo se publica el valor cuando cambia lo suficiente para
 * verse.
 *
 * El progreso se guarda junto a la story a la que pertenece. Así, al pasar a
 * la siguiente, el valor vuelve a cero en el mismo render en vez de en un
 * efecto posterior: un `setState` de reinicio dentro de un efecto pinta un
 * fotograma con la barra de la story anterior ya llena.
 */
export function useStoryProgress({
  activeKey,
  durationMs,
  paused,
  onComplete,
}: {
  /** Identidad de la story en curso: al cambiar, el reloj vuelve a cero. */
  activeKey: string;
  durationMs: number;
  paused: boolean;
  onComplete: () => void;
}): number {
  const [published, setPublished] = useState({ key: activeKey, value: 0 });
  const elapsedRef = useRef(0);
  const keyRef = useRef(activeKey);

  useEffect(() => {
    // Todo el acceso a refs ocurre aquí dentro, nunca durante el render.
    if (keyRef.current !== activeKey) {
      keyRef.current = activeKey;
      elapsedRef.current = 0;
    }
    if (paused || durationMs <= 0) return;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      elapsedRef.current += now - last;
      last = now;
      const value = Math.min(1, elapsedRef.current / durationMs);
      // Un paso de 1 % es medio píxel en una barra de 50 px: por debajo de eso
      // el repintado no se ve, sólo se paga.
      setPublished((current) =>
        current.key === activeKey && value - current.value < 0.01 && value < 1
          ? current
          : { key: activeKey, value },
      );
      if (value >= 1) {
        onComplete();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [activeKey, durationMs, onComplete, paused]);

  return published.key === activeKey ? published.value : 0;
}
