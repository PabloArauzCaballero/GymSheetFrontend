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

export type CommentAttachmentKind = 'GIF' | 'STICKER' | 'IMAGEN' | 'VIDEO' | 'ARCHIVO';

/** Lo que un comentario lleva adjunto: un GIF, un sticker, una foto, un video o un archivo. */
export type CommentAttachment = {
  tipo: CommentAttachmentKind;
  url: string;
  mime?: string | null;
  nombre?: string | null;
  bytes?: number | null;
  ancho?: number | null;
  alto?: number | null;
};

/** Un resultado del buscador de GIFs y stickers. */
export type GifItem = {
  id: string;
  titulo: string;
  url: string;
  vistaPreviaUrl: string;
  ancho: number;
  alto: number;
};

export type GifPage = { items: GifItem[]; siguiente: number | null; disponible: boolean };

export type RoutineComment = {
  id: string;
  autor: { id: string; nombre: string; fotoUrl?: string | null };
  /** «Me gusta» del comentario. 0 y `false` si el backend aún no los envía. */
  likes: number;
  meGusta: boolean;
  /** Vacío en un comentario que su autor borró. */
  texto: string;
  adjunto?: CommentAttachment | null;
  respuestaA: string | null;
  creadoEn: string;
  esMio: boolean;
  respuestas: RoutineComment[];
};

export type CommentPage = { items: RoutineComment[]; siguienteCursor: string | null; total?: number };

/** Orden de `GET /comments/:kind/:id`: los más nuevos o los de más «me gusta». */
export type CommentOrder = 'recientes' | 'utiles';

/** `PUT/DELETE /comments/:commentId/like`. */
export type CommentLikeState = { likes: number; meGusta: boolean };

export type CreateCommentInput = { texto: string; respuestaA?: string | null; adjunto?: CommentAttachment | null };

/** Qué se puede denunciar desde la app (`POST /me/reports`). */
export type ReportTargetKind = 'ROUTINE' | 'EXERCISE' | 'COMMENT';
