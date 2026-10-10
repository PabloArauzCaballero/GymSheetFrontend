import type { RoutineRecommendation, TrainingGoal } from '@gymsheet/types';
import { emptyCatalogFilters, type CatalogFilterState } from './filters';

/**
 * Clave de caché de las recomendaciones. Cuelga de `['routines']`, así que
 * invalidar las rutinas (copiar, activar, publicar) también las refresca.
 */
export const recommendedRoutinesKey = (limit: number) => ['routines', 'recommended', limit] as const;

/** Lo que pinta el bloque «Para ti»: una tarjeta héroe y hasta dos alternativas. */
export type ForYouBlock = {
  hero: RoutineRecommendation;
  alternatives: RoutineRecommendation[];
};

/** Motivo de reserva si el servidor manda uno vacío: nunca se pinta un hueco. */
export const FALLBACK_MOTIVO = 'Encaja con tu objetivo';

/** El motivo tal como llega, sin espacios sobrantes y sin quedarse vacío. */
export function recommendationReason(item: Pick<RoutineRecommendation, 'motivo'>): string {
  const motivo = item.motivo.replace(/\s+/g, ' ').trim();
  return motivo.length > 0 ? motivo : FALLBACK_MOTIVO;
}

/**
 * Ordena la respuesta en héroe + alternativas: respeta el orden del servidor
 * (ya viene por afinidad), quita duplicados por id de rutina y corta a
 * `1 + maxAlternatives`. Sin recomendaciones devuelve `null` y el bloque no se
 * pinta (la pantalla ofrece completar el onboarding).
 */
export function forYouBlock(
  items: readonly RoutineRecommendation[] | null | undefined,
  maxAlternatives = 2,
): ForYouBlock | null {
  if (!items?.length) return null;
  const seen = new Set<string>();
  const unique: RoutineRecommendation[] = [];
  for (const item of items) {
    if (seen.has(item.rutina.id)) continue;
    seen.add(item.rutina.id);
    unique.push(item);
  }
  const [hero, ...rest] = unique;
  if (!hero) return null;
  return { hero, alternatives: rest.slice(0, Math.max(0, maxAlternatives)) };
}

/**
 * Filtros iniciales del catálogo con el objetivo del perfil precargado (C7):
 * quien eligió Hipertrofia abre Públicas ya filtrado por Hipertrofia, y puede
 * quitarlo. Sin objetivo conocido, los filtros vacíos de siempre.
 */
export function initialCatalogFilters(objetivo: TrainingGoal | null | undefined): CatalogFilterState {
  return { ...emptyCatalogFilters, objetivo: objetivo ?? null };
}
