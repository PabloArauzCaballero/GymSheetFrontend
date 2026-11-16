/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@gymsheet/api-client';
import type { Consent, ConsentKind } from '@gymsheet/schemas';
import {
  consentPromptMessage,
  consentStatusLabel,
  consentsSectionCopy,
  needsRenewal,
  requestConsent,
  runWithConsent,
  sortConsents,
} from './consent-logic.ts';
import { healthConsentMissing, preferencesConsentsReady } from './onboarding-consent-logic.ts';

const required = (kind: string) =>
  new ApiError({ message: 'Falta el consentimiento.', status: 400, kind: 'validation', code: 'CONSENT_REQUIRED', details: { kind } });
const outdated = () =>
  new ApiError({ message: 'Cambió.', status: 409, kind: 'conflict', code: 'CONSENT_VERSION_OUTDATED', details: { kind: 'HEALTH', currentVersion: '2027-01-01' } });

function consent(kind: ConsentKind, granted: boolean, upToDate = granted): Consent {
  return { kind, granted, version: granted ? '2026-12-02' : null, currentVersion: '2026-12-02', upToDate, grantedAt: null, revokedAt: null };
}

test('CONSENT_REQUIRED asks for the named consent and retries the write once', async () => {
  const asked: ConsentKind[] = [];
  let calls = 0;
  const result = await runWithConsent(
    async () => {
      calls += 1;
      if (calls === 1) throw required('ORIENTATION');
      return 'guardado';
    },
    async (kind) => {
      asked.push(kind);
      return true;
    },
  );
  assert.deepEqual(result, { done: true, value: 'guardado' });
  assert.deepEqual(asked, ['ORIENTATION']);
  assert.equal(calls, 2);
});

test('saying no does not retry and reports which consent was missing', async () => {
  let calls = 0;
  const result = await runWithConsent(async () => {
    calls += 1;
    throw required('PRECISE_LOCATION');
  }, async () => false);
  assert.deepEqual(result, { done: false, kind: 'PRECISE_LOCATION' });
  assert.equal(calls, 1);
});

test('any other failure, an unknown kind or a second refusal reaches the caller', async () => {
  const other = new ApiError({ message: 'x', status: 500, kind: 'unexpected' });
  await assert.rejects(runWithConsent(async () => { throw other; }, async () => true), other);
  await assert.rejects(runWithConsent(async () => { throw required('COOKIES'); }, async () => true), /Falta/);
  await assert.rejects(runWithConsent(async () => { throw required('HEALTH'); }, async () => true), /Falta/);
});

test('granting records the current version only after the person accepts', async () => {
  const granted: string[] = [];
  const steps = {
    confirm: async () => true,
    currentVersion: async () => '2026-12-02',
    grant: async (kind: ConsentKind, version: string) => { granted.push(`${kind}@${version}`); },
    onOutdated: () => assert.fail('not outdated'),
  };
  assert.equal(await requestConsent('HEALTH', steps), true);
  assert.deepEqual(granted, ['HEALTH@2026-12-02']);
  assert.equal(await requestConsent('HEALTH', { ...steps, confirm: async () => false }), false);
  assert.deepEqual(granted, ['HEALTH@2026-12-02']);
});

test('a 409 CONSENT_VERSION_OUTDATED records nothing and refreshes; other errors throw', async () => {
  let refreshed = 0;
  const steps = {
    confirm: async () => true,
    currentVersion: async () => '2026-12-02',
    grant: async () => { throw outdated(); },
    onOutdated: () => { refreshed += 1; },
  };
  assert.equal(await requestConsent('HEALTH', steps), false);
  assert.equal(refreshed, 1);
  await assert.rejects(requestConsent('HEALTH', { ...steps, grant: async () => { throw new Error('sin red'); } }), /sin red/);
});

test('the list follows the backend order, leaves the selfie out and says each state in words', () => {
  const sorted = sortConsents([
    consent('PRECISE_LOCATION', true),
    consent('VERIFICATION_SELFIE', false),
    consent('HEALTH', false),
    consent('ORIENTATION', true, false),
  ]);
  assert.deepEqual(sorted.map((item) => item.kind), ['HEALTH', 'ORIENTATION', 'PRECISE_LOCATION']);
  assert.equal(consentStatusLabel(consent('HEALTH', false)), consentsSectionCopy.notGranted);
  assert.equal(consentStatusLabel(consent('HEALTH', true)), consentsSectionCopy.granted);
  assert.equal(needsRenewal(consent('ORIENTATION', true, false)), true);
  assert.equal(consentStatusLabel(consent('ORIENTATION', true, false)), consentsSectionCopy.outdated);
});

test('revoking says what gets erased; granting says it can be withdrawn', () => {
  assert.match(consentPromptMessage('PRECISE_LOCATION', false), /Borramos tu ubicación/);
  assert.match(consentPromptMessage('HEALTH', true), /retirarlo/);
});

test('onboarding: the health consent is only needed to keep physical considerations', () => {
  assert.equal(healthConsentMissing('', false), false);
  assert.equal(healthConsentMissing('  ', false), false);
  assert.equal(healthConsentMissing('Rodilla operada', false), true);
  assert.equal(preferencesConsentsReady('', false, true), true);
  assert.equal(preferencesConsentsReady('Rodilla operada', false, true), false);
  assert.equal(preferencesConsentsReady('Rodilla operada', true, true), true);
  assert.equal(preferencesConsentsReady('', true, false), false);
});
