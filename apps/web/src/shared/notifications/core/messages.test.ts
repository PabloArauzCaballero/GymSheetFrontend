import { describe, expect, it } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { resolveError } from './messages';

describe('resolveError', () => {
  it('hides technical detail for infrastructure failures', () => {
    const resolved = resolveError(
      new ApiError({ message: 'ECONNREFUSED at db.pool.ts:42', status: 0, kind: 'network' }),
    );
    expect(resolved.message).toBe('Sin conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
    expect(resolved.message).not.toContain('ECONN');
    expect(resolved.code).toBe('network');
    expect(resolved.retryable).toBe(true);
  });

  it('surfaces user-safe backend copy for validation errors', () => {
    const resolved = resolveError(
      new ApiError({ message: 'El código ya está en uso.', status: 409, kind: 'conflict' }),
    );
    expect(resolved.message).toBe('El código ya está en uso.');
  });

  it('falls back to generic copy when a validation message looks technical', () => {
    const resolved = resolveError(
      new ApiError({ message: 'TypeError: cannot read null', status: 422, kind: 'validation' }),
    );
    expect(resolved.message).toBe('Revisa los datos ingresados e inténtalo de nuevo.');
  });

  it('keeps the request id for telemetry without showing it', () => {
    const resolved = resolveError(
      new ApiError({ message: 'x', status: 500, kind: 'unexpected', requestId: 'req_123' }),
    );
    expect(resolved.requestId).toBe('req_123');
    expect(resolved.message).not.toContain('req_123');
  });

  it('treats non-Error throwables as unexpected failures', () => {
    const resolved = resolveError('boom');
    expect(resolved.code).toBe('unknown');
    expect(resolved.message).toBe('Ocurrió un error inesperado. Inténtalo más tarde.');
  });

  it('never leaks permissions detail — forbidden is generic', () => {
    const resolved = resolveError(
      new ApiError({ message: 'user 7 lacks scope admin:write', status: 403, kind: 'forbidden' }),
    );
    expect(resolved.message).toBe('No tienes permisos para realizar esta acción.');
  });
});
