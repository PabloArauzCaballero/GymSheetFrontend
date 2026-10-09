/** Estados de una invitación a una rutina (RF-13). */
export const shareStatuses = ['PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED'] as const;
export type ShareStatus = (typeof shareStatuses)[number];

/** Una invitación vista por quien comparte («Compartida con»). */
export type RoutineShare = {
  id: string;
  rutinaId: string;
  invitadoId: string;
  invitadoNombre: string | null;
  estado: ShareStatus;
  origen: string;
  respondidaEn: string | null;
  creadaEn: string;
};

export type InviteSkipReason = 'YA_INVITADO' | 'ES_EL_AUTOR' | 'USUARIO_NO_ENCONTRADO';

export type InviteResult = {
  creados: RoutineShare[];
  omitidos: Array<{ usuarioId: string; motivo: InviteSkipReason }>;
};

/** Una invitación vista por quien la recibe (`GET /me/routine-invitations`). */
export type RoutineInvitation = {
  id: string;
  estado: ShareStatus;
  origen: string;
  rutina: { id: string; nombre: string; dias: number } | null;
  deParte: { id: string; nombre: string };
  creadaEn: string;
};
