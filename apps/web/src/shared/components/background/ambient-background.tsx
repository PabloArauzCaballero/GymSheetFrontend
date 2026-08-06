'use client';

import { useEffect, useRef, type CSSProperties } from 'react';
import { cn } from '@/shared/lib/cn';

type AmbientVariant = 'auth' | 'portal' | 'minimal';

/** Intensidad global del ambiente por contexto (multiplica --ambient-strength). */
const STRENGTH: Record<AmbientVariant, number> = {
  auth: 1,
  portal: 0.55,
  minimal: 0.4,
};

/**
 * Fondo ambiental reutilizable por capas (aurora). Es puramente decorativo
 * (`aria-hidden`, `pointer-events:none`) y no altera el flujo del contenido: se
 * posiciona en `absolute inset-0` dentro de un contenedor `relative`.
 *
 * - `variant` selecciona qué capas se muestran y su intensidad.
 * - `reactive` habilita el spotlight que sigue al cursor (se desactiva solo en
 *   `pointer:coarse` o `prefers-reduced-motion`).
 * - `fixed` fija el ambiente al viewport (útil detrás de layouts con scroll).
 *
 * Todas las capas viven en `background.css`; aquí solo se orquesta el DOM, la
 * reactividad al cursor (rAF) y la pausa cuando la pestaña no está visible.
 */
export function AmbientBackground({
  variant = 'portal',
  reactive = false,
  fixed = false,
  behind = false,
  className,
}: Readonly<{
  variant?: AmbientVariant;
  reactive?: boolean;
  fixed?: boolean;
  behind?: boolean;
  className?: string;
}>) {
  const ref = useRef<HTMLDivElement>(null);

  // Spotlight que sigue al cursor: escribe --mx/--my (0–100%) con rAF para no
  // provocar layout ni saturar el hilo principal. Respeta puntero fino y
  // movimiento reducido; se limpia por completo al desmontar.
  useEffect(() => {
    const el = ref.current;
    if (!el || !reactive) return;
    if (typeof window === 'undefined' || typeof matchMedia === 'undefined') return;

    const finePointer = matchMedia('(pointer: fine)').matches;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!finePointer || reduceMotion) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        el.style.setProperty('--mx', `${Math.min(100, Math.max(0, x)).toFixed(1)}%`);
        el.style.setProperty('--my', `${Math.min(100, Math.max(0, y)).toFixed(1)}%`);
      });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reactive]);

  // Pausa la deriva cuando la pestaña pasa a segundo plano (ahorro de batería).
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof document === 'undefined') return;
    const sync = () => el.setAttribute('data-paused', document.hidden ? 'true' : 'false');
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);

  const showGrid = variant !== 'minimal';
  const showThirdOrb = variant === 'auth';
  const showSpot = reactive && variant !== 'minimal';

  return (
    <div
      ref={ref}
      aria-hidden
      className={cn('ambient', fixed && 'ambient--fixed', behind && 'ambient--behind', className)}
      style={{ '--ambient-strength': STRENGTH[variant] } as CSSProperties}
    >
      <div className="ambient__orb ambient__orb--1" />
      <div className="ambient__orb ambient__orb--2" />
      {showThirdOrb ? <div className="ambient__orb ambient__orb--3" /> : null}
      {showGrid ? <div className="ambient__grid" /> : null}
      {showSpot ? <div className="ambient__spot" /> : null}
      <div className="ambient__noise" />
      <div className="ambient__scrim" />
    </div>
  );
}
