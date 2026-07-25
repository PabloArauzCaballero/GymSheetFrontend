import { describe, expect, it } from 'vitest';
import { ApiError, classifyStatus } from './api-error';

describe('API error classification', () => {
  it.each([
    [400, 'validation'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not-found'],
    [409, 'conflict'],
    [429, 'rate-limit'],
    [500, 'unexpected'],
  ] as const)('classifies status %s', (status, expected) => {
    expect(classifyStatus(status)).toBe(expected);
  });

  it('retains a backend request identifier', () => {
    const error = new ApiError({
      message: 'Falló la operación.',
      status: 409,
      kind: 'conflict',
      requestId: '9d393b1c-9fe9-4d4a-a16e-440a3f208a2a',
    });
    expect(error.requestId).toBe('9d393b1c-9fe9-4d4a-a16e-440a3f208a2a');
  });
});
