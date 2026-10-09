import { z } from 'zod';

export const communityKinds = ['ROUTINE', 'EXERCISE'] as const;
export type CommunityKind = (typeof communityKinds)[number];

/** Resumen de valoraciones de un contenido, con la nota de quien mira. */
export const ratingResultSchema = z.object({
  promedio: z.number().nullable(),
  total: z.number().int(),
  miValoracion: z.number().int().nullable(),
});
export type RatingResult = z.infer<typeof ratingResultSchema>;

export type CommentView = {
  id: string;
  autor: { id: string; nombre: string };
  texto: string;
  respuestaA: string | null;
  creadoEn: string;
  esMio: boolean;
  respuestas: CommentView[];
};

export const commentSchema: z.ZodType<CommentView> = z.lazy(() =>
  z.object({
    id: z.string(),
    autor: z.object({ id: z.string(), nombre: z.string() }),
    texto: z.string(),
    respuestaA: z.string().nullable(),
    creadoEn: z.string(),
    esMio: z.boolean(),
    respuestas: z.array(commentSchema),
  }),
);

export const commentPageSchema = z.object({
  items: z.array(commentSchema),
  siguienteCursor: z.string().nullable(),
});
export type CommentPage = z.infer<typeof commentPageSchema>;

/** Motivos de denuncia que acepta `POST /me/reports` (taxonomía cerrada). */
export const reportReasons = [
  'EJERCICIO_PELIGROSO',
  'INFORMACION_ENGANOSA',
  'PLAGIO',
  'SPAM',
  'ACOSO',
  'CONTENIDO_SEXUAL',
  'VIOLENCIA',
  'OTRO',
] as const;
export type ReportReason = (typeof reportReasons)[number];

export const reportReasonLabels: Record<ReportReason, string> = {
  EJERCICIO_PELIGROSO: 'Ejercicio peligroso',
  INFORMACION_ENGANOSA: 'Información engañosa',
  PLAGIO: 'Copia de otra rutina',
  SPAM: 'Spam',
  ACOSO: 'Acoso',
  CONTENIDO_SEXUAL: 'Contenido sexual',
  VIOLENCIA: 'Violencia',
  OTRO: 'Otro',
};

export const reportTargetKinds = ['ROUTINE', 'EXERCISE', 'COMMENT'] as const;
export type ReportTargetKind = (typeof reportTargetKinds)[number];

export const reportResultSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  contentHidden: z.boolean(),
});
