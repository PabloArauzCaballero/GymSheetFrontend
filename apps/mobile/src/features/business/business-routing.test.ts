/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { businessResumeStep } from '@gymsheet/domain';
import { businessShellRedirect, homeFor, personShellRedirect } from './business-routing.ts';

const business = { role: 'NEGOCIO', accountKind: 'BUSINESS' } as const;
const person = { role: 'CLIENTE', accountKind: 'PERSON' } as const;

test('a business lands on its own shell, a person on Comunidad', () => {
  assert.equal(homeFor(business), '/(business)');
  assert.equal(homeFor(person), '/comunidad');
  // An older backend without accountKind: the role decides.
  assert.equal(homeFor({ role: 'NEGOCIO' }), '/(business)');
});

test('the person shell sends a business away and renders for a person', () => {
  assert.equal(personShellRedirect(business), '/(business)');
  assert.equal(personShellRedirect(person), null);
  assert.equal(personShellRedirect(null), null);
});

test('the business shell refuses persons and signed-out sessions, waits while loading', () => {
  assert.equal(businessShellRedirect('authenticated', person), '/comunidad');
  assert.equal(businessShellRedirect('unauthenticated', null), '/(auth)/login');
  assert.equal(businessShellRedirect('loading', null), null);
  assert.equal(businessShellRedirect('authenticated', business), null);
  // A closed business account says goodbye instead of landing on login (ADR-0028).
  assert.equal(businessShellRedirect('unauthenticated', null, true), '/(auth)/hasta-pronto');
});

test('the business shell resumes the signup where nextSteps say', () => {
  assert.equal(businessResumeStep(['VERIFY_EMAIL', 'CHOOSE_HANDLE', 'SUBMIT_KYC']), 2);
  assert.equal(businessResumeStep(['COMPLETE_PROFILE', 'SUBMIT_KYC']), 3);
  assert.equal(businessResumeStep(['SUBMIT_KYC']), null);
});
