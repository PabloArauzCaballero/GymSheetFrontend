import type { RatingSummary } from './core';

/** Qué se puede valorar o comentar (RF-12). Los ejercicios son los privados de una rutina publicada. */
export const contentKinds = ['ROUTINE', 'EXERCISE'] as const;
export type ContentKind = (typeof contentKinds)[number];

/** `GET/PUT/DELETE /ratings/:kind/:id`. `miValoracion` es nulo si no has valorado. */
export type ContentRating = RatingSummary & {
  miValoracion: number | null;
  /** Cuántas valoraciones hay de cada nota (5→1). Ausente si el backend aún no lo envía. */
  distribucion?: Record<'1' | '2' | '3' | '4' | '5', number> | null;
};

export type RoutineComment = {
  id: string;
  autor: { id: string; nombre: string; fotoUrl?: string | null };
  /** «Me gusta» del comentario. 0 y `false` si el backend aún no los envía. */
  likes: number;
  meGusta: boolean;
  /** Vacío en un comentario que su autor borró. */
  texto: string;
  respuestaA: string | null;
  creadoEn: string;
  esMio: boolean;
  respuestas: RoutineComment[];
};

export type CommentPage = { items: RoutineComment[]; siguienteCursor: string | null };

/** `PUT/DELETE /comments/:commentId/like`. */
export type CommentLikeState = { likes: number; meGusta: boolean };

export type CreateCommentInput = { texto: string; respuestaA?: string | null };

/** Qué se puede denunciar desde la app (`POST /me/reports`). */
export type ReportTargetKind = 'ROUTINE' | 'EXERCISE' | 'COMMENT';
