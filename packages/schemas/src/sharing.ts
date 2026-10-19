import { z } from 'zod';
import { shareStatuses } from '@gymsheet/types';

export const routineShareSchema = z.object({
  id: z.string(),
  rutinaId: z.string(),
  invitadoId: z.string(),
  invitadoNombre: z.string().nullable(),
  estado: z.enum(shareStatuses),
  origen: z.string(),
  respondidaEn: z.string().nullable(),
  creadaEn: z.string(),
});

export const inviteResultSchema = z.object({
  creados: z.array(routineShareSchema),
  omitidos: z.array(
    z.object({
      usuarioId: z.string(),
      motivo: z.enum(['YA_INVITADO', 'ES_EL_AUTOR', 'USUARIO_NO_ENCONTRADO']),
    }),
  ),
});

export const routineInvitationSchema = z.object({
  id: z.string(),
  estado: z.enum(shareStatuses),
  origen: z.string(),
  rutina: z.object({ id: z.string(), nombre: z.string(), dias: z.number().int() }).nullable(),
  deParte: z.object({ id: z.string(), nombre: z.string() }),
  creadaEn: z.string(),
});
