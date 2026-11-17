/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@gymsheet/api-client';
import { accountClosureCopy, emailChangeCopy } from '@gymsheet/domain';
import type { ClosurePreview } from '@gymsheet/schemas';
import { closureFailure, closureGroups, closureItemLabel, closureProof, emailChangeFailure, proofMethods } from './account-logic.ts';

const error = (status: number, code?: string, extra: Partial<ConstructorParameters<typeof ApiError>[0]> = {}) =>
  new ApiError({ message: 'Mensaje del servidor.', status, kind: status === 409 ? 'conflict' : 'validation', code, ...extra });

const preview = (emailPin: boolean): ClosurePreview => ({
  allowed: true,
  proof: { password: true, emailPin },
  account: { label: 'Tu cuenta', disposition: 'ANONYMIZED', reason: 'Se borran tu correo y tu nombre.' },
  deleted: [{ table: 'social.messages', label: 'Mensajes', count: 12, reason: null }],
  anonymized: [],
  kept: [{ table: 'billing.payments', label: 'Pagos', count: 1, reason: 'El gimnasio los conserva por ley.' }],
});

test('email change: a wrong password points at the password field', () => {
  assert.deepEqual(emailChangeFailure(error(400, 'CURRENT_PASSWORD_INVALID')), {
    field: 'password',
    message: emailChangeCopy.errors.CURRENT_PASSWORD_INVALID,
  });
  assert.equal(emailChangeFailure(error(400, 'EMAIL_UNCHANGED')).field, 'email');
});

test('email change: 409 by sanction is a banner, a 409 at confirmation is the address taken', () => {
  assert.deepEqual(emailChangeFailure(error(409, 'EMAIL_CHANGE_BLOCKED_BY_SANCTION')), {
    field: null,
    message: emailChangeCopy.errors.EMAIL_CHANGE_BLOCKED_BY_SANCTION,
  });
  assert.deepEqual(emailChangeFailure(error(409)), { field: 'email', message: emailChangeCopy.errors.taken });
});

test('email change: PIN failures go under the code', () => {
  assert.equal(emailChangeFailure(error(400, 'EMAIL_PIN_INVALID')).field, 'pin');
  assert.equal(emailChangeFailure(error(400, 'EMAIL_PIN_EXPIRED')).field, 'pin');
});

test('closure proof: password always, the emailed code too for Google/Apple accounts', () => {
  assert.deepEqual(proofMethods(preview(false)), ['password']);
  assert.deepEqual(proofMethods(preview(true)), ['password', 'pin']);
});

test('closure proof: exactly one, complete, or nothing is sent', () => {
  assert.deepEqual(closureProof('password', 'secreta'), { password: 'secreta' });
  assert.equal(closureProof('password', ''), null);
  assert.deepEqual(closureProof('pin', '12 34 56'), { pin: '123456' });
  assert.equal(closureProof('pin', '12345'), null);
});

test('closure failures: wrong password on the field, staff and missing proof as a banner', () => {
  assert.equal(closureFailure(error(400, 'CURRENT_PASSWORD_INVALID')).field, 'password');
  assert.deepEqual(closureFailure(new ApiError({ message: 'x', status: 403, kind: 'forbidden', code: 'ACCOUNT_CLOSURE_STAFF' })), {
    field: null,
    message: accountClosureCopy.errors.ACCOUNT_CLOSURE_STAFF,
  });
  assert.equal(closureFailure(error(400, 'CLOSURE_PROOF_REQUIRED')).field, null);
  assert.equal(closureFailure(error(400, 'EMAIL_PIN_INVALID')).field, 'pin');
});

test('the preview lists only groups with rows, each with its count', () => {
  assert.deepEqual(closureGroups(preview(false)).map((group) => group.key), ['deleted', 'kept']);
  assert.equal(closureItemLabel({ label: 'Mensajes', count: 12 }), 'Mensajes · 12');
  assert.equal(closureItemLabel({ label: 'Perfil', count: 1 }), 'Perfil');
});
