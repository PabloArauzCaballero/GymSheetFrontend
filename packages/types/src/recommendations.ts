import type { RoutineCard } from './catalog';

/**
 * Una rutina recomendada para la persona (C7): la tarjeta del catálogo (el
 * mismo DTO que `GET /routines?scope=…`) y el motivo ya redactado por el
 * servidor, p. ej. «Porque elegiste Hipertrofia · 4 días · gimnasio».
 */
export type RoutineRecommendation = {
  rutina: RoutineCard;
  motivo: string;
};
