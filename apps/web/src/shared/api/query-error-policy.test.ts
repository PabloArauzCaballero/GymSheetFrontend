import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { shouldRetryQuery, shouldToastQueryError } from './query-error-policy';

const forbidden = (code?: string) =>
  new ApiError({ kind: 'forbidden', status: 403, message: 'No tienes permisos', ...(code ? { code } : {}) });
const legalBlock = () =>
  new ApiError({ kind: 'unexpected', status: 428, message: 'Acepta', code: 'LEGAL_ACCEPTANCE_REQUIRED' });

describe('shouldToastQueryError', () => {
  it('no avisa de una invitación pendiente: la pantalla muestra Aceptar/Rechazar', () => {
    expect(shouldToastQueryError(forbidden('SHARE_PENDING'))).toBe(false);
    expect(shouldToastQueryError(forbidden('CONTENT_HIDDEN'))).toBe(false);
  });
  it('no avisa de un correo sin verificar: la pantalla social muestra «Verifica tu correo»', () => {
    expect(shouldToastQueryError(forbidden('EMAIL_VERIFICATION_REQUIRED'))).toBe(false);
  });
  it('sí avisa de un 403 real y de cualquier otro fallo', () => {
    expect(shouldToastQueryError(forbidden())).toBe(true);
    expect(shouldToastQueryError(new Error('boom'))).toBe(true);
  });
  it('no avisa de sesión caducada', () => {
    expect(shouldToastQueryError(new ApiError({ kind: 'unauthorized', status: 401, message: 'x' }))).toBe(false);
  });
  it('no avisa de un bloqueo legal, con o sin código: lo explica la pantalla legal', () => {
    expect(shouldToastQueryError(legalBlock())).toBe(false);
    expect(shouldToastQueryError(new ApiError({ kind: 'unexpected', status: 428, message: 'x' }))).toBe(false);
  });
});

describe('shouldRetryQuery', () => {
  it('never retries a legal block or a final answer', () => {
    expect(shouldRetryQuery(0, legalBlock())).toBe(false);
    expect(shouldRetryQuery(0, forbidden())).toBe(false);
  });
  it('retries a transient failure twice', () => {
    const outage = new ApiError({ kind: 'unexpected', status: 503, message: 'x' });
    expect(shouldRetryQuery(0, outage)).toBe(true);
    expect(shouldRetryQuery(1, outage)).toBe(true);
    expect(shouldRetryQuery(2, outage)).toBe(false);
  });
});
