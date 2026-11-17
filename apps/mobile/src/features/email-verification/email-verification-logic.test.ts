/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@gymsheet/api-client';
import { emailVerificationCopy } from '@gymsheet/domain';
import {
  cooldownFromError,
  isEmailVerificationRequired,
  isEmailVerificationResponse,
  needsNewPin,
  pinErrorMessage,
  sanitizePin,
} from './email-verification-logic.ts';

const apiError = (status: number, code?: string, details?: Record<string, unknown>) =>
  new ApiError({ message: 'x', status, kind: 'validation', code, details });

test('el PIN se queda solo con seis dígitos, aunque venga pegado con texto', () => {
  assert.equal(sanitizePin('Código: 123 456'), '123456');
  assert.equal(sanitizePin('12345678'), '123456');
  assert.equal(sanitizePin('abc'), '');
});

test('cada código de PIN tiene su frase compartida', () => {
  assert.equal(pinErrorMessage(apiError(400, 'EMAIL_PIN_INVALID')), emailVerificationCopy.errors.EMAIL_PIN_INVALID);
  assert.equal(pinErrorMessage(apiError(400, 'EMAIL_PIN_EXPIRED')), emailVerificationCopy.errors.EMAIL_PIN_EXPIRED);
  assert.equal(pinErrorMessage(apiError(400, 'EMAIL_PIN_EXHAUSTED')), emailVerificationCopy.errors.EMAIL_PIN_EXHAUSTED);
  assert.equal(pinErrorMessage(apiError(429, 'EMAIL_PIN_COOLDOWN')), emailVerificationCopy.errors.EMAIL_PIN_COOLDOWN);
});

test('un fallo que no es de PIN no inventa frase', () => {
  assert.equal(pinErrorMessage(apiError(500)), null);
  assert.equal(pinErrorMessage(new Error('boom')), null);
});

test('la espera sale del 429 y, si no la trae, del valor por defecto', () => {
  assert.equal(cooldownFromError(apiError(429, 'EMAIL_PIN_COOLDOWN', { retryAfterSeconds: 42.2 })), 43);
  assert.equal(cooldownFromError(apiError(429, 'EMAIL_PIN_COOLDOWN')), 60);
  assert.equal(cooldownFromError(apiError(400, 'EMAIL_PIN_INVALID')), null);
});

test('vencido o agotado pide un código nuevo; incorrecto no', () => {
  assert.ok(needsNewPin(apiError(400, 'EMAIL_PIN_EXPIRED')));
  assert.ok(needsNewPin(apiError(400, 'EMAIL_PIN_EXHAUSTED')));
  assert.ok(!needsNewPin(apiError(400, 'EMAIL_PIN_INVALID')));
});

test('reconoce el 403 de verificación en el error y en la respuesta cruda', () => {
  assert.ok(isEmailVerificationRequired(apiError(403, 'EMAIL_VERIFICATION_REQUIRED')));
  assert.ok(!isEmailVerificationRequired(apiError(403, 'FORBIDDEN')));
  assert.ok(isEmailVerificationResponse(403, { code: 'EMAIL_VERIFICATION_REQUIRED' }));
  assert.ok(!isEmailVerificationResponse(403, null));
  assert.ok(!isEmailVerificationResponse(400, { code: 'EMAIL_VERIFICATION_REQUIRED' }));
});
