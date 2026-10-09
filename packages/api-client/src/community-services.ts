import { z } from 'zod';
import {
  commentPageSchema,
  commentSchema,
  ratingResultSchema,
  reportResultSchema,
} from '@gymsheet/schemas';
import type { CommunityKind, ReportReason, ReportTargetKind } from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/** Valoraciones, comentarios y denuncias de rutinas y ejercicios (RF-12). */
export function createCommunityServices(request: RequestFn) {
  return {
    ratingSummary: (kind: CommunityKind, id: string) =>
      request(`/ratings/${kind}/${id}`, ratingResultSchema, { method: 'GET' }),
    /** `400 CANNOT_RATE_OWN` si el contenido es de quien valora. */
    rate: (kind: CommunityKind, id: string, estrellas: number) =>
      request(`/ratings/${kind}/${id}`, ratingResultSchema, {
        method: 'PUT',
        body: { estrellas },
      }),
    removeRating: (kind: CommunityKind, id: string) =>
      request(`/ratings/${kind}/${id}`, ratingResultSchema, { method: 'DELETE' }),
    comments: (kind: CommunityKind, id: string, cursor?: string | null) =>
      request(
        `/comments/${kind}/${id}?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        commentPageSchema,
        { method: 'GET' },
      ),
    /** 10 por minuto y por persona: el 11.º devuelve `429`. */
    comment: (kind: CommunityKind, id: string, texto: string, respuestaA?: string | null) =>
      request(`/comments/${kind}/${id}`, commentSchema, {
        method: 'POST',
        body: { texto, ...(respuestaA ? { respuestaA } : {}) },
      }),
    deleteComment: (commentId: string) =>
      request(`/comments/${commentId}`, z.object({ deleted: z.literal(true) }), {
        method: 'DELETE',
      }),
    report: (input: {
      targetKind: ReportTargetKind;
      targetId: string;
      reason: ReportReason;
      details?: string;
    }) => request('/me/reports', reportResultSchema, { method: 'POST', body: input }),
  };
}

export type CommunityServices = ReturnType<typeof createCommunityServices>;
