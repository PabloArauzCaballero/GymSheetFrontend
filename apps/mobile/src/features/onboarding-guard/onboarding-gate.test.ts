/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { CONOCER_PATH, decideOnboardingGate, type OnboardingGateInput } from './onboarding-gate.ts';

const base: OnboardingGateInput = { role: 'CLIENTE', pathname: '/comunidad', status: undefined, failed: false };

test('a CLIENTE waits for the first answer before anything is shown', () => {
  assert.deepEqual(decideOnboardingGate(base), { kind: 'wait' });
  assert.deepEqual(decideOnboardingGate({ ...base, role: null }), { kind: 'wait' });
});

test('a CLIENTE without COMPLETED onboarding is held on /onboarding', () => {
  for (const status of ['NOT_STARTED', 'IN_PROGRESS', 'REQUIRES_UPDATE'] as const) {
    assert.deepEqual(decideOnboardingGate({ ...base, status }), { kind: 'redirect', to: 'onboarding' });
    assert.deepEqual(decideOnboardingGate({ ...base, status, pathname: '/onboarding' }), { kind: 'pass' });
  }
});

test('once COMPLETED, /onboarding sends the CLIENTE to home and the rest passes', () => {
  assert.deepEqual(decideOnboardingGate({ ...base, status: 'COMPLETED', pathname: '/onboarding' }), {
    kind: 'redirect',
    to: 'home',
  });
  assert.deepEqual(decideOnboardingGate({ ...base, status: 'COMPLETED' }), { kind: 'pass' });
});

test('a failed check shows an error instead of redirecting', () => {
  assert.deepEqual(decideOnboardingGate({ ...base, failed: true }), { kind: 'error' });
  assert.deepEqual(decideOnboardingGate({ ...base, failed: true, pathname: '/onboarding' }), { kind: 'error' });
});

test('staff and admins are never sent to onboarding', () => {
  for (const role of ['COACH', 'FRONT_DESK', 'ENTRENADOR_EXTERNO', 'ADMIN', 'SYSTEM_ADMIN'] as const) {
    assert.deepEqual(decideOnboardingGate({ ...base, role }), { kind: 'pass' });
    assert.deepEqual(decideOnboardingGate({ ...base, role, pathname: '/onboarding' }), { kind: 'redirect', to: 'home' });
  }
});

test('finishing the questionnaire with the Conocer step PENDING offers it once', () => {
  const done = { ...base, status: 'COMPLETED' as const, pathname: '/onboarding' };
  assert.deepEqual(decideOnboardingGate({ ...done, socialStep: 'PENDING' }), { kind: 'redirect', to: 'conocer' });
  for (const socialStep of ['DONE', 'SKIPPED', undefined] as const) {
    assert.deepEqual(decideOnboardingGate({ ...done, socialStep }), { kind: 'redirect', to: 'home' });
  }
});

test('a PENDING Conocer step never pulls a completed member off another screen', () => {
  assert.deepEqual(decideOnboardingGate({ ...base, status: 'COMPLETED', socialStep: 'PENDING' }), { kind: 'pass' });
});

test('a completed member can open the Conocer step whatever its state', () => {
  for (const socialStep of ['PENDING', 'DONE', 'SKIPPED', undefined] as const) {
    assert.deepEqual(
      decideOnboardingGate({ ...base, status: 'COMPLETED', socialStep, pathname: CONOCER_PATH }),
      { kind: 'pass' },
    );
  }
});

test('the Conocer step waits for the questionnaire to be COMPLETED', () => {
  assert.deepEqual(
    decideOnboardingGate({ ...base, status: 'IN_PROGRESS', socialStep: 'PENDING', pathname: CONOCER_PATH }),
    { kind: 'redirect', to: 'onboarding' },
  );
});

test('staff are never offered the Conocer step', () => {
  assert.deepEqual(
    decideOnboardingGate({ ...base, role: 'COACH', status: 'COMPLETED', socialStep: 'PENDING', pathname: '/onboarding' }),
    { kind: 'redirect', to: 'home' },
  );
});
