import { ApiError } from '@/shared/api/api-error';

/**
 * Errores de lectura que son un ESTADO válido de la pantalla y la pantalla ya
 * explica por sí misma (invitación sin aceptar, contenido oculto por moderación,
 * sesión caducada). Avisar además con un toast de error alarma sin motivo.
 */
const HANDLED_BY_THE_SCREEN = new Set(['SHARE_PENDING', 'CONTENT_HIDDEN']);

export function shouldToastQueryError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.kind === 'unauthorized') return false;
    if (error.code && HANDLED_BY_THE_SCREEN.has(error.code)) return false;
  }
  return true;
}
