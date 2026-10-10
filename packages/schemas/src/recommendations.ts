import { z } from 'zod';
import type { RoutineRecommendation } from '@gymsheet/types';
import { routineCardSchema } from './catalog';

export const routineRecommendationSchema = z.object({
  rutina: routineCardSchema,
  motivo: z.string(),
});

/**
 * Respuesta de `GET /routines/recommended` (C7). Tolerante por elemento: una
 * recomendación que no encaja en el contrato se descarta en vez de tumbar el
 * bloque entero —el bloque «Para ti» es un extra del catálogo y nunca debe
 * romperlo—. Si lo que llega ni siquiera es una lista, sí es un error.
 */
export const routineRecommendationsSchema = z
  .array(z.unknown())
  .transform((items): RoutineRecommendation[] =>
    items.flatMap((item) => {
      const parsed = routineRecommendationSchema.safeParse(item);
      return parsed.success ? [parsed.data as RoutineRecommendation] : [];
    }),
  );
