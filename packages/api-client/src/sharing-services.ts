import { z } from 'zod';
import {
  inviteResultSchema,
  routineInvitationSchema,
  routineSchema,
  routineShareSchema,
} from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/**
 * Publicar, copiar y compartir (RF-09, RF-10, RF-13).
 *
 * `publish` puede responder `409 ROUTINE_DUPLICATE` con `details.existingRoutineId`;
 * `share.invite` envía `usuarioIds` y devuelve creados y omitidos.
 */
export function createSharingServices(request: RequestFn) {
  return {
    publish: (id: string) => request(`/routines/${id}/publish`, routineSchema, { method: 'POST' }),
    unpublish: (id: string) =>
      request(`/routines/${id}/unpublish`, routineSchema, { method: 'POST' }),
    copy: (id: string) => request(`/routines/${id}/copy`, routineSchema, { method: 'POST' }),
    /** Aplica la versión nueva del original a mi copia; nunca se hace sola (D2). */
    syncFromSource: (id: string) =>
      request(
        `/routines/${id}/sync-from-source`,
        routineSchema.extend({ actualizada: z.boolean() }),
        { method: 'POST' },
      ),
    invite: (id: string, usuarioIds: string[]) =>
      request(`/routines/${id}/shares`, inviteResultSchema, {
        method: 'POST',
        body: { usuarioIds },
      }),
    listShares: (id: string) =>
      request(`/routines/${id}/shares`, z.array(routineShareSchema), { method: 'GET' }),
    revokeShare: (id: string, shareId: string) =>
      request(`/routines/${id}/shares/${shareId}`, routineShareSchema, { method: 'DELETE' }),
    myInvitations: (estado?: 'PENDING' | 'ACCEPTED') =>
      request(
        `/me/routine-invitations${estado ? `?estado=${estado}` : ''}`,
        z.array(routineInvitationSchema),
        { method: 'GET' },
      ),
    accept: (shareId: string) =>
      request(`/routine-shares/${shareId}/accept`, routineShareSchema, { method: 'POST' }),
    decline: (shareId: string) =>
      request(`/routine-shares/${shareId}/decline`, routineShareSchema, { method: 'POST' }),
  };
}

export type SharingServices = ReturnType<typeof createSharingServices>;
