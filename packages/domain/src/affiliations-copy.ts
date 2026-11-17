import type { AffiliationEndReason, AffiliationRejectReason } from '@gymsheet/schemas';

/**
 * Words of the affiliation flows (franja 7b): the gym's chips, the reasons
 * the person reads and the backend's errors in Spanish.
 */

export const affiliationRejectLabels: Readonly<Record<AffiliationRejectReason, string>> = {
  UNKNOWN_PERSON: 'No la conozco',
  CI_MISMATCH: 'El CI no coincide',
  WRONG_LOCATION: 'Otra sede',
  NOT_A_COACH_HERE: 'No entrena aquí',
  OTHER: 'Otro motivo',
};

export const affiliationEndLabels: Readonly<Record<AffiliationEndReason, string>> = {
  NO_LONGER_MEMBER: 'Ya no es socio',
  NO_LONGER_COACH: 'Ya no entrena aquí',
  CONDUCT: 'Convivencia',
  OTHER: 'Otro motivo',
};

/** A note is required with OTHER (backend 422 AFFILIATION_NOTE_REQUIRED) and has 3–500 characters. */
export function affiliationNoteError(code: string | null, note: string): string | null {
  const text = note.trim();
  if (!code) return 'Elige un motivo.';
  if (code === 'OTHER' && text.length === 0) return 'Explica el motivo para que la persona sepa qué pasó.';
  if (text.length > 0 && text.length < 3) return 'Escribe al menos 3 letras.';
  if (text.length > 500) return 'Máximo 500 caracteres.';
  return null;
}

/** Why a row closed, as the person or the coach reads it. */
const REASON_TEXT: Readonly<Record<string, string>> = {
  UNKNOWN_PERSON: 'El gimnasio no te reconoce como socio o entrenador.',
  CI_MISMATCH: 'Los dígitos del CI no coinciden con los del gimnasio.',
  WRONG_LOCATION: 'La sede que elegiste no es la tuya.',
  NOT_A_COACH_HERE: 'El gimnasio no te tiene como entrenador.',
  NO_LONGER_MEMBER: 'El gimnasio indicó que ya no eres socio.',
  NO_LONGER_COACH: 'El gimnasio indicó que ya no entrenas allí.',
  CONDUCT: 'El gimnasio la terminó por una cuestión de convivencia.',
  OTHER: 'El gimnasio dejó una nota.',
  WITHDRAWN: 'La cancelaste.',
  LEFT: 'La dejaste.',
  SWITCHED_GYM: 'Terminó al confirmarte tu nuevo gimnasio.',
  ACCOUNT_CLOSED: 'Terminó al cerrar la cuenta.',
};

export function affiliationReasonText(code: string | null | undefined, note?: string | null): string | null {
  const text = code ? REASON_TEXT[code] : undefined;
  const trimmed = note?.trim();
  if (trimmed) return text && code !== 'OTHER' ? `${text} «${trimmed}»` : `«${trimmed}»`;
  return text ?? null;
}

export const affiliationCopy = {
  join: 'Hacerme socio',
  joinCoach: 'Soy entrenador aquí',
  joinTitle: 'Hazte socio',
  joinCoachTitle: 'Entrenas en este gimnasio',
  joinBody: 'El gimnasio compara los 3 dígitos con su registro y te confirma.',
  send: 'Enviar solicitud',
  sent: 'Solicitud enviada',
  sentToast: 'Solicitud enviada. Te avisamos cuando el gimnasio responda.',
  member: 'Eres socio',
  coach: 'Eres entrenador aquí',
  cancel: 'Cancelar solicitud',
  leave: 'Dejar de ser socio',
  leaveCoach: 'Dejar este gimnasio',
  switchTitle: (from: string) => `Ya eres socio de ${from}`,
  switchBody: (to: string) => `¿Quieres cambiarte a ${to}? Sigues en tu gimnasio actual hasta que ${to} te confirme.`,
  switchConfirm: 'Sí, cambiarme',
  ciLabel: 'Últimos 3 dígitos de tu CI',
  ciHint: 'Solo los ve el gimnasio mientras decide.',
  signIn: 'Inicia sesión para hacerte socio',
  myAffiliations: 'Mis afiliaciones',
  emptyMine: 'Cuando pidas ser socio o entrenador de un gimnasio, lo ves aquí con su estado.',
  // The gym's «Socios»
  socios: 'Socios',
  requests: 'Solicitudes',
  members: 'Socios',
  coaches: 'Entrenadores',
  confirm: 'Confirmar',
  reject: 'Rechazar',
  end: 'Terminar',
  emptyRequests: 'Cuando alguien pida ser socio o entrenador, su solicitud llega aquí.',
  emptyMembers: 'Tus socios confirmados aparecen aquí.',
  emptyCoaches: 'Los entrenadores que confirmes aparecen aquí, personas y coaches.',
  gymNotActive: 'Publica tu gimnasio para ver y decidir solicitudes. Tus socios y entrenadores siguen aquí.',
  // The coach's «Mis gimnasios»
  myGyms: 'Mis gimnasios',
  requestLink: 'Pedir vínculo',
  emptyLinks: 'Pide a un gimnasio que te muestre como entrenador: escribe su @usuario.',
  handleLabel: '@usuario del gimnasio',
} as const;

const ERRORS: Readonly<Record<string, string>> = {
  AFFILIATION_ALREADY_LIVE: 'Ya tienes una solicitud o afiliación con este gimnasio.',
  AFFILIATION_SOCIO_PENDING: 'Ya pediste ser socio de otro gimnasio. Cancela esa solicitud primero.',
  AFFILIATION_INVALID_TRANSITION: 'La afiliación ya cambió. Recarga para verla.',
  AFFILIATION_NOTE_REQUIRED: 'Explica el motivo para que la persona sepa qué pasó.',
  AFFILIATION_LOCATION_INVALID: 'Esa sede no es de este gimnasio. Elige otra.',
  GYM_NOT_ACTIVE: 'Publica tu gimnasio para ver y decidir solicitudes.',
  COACH_NOT_PUBLIC: 'Publica tu perfil de coach para pedir un vínculo.',
  EMAIL_VERIFICATION_REQUIRED: 'Verifica tu correo para pedir una afiliación.',
  BUSINESS_TYPE_NOT_ALLOWED: 'Tu tipo de negocio no gestiona afiliaciones.',
  ACCOUNT_KIND_NOT_ALLOWED: 'Las cuentas de negocio no se afilian como personas.',
  SOCIO_OF_ANOTHER_GYM: 'Ya eres socio de otro gimnasio.',
};

function dayOf(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('es-BO', { day: 'numeric', month: 'long' });
}

/** Errors of the affiliation flows in Spanish; unknown codes fall back to the backend's message. */
export function affiliationErrorMessage(
  code: string | null | undefined,
  fallback: string,
  details?: Readonly<Record<string, unknown>> | null,
  status?: number,
): string {
  switch (code) {
    case 'AFFILIATION_LIMIT':
      return `Tienes ${typeof details?.max === 'number' ? details.max : 5} solicitudes esperando. Espera respuesta o cancela alguna.`;
    case 'AFFILIATION_COOLDOWN': {
      const day = dayOf(details?.retryAfter);
      return day ? `Podrás volver a pedirlo desde el ${day}.` : 'Todavía no puedes volver a pedirlo a este gimnasio.';
    }
    default:
      if (code && ERRORS[code]) return ERRORS[code] ?? fallback;
      if (status === 404) return 'No encontramos ese gimnasio, o todavía no está publicado.';
      return fallback;
  }
}
