import { toPathData, type BodyRegion } from '@gymsheet/anatomy';
import { useEffect, useState } from 'react';

/** `prefers-reduced-motion`, vivo: cambia si la persona lo activa con la página abierta. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return reduced;
}

/** Agrupa las zonas por músculo: un músculo es un solo elemento enfocable. */
export function groupByCode(regions: readonly BodyRegion[]) {
  const groups = new Map<string, string[]>();
  for (const region of regions) {
    const paths = groups.get(region.code) ?? [];
    paths.push(toPathData(region.rings));
    groups.set(region.code, paths);
  }
  return [...groups.entries()].map(([code, paths]) => ({ code, paths }));
}
