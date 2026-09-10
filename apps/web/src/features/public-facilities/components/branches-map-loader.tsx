'use client';

import dynamic from 'next/dynamic';

/**
 * `leaflet` toca `window`/`navigator` al importarse (detección de features de
 * `L.Browser`), no solo al montar — así que ni siquiera 'use client' alcanza
 * para que sobreviva al paso de SSR; hay que sacarlo del render del servidor
 * por completo con `ssr: false`, que solo puede pedirse desde un componente
 * cliente como este.
 */
export const BranchesMap = dynamic(
  () => import('./branches-map').then((module) => module.BranchesMap),
  {
    ssr: false,
    loading: () => (
      <div className="grid size-full place-items-center text-sm text-[var(--text-muted)]">
        Cargando mapa…
      </div>
    ),
  },
);
