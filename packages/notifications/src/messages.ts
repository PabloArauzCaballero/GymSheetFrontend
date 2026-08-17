import { ApiError, type ApiErrorKind } from '@gymsheet/api-client';
import type { ResolvedError } from './types';

/**
 * Generic, user-facing Spanish copy per error kind. These never leak technical
 * detail; the real cause is kept in {@link ResolvedError.code}/`requestId` for
 * telemetry only.
 */
const GENERIC_MESSAGE: Record<ApiErrorKind, string> = {
  validation: 'Revisa los datos ingresados e inténtalo de nuevo.',
  unauthorized: 'Tu sesión expiró. Inicia sesión nuevamente.',
  forbidden: 'No tienes permisos para realizar esta acción.',
  'not-found': 'No encontramos el recurso solicitado.',
  conflict: 'El recurso cambió o ya existe. Actualiza e inténtalo de nuevo.',
  'rate-limit': 'Demasiadas solicitudes. Espera un momento e inténtalo de nuevo.',
  network: 'Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.',
  contract: 'La respuesta del servidor no es válida. Inténtalo más tarde.',
  unexpected: 'Ocurrió un error inesperado. Inténtalo más tarde.',
};

const RETRYABLE: ReadonlySet<ApiErrorKind> = new Set<ApiErrorKind>([
  'network',
  'rate-limit',
  'contract',
  'unexpected',
]);

/**
 * Kinds whose backend message is business-meaningful and safe to surface
 * verbatim (field validation, uniqueness/conflict rules, quota copy). Every
 * other kind uses the generic message so raw technical text never reaches a user.
 */
const PREFER_SERVER_MESSAGE: ReadonlySet<ApiErrorKind> = new Set<ApiErrorKind>([
  'validation',
  'conflict',
  'rate-limit',
]);

/** Heuristic guard: refuse to surface strings that look like internals. */
function looksTechnical(message: string): boolean {
  if (!message) return true;
  if (message.length > 240) return true;
  return /(\bat\s+\w+\.|Error:|stack|\bSELECT\b|\bnull\b|undefined|ECONN|TypeError|\/[a-z]+\/[a-z]+\.[jt]s|https?:\/\/)/i.test(
    message,
  );
}

/**
 * Turns any thrown value into a friendly, user-safe result. Only {@link ApiError}
 * carries a `kind`; anything else is treated as an unexpected failure.
 */
export function resolveError(error: unknown): ResolvedError {
  if (error instanceof ApiError) {
    const generic = GENERIC_MESSAGE[error.kind];
    const useServer =
      PREFER_SERVER_MESSAGE.has(error.kind) && !!error.message && !looksTechnical(error.message);
    return {
      title: TITLE[error.kind],
      message: useServer ? error.message : generic,
      code: error.kind,
      requestId: error.requestId,
      retryable: RETRYABLE.has(error.kind),
    };
  }

  return {
    title: 'Algo salió mal',
    message: GENERIC_MESSAGE.unexpected,
    code: error instanceof Error ? error.name : 'unknown',
    retryable: true,
  };
}

const TITLE: Record<ApiErrorKind, string> = {
  validation: 'Datos no válidos',
  unauthorized: 'Sesión expirada',
  forbidden: 'Acceso denegado',
  'not-found': 'No encontrado',
  conflict: 'Conflicto',
  'rate-limit': 'Demasiadas solicitudes',
  network: 'Sin conexión',
  contract: 'Respuesta no válida',
  unexpected: 'Algo salió mal',
};
