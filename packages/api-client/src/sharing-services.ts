import { z } from 'zod';
import { inviteResultSchema, myInvitationSchema, routineShareSchema } from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/** Compartir con invitación (RF-13). */
export function createRoutineSharingServices(request: RequestFn) {
  return {
    invite: (routineId: string, usuarioIds: readonly string[]) =>
      request(`/routines/${routineId}/shares`, inviteResultSchema, {
        method: 'POST',
        body: { usuarioIds },
      }),
    listShares: (routineId: string) =>
      request(`/routines/${routineId}/shares`, z.array(routineShareSchema), { method: 'GET' }),
    revoke: (routineId: string, shareId: string) =>
      request(`/routines/${routineId}/shares/${shareId}`, routineShareSchema, {
        method: 'DELETE',
      }),
    myInvitations: (estado?: 'PENDING' | 'ACCEPTED') =>
      request(
        `/me/routine-invitations${estado ? `?estado=${estado}` : ''}`,
        z.array(myInvitationSchema),
        { method: 'GET' },
      ),
    accept: (shareId: string) =>
      request(`/routine-shares/${shareId}/accept`, routineShareSchema, { method: 'POST' }),
    decline: (shareId: string) =>
      request(`/routine-shares/${shareId}/decline`, routineShareSchema, { method: 'POST' }),
  };
}

export type RoutineSharingServices = ReturnType<typeof createRoutineSharingServices>;
