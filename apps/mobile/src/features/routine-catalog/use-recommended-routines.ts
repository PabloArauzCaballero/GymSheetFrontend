import { useQuery } from '@tanstack/react-query';
import { ApiError, DEFAULT_RECOMMENDATION_LIMIT } from '@gymsheet/api-client';
import { forYouBlock, recommendedRoutinesKey, type ForYouBlock } from '@gymsheet/hooks';
import { routineRecommendationService } from '@/api/services';

export type ForYouState =
  | { kind: 'loading' }
  /** Hay recomendaciones: héroe + alternativas. */
  | { kind: 'ready'; block: ForYouBlock }
  /** El servidor no tiene nada para esta persona (perfil u onboarding incompletos). */
  | { kind: 'empty' }
  /** No se pudo cargar: fila pequeña con «Reintentar», el catálogo sigue. */
  | { kind: 'error'; retry: () => void }
  /** El servidor aún no tiene el endpoint (404): el bloque no existe. */
  | { kind: 'hidden' };

/**
 * Bloque «Para ti» del catálogo (C7). Nunca rompe la pantalla: cada desenlace
 * de la petición es un estado que la pantalla sabe pintar.
 */
export function useRecommendedRoutines(limit = DEFAULT_RECOMMENDATION_LIMIT) {
  const query = useQuery({
    queryKey: recommendedRoutinesKey(limit),
    queryFn: () => routineRecommendationService.recommended(limit),
    staleTime: 5 * 60_000,
    // Un 404 es «aún no existe», no un fallo pasajero: reintentarlo solo retrasa.
    retry: (failures, error) => !(error instanceof ApiError && error.kind === 'not-found') && failures < 1,
  });

  let state: ForYouState;
  if (query.isPending) state = { kind: 'loading' };
  else if (query.isError && !query.data) {
    state =
      query.error instanceof ApiError && query.error.kind === 'not-found'
        ? { kind: 'hidden' }
        : { kind: 'error', retry: () => void query.refetch() };
  } else {
    const block = forYouBlock(query.data);
    state = block ? { kind: 'ready', block } : { kind: 'empty' };
  }
  return { state, refetch: query.refetch, isRefetching: query.isRefetching };
}
