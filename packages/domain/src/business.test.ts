import { describe, expect, it } from 'vitest';
import {
  handleCheckFrom,
  localHandleProblem,
  normalizeHandleInput,
  precheckHandle,
  suggestHandles,
} from './business-handles';
import {
  accountKindOf,
  businessKindProblem,
  businessResumeStep,
  categoryOptions,
  businessSignupErrorMessage,
  businessWizardCopy,
  kycBannerCopy,
  needsLegalKind,
} from './business-onboarding';
import { businessSignupFailures } from './business-signup-failures';

describe('handle rules (mirror of the backend format)', () => {
  it('normalizes like the server: trim, no @, lower case', () => {
    expect(normalizeHandleInput('  @Top.Fitness ')).toBe('top.fitness');
  });

  it.each([
    ['ab', 'TOO_SHORT'],
    ['a'.repeat(31), 'TOO_LONG'],
    ['café', 'CHARACTERS'],
    ['top-fit', 'CHARACTERS'],
    ['.topfit', 'SEPARATORS'],
    ['top..fit', 'SEPARATORS'],
    ['topfit_', 'SEPARATORS'],
    ['12345', 'ONLY_DIGITS'],
    ['1.2_3', 'ONLY_DIGITS'],
  ])('%s → %s', (handle, problem) => {
    expect(localHandleProblem(handle)).toBe(problem);
  });

  it('leaves valid handles to the server', () => {
    expect(localHandleProblem('top.fitness_bo')).toBeNull();
    expect(precheckHandle('@Top.Fit')).toEqual({ state: 'remote', handle: 'top.fit' });
    expect(precheckHandle('   ')).toEqual({ state: 'idle' });
    expect(precheckHandle('ab').state).toBe('invalid');
  });

  it('words the server answer', () => {
    expect(handleCheckFrom({ handle: 'topfit', available: true, reason: null })).toEqual({ state: 'available', handle: 'topfit' });
    const taken = handleCheckFrom({ handle: 'topfit', available: false, reason: 'TAKEN' });
    expect(taken).toMatchObject({ state: 'unavailable', reason: 'TAKEN', message: 'Ese nombre ya está en uso.' });
    expect(handleCheckFrom({ handle: null, available: false, reason: null })).toMatchObject({ reason: 'INVALID' });
  });

  it('suggests valid handles from the business name', () => {
    expect(suggestHandles('Top Fitness', 'GYM', 'Santa Cruz')).toEqual([
      'topfitness',
      'top.fitness',
      'topfitness.gym',
      'topfitness.santacruz',
    ]);
    expect(suggestHandles('Ñandú Spa & Café', 'CENTER')).toEqual(['nanduspacafe', 'nandu.spa.cafe', 'nanduspacafe.centro']);
    expect(suggestHandles('¡¡!!')).toEqual([]);
    for (const handle of suggestHandles('Un nombre comercial muy largo para un gimnasio de barrio', 'GYM')) {
      expect(localHandleProblem(handle)).toBeNull();
    }
  });
});

describe('business wizard', () => {
  it('resumes at the email PIN, then at «Tu negocio», then is done', () => {
    expect(businessResumeStep(['VERIFY_EMAIL', 'CHOOSE_HANDLE', 'COMPLETE_PROFILE', 'SUBMIT_KYC'])).toBe(2);
    expect(businessResumeStep(['CHOOSE_HANDLE', 'SUBMIT_KYC'])).toBe(3);
    expect(businessResumeStep(['COMPLETE_PROFILE'])).toBe(3);
    expect(businessResumeStep(['SUBMIT_KYC'])).toBeNull();
    expect(businessResumeStep([])).toBeNull();
  });

  it('counts eight steps: the account (0–3) and the KYC (4–7)', () => {
    expect(businessWizardCopy.progress(0)).toBe('Paso 1 de 8');
    expect(businessWizardCopy.progress(3)).toBe('Paso 4 de 8');
    expect(businessWizardCopy.progress(7)).toBe('Paso 8 de 8');
    expect(businessWizardCopy.steps).toHaveLength(8);
  });

  it('lets step 0 go only with a type, and a legal kind for a service provider', () => {
    expect(businessKindProblem(null, null)).toMatch(/Elige una opción/u);
    expect(businessKindProblem('SERVICE_PROVIDER', null)).toBe('Indica si eres empresa o persona.');
    expect(businessKindProblem('SERVICE_PROVIDER', 'INDIVIDUAL')).toBeNull();
    expect(businessKindProblem('COACH', null)).toBeNull();
  });

  it('asks the legal kind only of a service provider', () => {
    expect(needsLegalKind('SERVICE_PROVIDER')).toBe(true);
    expect(needsLegalKind('GYM')).toBe(false);
    expect(needsLegalKind(null)).toBe(false);
  });

  it('words the signup refusals and leaves the rest to the generic message', () => {
    expect(businessSignupErrorMessage('EMAIL_ALREADY_REGISTERED')).toMatch(/Ya hay una cuenta/u);
    expect(businessSignupErrorMessage('BUSINESS_SIGNUP_DISABLED')).toMatch(/todavía no está abierta/u);
    expect(businessSignupErrorMessage(undefined)).toBeNull();
  });

  it('shows the draft banner, now with a way to continue', () => {
    expect(kycBannerCopy('DRAFT')).toBe('Tu negocio está en borrador · completa la verificación');
  });
});

describe('accountKindOf', () => {
  it('trusts the server and falls back to the role', () => {
    expect(accountKindOf({ role: 'CLIENTE', accountKind: 'BUSINESS' })).toBe('BUSINESS');
    expect(accountKindOf({ role: 'NEGOCIO' })).toBe('BUSINESS');
    expect(accountKindOf({ role: 'SYSTEM_ADMIN' })).toBe('PERSON');
  });
});

describe('categoryOptions', () => {
  it('flattens the tree with its trail', () => {
    const leaf = { id: 'b', slug: 'b', name: 'Gimnasio', description: null, iconKey: null, path: 'a.b', entityScope: 'GYM', children: [] };
    const tree = [{ ...leaf, id: 'a', name: 'Fitness', path: 'a', children: [leaf] }];
    expect(categoryOptions(tree)).toEqual([
      { id: 'a', label: 'Fitness' },
      { id: 'b', label: 'Fitness · Gimnasio' },
    ]);
  });
});

describe('businessSignupFailures', () => {
  it('puts a taken email next to the field', () => {
    expect(businessSignupFailures({ code: 'EMAIL_ALREADY_REGISTERED', kind: 'conflict' })).toEqual([
      { field: 'email', message: 'Ya hay una cuenta con este correo. Inicia sesión o usa otro.' },
    ]);
  });

  it('keeps SIGNUP_REJECTED generic and above the button', () => {
    expect(businessSignupFailures({ code: 'SIGNUP_REJECTED', kind: 'validation' })).toEqual([
      { field: 'root', message: 'No pudimos crear tu cuenta. Inténtalo de nuevo.' },
    ]);
  });

  it('points the per-field messages of a 400 at their fields', () => {
    const failures = businessSignupFailures({ kind: 'validation', fieldErrors: { password: 'Muy corta', other: 'x' } });
    expect(failures).toEqual([{ field: 'password', message: 'Muy corta' }]);
  });

  it('never shows the message of a non-API failure', () => {
    const [failure] = businessSignupFailures(new TypeError('Failed to fetch'));
    expect(failure?.field).toBe('root');
    expect(failure?.message).not.toContain('Failed to fetch');
  });
});
