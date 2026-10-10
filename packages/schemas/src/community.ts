import { z } from 'zod';
import type { RoutineComment } from '@gymsheet/types';

export const contentRatingSchema = z.object({
  promedio: z.number().nullable(),
  total: z.number().int(),
  miValoracion: z.number().int().nullable(),
});

export const routineCommentSchema: z.ZodType<RoutineComment> = z.lazy(() =>
  z.object({
    id: z.string(),
    autor: z.object({ id: z.string(), nombre: z.string() }),
    texto: z.string(),
    respuestaA: z.string().nullable(),
    creadoEn: z.string(),
    esMio: z.boolean(),
    respuestas: z.array(routineCommentSchema),
  }),
);

export const commentPageSchema = z.object({
  items: z.array(routineCommentSchema),
  siguienteCursor: z.string().nullable(),
});

export const commentDeletedSchema = z.object({ deleted: z.literal(true) });
