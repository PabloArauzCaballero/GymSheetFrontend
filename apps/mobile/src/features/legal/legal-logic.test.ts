/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { authCopy, signupLegalDocuments } from '@gymsheet/domain';
import {
  clientPlatform,
  isLegalAcceptanceResponse,
  isReadingLegalDocument,
  isTermsVersionOutdated,
  legalDocumentRoutes,
  legalVersionLabel,
  outdatedCurrentDocuments,
  termsVersionOf,
} from './legal-logic.ts';

test('the platform header names the store build, anything else is web', () => {
  assert.equal(clientPlatform('ios'), 'ios');
  assert.equal(clientPlatform('android'), 'android');
  assert.equal(clientPlatform('web'), 'web');
  assert.equal(clientPlatform('windows'), 'web');
});

test('only a 428 is the legal gate, with or without its code', () => {
  assert.equal(isLegalAcceptanceResponse(428, { code: 'LEGAL_ACCEPTANCE_REQUIRED' }), true);
  assert.equal(isLegalAcceptanceResponse(428, null), true);
  assert.equal(isLegalAcceptanceResponse(428, { code: 'SOMETHING_ELSE' }), false);
  assert.equal(isLegalAcceptanceResponse(403, { code: 'LEGAL_ACCEPTANCE_REQUIRED' }), false);
  assert.equal(isLegalAcceptanceResponse(401, null), false);
});

test('termsVersion is the current TERMS version', () => {
  const documents = [
    { document: 'PRIVACY', version: '2026-08-01' },
    { document: 'TERMS', version: '2026-08-25' },
  ] as const;
  assert.equal(termsVersionOf([...documents]), '2026-08-25');
  assert.equal(termsVersionOf([]), undefined);
  assert.equal(termsVersionOf(undefined), undefined);
});

test('a stale termsVersion 409 is recognised and carries the current documents', () => {
  const error = {
    code: 'TERMS_VERSION_OUTDATED',
    details: { documents: [{ document: 'TERMS', version: '2026-11-16' }] },
  };
  assert.equal(isTermsVersionOutdated(error), true);
  assert.equal(isTermsVersionOutdated({ code: 'EMAIL_TAKEN' }), false);
  assert.deepEqual(outdatedCurrentDocuments(error.details), [{ document: 'TERMS', version: '2026-11-16' }]);
  assert.equal(outdatedCurrentDocuments({ documents: [{ document: 'COOKIES', version: 'x' }] }), undefined);
  assert.equal(outdatedCurrentDocuments(undefined), undefined);
});

test('the gate steps aside only on the three document screens', () => {
  assert.equal(isReadingLegalDocument('/terminos'), true);
  assert.equal(isReadingLegalDocument('/privacidad'), true);
  assert.equal(isReadingLegalDocument('/normas'), true);
  assert.equal(isReadingLegalDocument('/comunidad'), false);
});

test('signup and the legal gate cover the community rules too', () => {
  assert.deepEqual(Object.keys(legalDocumentRoutes), ['TERMS', 'PRIVACY', 'COMMUNITY']);
  assert.equal(legalDocumentRoutes.COMMUNITY.href, '/(auth)/normas');
  assert.equal(legalDocumentRoutes.COMMUNITY.label, 'Normas de la comunidad');
  // The signup checkbox names the three documents it accepts.
  assert.match(authCopy.terms.plain, /términos.*privacidad \(con su anexo de retención de datos\).*normas de la comunidad/u);
  const current = [
    { document: 'COMMUNITY' as const, version: '2026-08-25' },
    { document: 'TERMS' as const, version: '2026-08-25' },
    { document: 'PRIVACY' as const, version: '2026-08-25' },
  ];
  assert.deepEqual(signupLegalDocuments(current).map((entry) => entry.document), ['TERMS', 'PRIVACY', 'COMMUNITY']);
  // A 409 at signup may carry the community rules among the current versions.
  assert.deepEqual(outdatedCurrentDocuments({ documents: current }), current);
});

test('date versions read as a date', () => {
  assert.equal(legalVersionLabel('2026-08-25'), 'Vigente desde el 25 de agosto de 2026');
  assert.equal(legalVersionLabel('v3'), 'Versión v3');
});
