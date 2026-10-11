import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { shouldToastQueryError } from './query-error-policy';

const forbidden = (code?: string) =>
  new ApiError({ kind: 'forbidden', status: 403, message: 'No tienes permisos', ...(code ? { code } : {}) });

describe('shouldToastQueryError', () => {
  it('no avisa de una invitación pendiente: la pantalla muestra Aceptar/Rechazar', () => {
    expect(shouldToastQueryError(forbidden('SHARE_PENDING'))).toBe(false);
    expect(shouldToastQueryError(forbidden('CONTENT_HIDDEN'))).toBe(false);
  });
  it('sí avisa de un 403 real y de cualquier otro fallo', () => {
    expect(shouldToastQueryError(forbidden())).toBe(true);
    expect(shouldToastQueryError(new Error('boom'))).toBe(true);
  });
  it('no avisa de sesión caducada', () => {
    expect(shouldToastQueryError(new ApiError({ kind: 'unauthorized', status: 401, message: 'x' }))).toBe(false);
  });
});
