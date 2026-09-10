'use client';

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * `true` cuando el sistema pide menos movimiento.
 *
 * El kill-switch global de CSS (`animations.css`) ya recorta transiciones y
 * keyframes, pero el movimiento que se orquesta en JS —contadores, observadores,
 * secuencias— tiene que consultarlo por su cuenta. Este hook es ese único punto:
 * antes la comprobación estaba copiada en `count-up`, `ambient-background` y
 * cada sitio que la necesitaba, cada una con su propio guard de SSR.
 *
 * Server y primer render devuelven `false` (el HTML se pinta en su forma final,
 * sin movimiento); tras hidratar se ajusta al valor real y escucha cambios.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mql = window.matchMedia(QUERY);
    const onChange = () => setReduced(mql.matches);
    // Diferido a la siguiente frame: fijar el estado de forma síncrona dentro
    // del efecto encadena renders (misma razón por la que `count-up` usa rAF).
    const raf = window.requestAnimationFrame(onChange);
    mql.addEventListener('change', onChange);
    return () => {
      window.cancelAnimationFrame(raf);
      mql.removeEventListener('change', onChange);
    };
  }, []);

  return reduced;
}

/**
 * Lectura puntual para código que no es un componente (efectos, utilidades).
 * Devuelve `false` si no hay `matchMedia` (SSR, entornos de test).
 */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(QUERY).matches
  );
}
