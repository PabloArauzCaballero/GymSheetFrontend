import type { RatingSummary } from './core';

/** Qué se puede valorar o comentar (RF-12). Los ejercicios son los privados de una rutina publicada. */
export const contentKinds = ['ROUTINE', 'EXERCISE'] as const;
export type ContentKind = (typeof contentKinds)[number];

/** `GET/PUT/DELETE /ratings/:kind/:id`. `miValoracion` es nulo si no has valorado. */
export type ContentRating = RatingSummary & { miValoracion: number | null };

export type RoutineComment = {
  id: string;
  autor: { id: string; nombre: string };
  /** Vacío en un comentario que su autor borró. */
  texto: string;
  respuestaA: string | null;
  creadoEn: string;
  esMio: boolean;
  respuestas: RoutineComment[];
};

export type CommentPage = { items: RoutineComment[]; siguienteCursor: string | null };

export type CreateCommentInput = { texto: string; respuestaA?: string | null };

/** Qué se puede denunciar desde la app (`POST /me/reports`). */
export type ReportTargetKind = 'ROUTINE' | 'EXERCISE' | 'COMMENT';
