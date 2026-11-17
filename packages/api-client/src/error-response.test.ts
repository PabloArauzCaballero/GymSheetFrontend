import { describe, expect, it } from 'vitest';
import { ApiError } from './api-error';
import {
  apiErrorFromProblem,
  apiErrorFromResponse,
  fieldErrorEntries,
  isLegalAcceptanceRequired,
} from './error-response';

describe('apiErrorFromProblem', () => {
  it('keeps the code, details and the first message of each field of a 400', () => {
    const error = apiErrorFromProblem(400, {
      detail: 'Datos inválidos.',
      code: 'VALIDATION_FAILED',
      details: { hint: 1 },
      requestId: 'req-1',
      issues: { fieldErrors: { fechaNacimiento: ['Debes tener al menos 18 años.', 'otro'], genero: [] } },
    });
    expect(error).toMatchObject({
      message: 'Datos inválidos.',
      status: 400,
      kind: 'validation',
      code: 'VALIDATION_FAILED',
      details: { hint: 1 },
      requestId: 'req-1',
    });
    expect(error.fieldErrors).toEqual({ fechaNacimiento: 'Debes tener al menos 18 años.' });
  });

  it('falls back to a generic message and no field errors for a body that is not a problem', () => {
    const error = apiErrorFromProblem(500, 'boom');
    expect(error.message).toBe('La operación no pudo completarse.');
    expect(error.kind).toBe('unexpected');
    expect(error.fieldErrors).toEqual({});
  });

  it('reads a Response, including one without a JSON body', async () => {
    const error = await apiErrorFromResponse(new Response('not json', { status: 409 }));
    expect(error.kind).toBe('conflict');
  });
});

describe('isLegalAcceptanceRequired', () => {
  it('matches the legal code or any 428, and nothing else', () => {
    expect(isLegalAcceptanceRequired(apiErrorFromProblem(428, {}))).toBe(true);
    expect(isLegalAcceptanceRequired(apiErrorFromProblem(403, { code: 'LEGAL_ACCEPTANCE_REQUIRED' }))).toBe(true);
    expect(isLegalAcceptanceRequired(apiErrorFromProblem(409, { code: 'TERMS_VERSION_OUTDATED' }))).toBe(false);
    expect(isLegalAcceptanceRequired({ status: 428 })).toBe(false);
  });
});

describe('fieldErrorEntries', () => {
  it('returns the messages of the requested fields in their order, ignoring the rest', () => {
    const error = new ApiError({
      message: 'x',
      status: 400,
      kind: 'validation',
      fieldErrors: { genero: 'Elige tu sexo.', termsVersion: 'Falta.', email: 'Correo inválido.' },
    });
    expect(fieldErrorEntries(error, ['email', 'genero'] as const)).toEqual([
      ['email', 'Correo inválido.'],
      ['genero', 'Elige tu sexo.'],
    ]);
    expect(fieldErrorEntries(new Error('x'), ['email'] as const)).toEqual([]);
  });
});
