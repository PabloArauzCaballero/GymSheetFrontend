'use client';

import type { ReactNode } from 'react';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';

/**
 * Los cuatro estados de una lista, en un solo sitio.
 *
 * El orden importa y no es negociable: primero cargando, después error,
 * después vacío. Si el vacío se comprueba antes que el error, una red caída se
 * lee como «no te dio like nadie», que es una mentira que duele.
 */
export function ListSurface({
  children,
  empty,
  emptyAction,
  emptyDescription,
  emptyTitle,
  errorMessage,
  loading,
  onRetry,
}: Readonly<{
  children: ReactNode;
  empty: boolean;
  emptyAction?: ReactNode;
  emptyDescription: string;
  emptyTitle: string;
  errorMessage: string | null;
  loading: boolean;
  onRetry: () => void;
}>) {
  if (loading) return <SkeletonList rows={4} variant="stacked" />;
  if (errorMessage) return <ErrorPanel message={errorMessage} onRetry={onRetry} />;
  if (empty) {
    return (
      <EmptyState action={emptyAction} description={emptyDescription} title={emptyTitle} />
    );
  }
  return <div className="grid gap-3">{children}</div>;
}
