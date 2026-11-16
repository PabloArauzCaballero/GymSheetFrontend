import type { SanctionReason } from '@gymsheet/schemas';

/**
 * Category label and short text per moderation reason: a mirror of the
 * backend's `REASON_NOTICE` (`src/modules/moderation/moderation-notices.ts`).
 * Only used where the backend's own words cannot travel: the suspended exit
 * of the web carries the reason CODE in the login URL (never its text), and
 * the login screen rebuilds the reason from this closed list. Change both
 * together.
 */
const reasonNotices = {
  CONTENIDO_SEXUAL: { label: 'Contenido sexual', text: 'contenido sexual o desnudos que las normas no permiten' },
  ACOSO: { label: 'Acoso', text: 'mensajes o contenido que hostigan o intimidan a otra persona' },
  DISCURSO_DE_ODIO: { label: 'Discurso de odio', text: 'ataques a personas por lo que son' },
  VIOLENCIA: { label: 'Violencia', text: 'amenazas o contenido violento' },
  SPAM: { label: 'Spam', text: 'publicidad o mensajes repetidos que nadie pidió' },
  PERFIL_FALSO: { label: 'Perfil falso', text: 'hacerse pasar por otra persona o usar datos falsos' },
  MENOR_DE_EDAD: { label: 'Menor de edad', text: 'la cuenta parece ser de una persona menor de 18 años' },
  DROGAS: { label: 'Drogas', text: 'venta o promoción de drogas' },
  EJERCICIO_PELIGROSO: { label: 'Ejercicio peligroso', text: 'ejercicios o consejos que pueden lesionar a alguien' },
  INFORMACION_ENGANOSA: { label: 'Información engañosa', text: 'información falsa que puede confundir o hacer daño' },
  PLAGIO: { label: 'Plagio', text: 'contenido de otra persona presentado como propio' },
  OTRO: { label: 'Otro incumplimiento', text: 'un incumplimiento de las normas de la comunidad' },
} as const satisfies Record<string, Omit<SanctionReason, 'code'>>;

export type SanctionReasonCode = keyof typeof reasonNotices;

export function isSanctionReasonCode(value: unknown): value is SanctionReasonCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(reasonNotices, value);
}

/** The reason of a known code; null for anything else (an unknown code is never echoed). */
export function sanctionReasonFromCode(code: unknown): SanctionReason | null {
  return isSanctionReasonCode(code) ? { code, ...reasonNotices[code] } : null;
}
