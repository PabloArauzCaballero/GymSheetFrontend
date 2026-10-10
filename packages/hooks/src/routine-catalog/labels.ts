import type { CardioModality } from '@gymsheet/types';

/** Motivos de denuncia que acepta `POST /me/reports` (taxonomía cerrada del backend). */
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

/** Estado de una invitación para compartir, como se lee en «Compartida con». */
export const shareStatusLabels: Record<string, string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptó',
  DECLINED: 'Rechazó',
  REVOKED: 'Revocada',
};

export const cardioModalityLabels: Record<CardioModality, string> = {
  CORRER: 'Correr',
  CAMINAR: 'Caminar',
  BICI: 'Bici',
  REMO: 'Remo',
  ELIPTICA: 'Elíptica',
  ESCALADORA: 'Escaladora',
  NADAR: 'Nadar',
  HIIT: 'HIIT',
  OTRO: 'Otro',
};
