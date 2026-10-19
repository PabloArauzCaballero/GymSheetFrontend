import type { ContentKind, RoutineCatalogQuery } from '@gymsheet/types';

/**
 * Claves de caché de las rutinas REPP. Cuelgan de `routines-v2` para poder
 * invalidar el catálogo entero tras publicar, copiar, aceptar o activar sin
 * enumerar cada combinación de filtros.
 */
export const routineV2Keys = {
  all: ['routines-v2'] as const,
  catalog: (query: Omit<RoutineCatalogQuery, 'cursor'>) => ['routines-v2', 'catalog', query] as const,
  invitations: ['routines-v2', 'invitations', 'pending'] as const,
  calendar: (id: string) => ['routines-v2', 'calendar', id] as const,
  shares: (id: string) => ['routines-v2', 'shares', id] as const,
  rating: (kind: ContentKind, id: string) => ['routines-v2', 'rating', kind, id] as const,
  comments: (kind: ContentKind, id: string) => ['routines-v2', 'comments', kind, id] as const,
  directory: (q: string) => ['routines-v2', 'directory', q] as const,
};

export const programKeys = {
  all: ['programs'] as const,
  active: ['programs', 'active'] as const,
  progress: (id: string) => ['programs', 'progress', id] as const,
  nextLoads: (id: string) => ['programs', 'next-loads', id] as const,
  cardioPlans: ['programs', 'cardio-plans'] as const,
};
