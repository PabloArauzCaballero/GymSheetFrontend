'use client';

import { countUpDuration } from '@gymsheet/domain';
import { animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/shared/hooks/use-reduced-motion';
import { useSeenOnce } from '@/shared/hooks/use-seen-once';

/** `easeOutCubic` como curva de Bézier: la misma que `countUpValue` del dominio. */
const EASE_OUT_CUBIC: [number, number, number, number] = [0.33, 1, 0.68, 1];

/**
 * Cuenta un entero desde `from` (0 por defecto) hasta `value`.
 *
 * - Empieza cuando el número entra en pantalla, no al montar: un contador bajo
 *   el pliegue que ya terminó cuando llegas a él no cuenta nada.
 * - La duración sale de la magnitud del salto (`countUpDuration`, compartida
 *   con el móvil) salvo que se fije `durationMs`.
 * - Si `value` cambia después, cuenta desde lo que se ve en ese momento.
 * - Cada fotograma escribe el texto directamente en el DOM a través de un
 *   `MotionValue`; React no re-renderiza durante la cuenta.
 * - El servidor pinta `from` ya formateado, así que no hay salto de hidratación.
 * - Con «reducir movimiento» salta directo al valor.
 *
 * Quien lo usa debe ocultarlo al lector de pantalla (`aria-hidden`) y poner al
 * lado la cifra final en `sr-only`; si no, se anuncia la cuenta.
 */
export function CountUp({
  value,
  from = 0,
  durationMs,
  delayMs = 0,
  locale = 'es-ES',
}: Readonly<{
  value: number;
  from?: number;
  durationMs?: number;
  delayMs?: number;
  locale?: string;
}>) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useSeenOnce(ref);
  const count = useMotionValue(from);
  const text = useTransform(count, (latest) => Math.round(latest).toLocaleString(locale));

  useEffect(() => {
    if (!seen) return;
    const start = count.get();
    const duration = durationMs ?? countUpDuration(start, value);
    if (prefersReducedMotion() || duration === 0) {
      count.jump(value);
      return;
    }
    const controls = animate(count, value, {
      duration: duration / 1000,
      delay: delayMs / 1000,
      ease: EASE_OUT_CUBIC,
    });
    return () => controls.stop();
  }, [count, delayMs, durationMs, seen, value]);

  return (
    <motion.span className="tabular-nums" ref={ref}>
      {text}
    </motion.span>
  );
}
