import { z } from 'zod';

/** Una persona invitada a una rutina, vista por la autora (`GET /routines/:id/shares`). */
export const routineShareSchema = z.object({
  id: z.string().uuid(),
  rutinaId: z.string().uuid(),
  invitadoId: z.string(),
  invitadoNombre: z.string().nullable(),
  estado: z.string(),
  origen: z.string(),
  respondidaEn: z.string().nullable(),
  creadaEn: z.string(),
});
export type RoutineShare = z.infer<typeof routineShareSchema>;

export const inviteResultSchema = z.object({
  creados: z.array(routineShareSchema),
  omitidos: z.array(z.object({ usuarioId: z.string(), motivo: z.string() })),
});
export type InviteResult = z.infer<typeof inviteResultSchema>;

/** `GET /me/routine-invitations`: el contador de «Compartidas conmigo». */
export const myInvitationSchema = z.object({
  id: z.string().uuid(),
  estado: z.string(),
  origen: z.string(),
  rutina: z.object({ id: z.string().uuid(), nombre: z.string(), dias: z.number().int() }).nullable(),
  deParte: z.object({ id: z.string(), nombre: z.string() }),
  creadaEn: z.string(),
});
export type MyInvitation = z.infer<typeof myInvitationSchema>;

export const shareStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptó',
  DECLINED: 'Rechazó',
  REVOKED: 'Revocada',
};
