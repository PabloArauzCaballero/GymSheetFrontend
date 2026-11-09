'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { Skeleton, SkeletonScreen } from '@/shared/components/feedback/skeleton';

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
  onRefetch,
}: Readonly<{
  children: ReactNode;
  deckError: string | null;
  empty: boolean;
  emptyAction: ReactNode;
  loading: boolean;
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
  if (deckError) return <ErrorPanel message={deckError} onRetry={onRefetch} />;
  if (empty) {
    return (
      <EmptyState
        action={emptyAction}
        description="No hay personas que coincidan con estos filtros por ahora. Cámbialos en Comunidad o vuelve más tarde."
        title="No quedan cartas"
      />
    );
  }
  return <>{children}</>;
}
