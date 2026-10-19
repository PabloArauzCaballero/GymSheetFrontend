import { z } from 'zod';
import type { RoutineComment } from '@gymsheet/types';

export const contentRatingSchema = z.object({
  promedio: z.number().nullable(),
  total: z.number().int(),
  miValoracion: z.number().int().nullable(),
  distribucion: z
    .object({ '1': z.number().int(), '2': z.number().int(), '3': z.number().int(), '4': z.number().int(), '5': z.number().int() })
    .nullable()
    .optional(),
});

export const commentAttachmentSchema = z.object({
  tipo: z.enum(['GIF', 'STICKER', 'IMAGEN', 'VIDEO', 'ARCHIVO']),
  url: z.string(),
  mime: z.string().nullish(),
  nombre: z.string().nullish(),
  bytes: z.number().nullish(),
  ancho: z.number().nullish(),
  alto: z.number().nullish(),
});

export const gifPageSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      titulo: z.string(),
      url: z.string(),
      vistaPreviaUrl: z.string(),
      ancho: z.number(),
      alto: z.number(),
    }),
  ),
  siguiente: z.number().nullable(),
  disponible: z.boolean(),
});

export const routineCommentSchema: z.ZodType<RoutineComment, unknown> = z.lazy(() =>
  z.object({
    id: z.string(),
    autor: z.object({ id: z.string(), nombre: z.string(), fotoUrl: z.string().nullable().optional() }),
    likes: z.number().int().default(0),
    meGusta: z.boolean().default(false),
    texto: z.string(),
    adjunto: commentAttachmentSchema.nullish(),
    respuestaA: z.string().nullable(),
    creadoEn: z.string(),
    esMio: z.boolean(),
    respuestas: z.array(routineCommentSchema),
  }),
);

export const commentPageSchema = z.object({
  items: z.array(routineCommentSchema),
  siguienteCursor: z.string().nullable(),
  /** Comentarios visibles con sus respuestas; ausente en servidores anteriores al contador. */
  total: z.number().int().nonnegative().optional(),
});

export const commentLikeSchema = z.object({ likes: z.number().int(), meGusta: z.boolean() });

export const commentDeletedSchema = z.object({ deleted: z.literal(true) });
