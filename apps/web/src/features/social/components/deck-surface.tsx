'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';
import { Repi } from '@/shared/components/media/repi';
import { DiscoveryPreferencesCard } from './discovery-preferences-card';

/**
 * Los cuatro estados de la baraja en un solo sitio.
 *
 * Importa distinguir «no hay nadie más» de «no pudimos preguntar»: si la red
 * falla y pintamos el vacío, el usuario concluye que su gimnasio está desierto.
 */
export function DeckSurface({
  children,
  deckError,
  empty,
  emptyAction,
  loading,
  needsPreferences = false,
  onRefetch,
}: Readonly<{
  children: ReactNode;
  deckError: string | null;
  empty: boolean;
  emptyAction: ReactNode;
  loading: boolean;
  /** Aún no dijo a quién busca: se le pregunta aquí, no se le enseña un error. */
  needsPreferences?: boolean;
  onRefetch: () => void;
}>) {
  if (loading) {
    return (
      <SkeletonScreen className="justify-items-center" label="Cargando la baraja">
        <Skeleton className="h-[28rem] w-full max-w-md rounded-[var(--radius-xl)] sm:h-[34rem]" />
        <div className="flex gap-4">
          <Skeleton className="size-16 rounded-full" />
          <Skeleton className="size-12 rounded-full" />
          <Skeleton className="size-16 rounded-full" />
        </div>
      </SkeletonScreen>
    );
  }
  if (needsPreferences) {
    return (
      <section aria-labelledby="deck-setup-title" className="grid gap-4">
        <div className="grid justify-items-center gap-2 text-center">
          <Repi className="size-24" mood="flirty" size={96} />
          <h2 className="text-2xl font-semibold tracking-[-0.02em]" id="deck-setup-title">
            Cuéntanos a quién buscas
          </h2>
          <p className="t-subhead max-w-sm text-[var(--text-muted)]">
            Elige con quién quieres entrenar o conocer gente. Solo verás personas que encajen.
          </p>
        </div>
        <DiscoveryPreferencesCard embedded onSaved={onRefetch} />
      </section>
    );
  }
  if (deckError) return <ErrorPanel message={deckError} onRetry={onRefetch} />;
  if (empty) {
    return (
      <EmptyState
        action={emptyAction}
        description="Repi también se quedó sin perfiles. Vuelve mañana o cambia los filtros de objetivo y sede."
        mascot="resting"
        title="Ya viste a todos por hoy"
      />
    );
  }
  return <>{children}</>;
}
