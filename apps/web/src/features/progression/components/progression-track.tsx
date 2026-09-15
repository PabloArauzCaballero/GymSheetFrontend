'use client';

import { useEffect, useRef, useState } from 'react';
import { useSeenOnce } from '@/shared/hooks/use-seen-once';

/**
 * Barra de avance dentro del tramo actual.
 *
 * El relleno lleva el color del rango que se persigue, no el de la marca: lo
 * que mide es la distancia hasta *ese* hito, y pintarla del acento general la
 * convertiría en una barra de carga cualquiera.
 */
export function ProgressTrack({
  ratio,
  color,
  label,
  height = 8,
  from = 0,
}: Readonly<{
  ratio: number;
  color: string;
  /**
   * Qué mide esta barra. OBLIGATORIO a propósito: sin nombre, un lector de
   * pantalla lee «barra de progreso, 40 %» sin decir de qué, y en `/trayectoria`
   * son 24 seguidas — ilegible. Haciéndolo obligatorio el fallo lo caza el
   * type-check y no puede reaparecer en una llamada nueva. Ver M-5.
   */
  label: string;
  height?: number;
  /** Desde qué avance crece, de 0 a 1. El resumen de sesión la arranca donde estaba. */
  from?: number;
}>) {
  const clamped = clampRatio(ratio);
  const ref = useRef<HTMLDivElement>(null);
  const seen = useSeenOnce(ref);
  // La barra crece al verse, a la vez que la cifra cuenta: cuentan la misma
  // historia y deben llegar juntas. La transición es CSS, así que el
  // interruptor global de «reducir movimiento» de `animations.css` la apaga.
  const [shown, setShown] = useState(() => clampRatio(from));

  useEffect(() => {
    if (!seen) return;
    // Diferido a la siguiente frame: con el ancho inicial ya pintado, el
    // cambio es una transición y no un salto.
    const raf = window.requestAnimationFrame(() => setShown(clamped));
    return () => window.cancelAnimationFrame(raf);
  }, [clamped, seen]);

  return (
    <div
      ref={ref}
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(clamped * 100)}
      className="w-full overflow-hidden rounded-full bg-[var(--surface-high)]"
      role="progressbar"
      style={{ height }}
    >
      <div
        className="h-full rounded-full transition-[width] duration-1000 ease-[cubic-bezier(0.33,1,0.68,1)]"
        style={{
          // Un tramo recién empezado debe verse empezado: sin este mínimo el
          // 1 % es un pixel y la barra parece vacía justo cuando más importa
          // confirmar que el primer entrenamiento contó.
          width: `${Math.max(shown * 100, shown > 0 ? 3 : 0)}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
}

function clampRatio(value: number): number {
  return Math.min(1, Math.max(0, value));
}
