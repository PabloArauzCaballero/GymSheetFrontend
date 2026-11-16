import { ApiError, isLegalAcceptanceRequired } from '@/shared/api/api-error';

/**
 * Errores de lectura que son un ESTADO válido de la pantalla y la pantalla ya
 * explica por sí misma (invitación sin aceptar, contenido oculto por moderación,
 * sesión caducada). Avisar además con un toast de error alarma sin motivo.
 */
// `DISCOVERY_PREFERENCES_REQUIRED`: Comunidad enseña ahí el formulario de preferencias.
const HANDLED_BY_THE_SCREEN = new Set([
  'SHARE_PENDING',
  'CONTENT_HIDDEN',
  'DISCOVERY_PREFERENCES_REQUIRED',
]);

export function shouldToastQueryError(error: unknown): boolean {
  // The legal gate replaces the portal until the person accepts (same predicate as the gate).
  if (isLegalAcceptanceRequired(error)) return false;
  if (error instanceof ApiError) {
    if (error.kind === 'unauthorized') return false;
    if (error.code && HANDLED_BY_THE_SCREEN.has(error.code)) return false;
  }
  return true;
}

/** Kinds whose answer a retry cannot change: it would only delay the screen. */
const NOT_RETRIED = new Set(['unauthorized', 'forbidden', 'not-found', 'validation']);

/** TanStack `retry` of every query: at most two retries, none for a final answer. */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  // A legal block (428) only lifts once the person accepts the current documents.
  if (isLegalAcceptanceRequired(error)) return false;
  if (error instanceof ApiError && NOT_RETRIED.has(error.kind)) return false;
  return failureCount < 2;
}
