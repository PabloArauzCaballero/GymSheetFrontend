import { describe, expect, it } from 'vitest';
import {
  accountBanCopy,
  accountBanOf,
  accountSanctionMessage,
  accountSuspensionCopy,
  accountSuspensionOf,
  sanctionReasonSentence,
} from './account-sanction';
import { identityErrorMessage } from './account-security';
import { legalContacts } from './legal';
import { sanctionReasonFromCode } from './sanction-reasons';
import { noticeActionLabel, noticeDestination } from './account-notices';

const acoso = { code: 'ACOSO', label: 'Acoso', text: 'mensajes o contenido que hostigan o intimidan a otra persona' };
const minor = { code: 'MENOR_DE_EDAD', label: 'Menor de edad', text: 'la cuenta parece ser de una persona menor de 18 años' };
const acosoSentence = 'Motivo: Acoso (mensajes o contenido que hostigan o intimidan a otra persona).';
const rights =
  'Mientras dure, no puedes usar la app. Para pedir tus datos, corregirlos, borrarlos o retirar un consentimiento, escribe a {{REPP_CONTACTO_PRIVACIDAD}}.';

describe('account suspension by code', () => {
  it('reads a pending review and a dated suspension with their public reason', () => {
    expect(accountSuspensionOf({ code: 'ACCOUNT_SUSPENDED', details: { pendingReview: true, reason: minor } })).toEqual({
      pendingReview: true,
      until: null,
      reason: minor,
    });
    expect(
      accountSuspensionOf({
        code: 'ACCOUNT_SUSPENDED',
        details: { pendingReview: false, until: '2026-12-01T00:00:00.000Z', reason: acoso },
      }),
    ).toEqual({ pendingReview: false, until: '2026-12-01T00:00:00.000Z', reason: acoso });
  });

  it('keeps the suspension when the reason is missing or malformed', () => {
    expect(accountSuspensionOf({ code: 'ACCOUNT_SUSPENDED', details: { pendingReview: true } })).toEqual({
      pendingReview: true,
      until: null,
      reason: null,
    });
    expect(
      accountSuspensionOf({ code: 'ACCOUNT_SUSPENDED', details: { pendingReview: true, reason: { code: 'ACOSO' } } }),
    ).toEqual({ pendingReview: true, until: null, reason: null });
  });

  it('ignores the wording: a 401 that only says «suspendida» is not a suspension', () => {
    expect(accountSuspensionOf({ code: undefined, message: 'Tu cuenta está suspendida' })).toBeNull();
    expect(accountSuspensionOf({ code: 'UNAUTHORIZED' })).toBeNull();
  });

  it('words each case with the legal texts, never naming year 9999', () => {
    expect(accountSuspensionCopy.message({ pendingReview: true, until: null, reason: minor })).toBe(
      'Tu cuenta está suspendida mientras revisamos una denuncia. Motivo: Menor de edad (la cuenta parece ser de una persona menor de 18 años). Te avisamos por correo cuando terminemos.',
    );
    expect(accountSuspensionCopy.message({ pendingReview: false, until: '2026-12-01T12:00:00.000Z', reason: acoso })).toBe(
      `Tu cuenta está suspendida hasta el 1 de diciembre de 2026. ${acosoSentence}`,
    );
    expect(accountSuspensionCopy.message({ pendingReview: false, until: null, reason: null })).toBe(
      'Tu cuenta está suspendida por incumplir las normas de la comunidad.',
    );
    expect(accountSuspensionCopy.message({ pendingReview: true, until: null, reason: null })).toBe(
      'Tu cuenta está suspendida mientras revisamos una denuncia. Te avisamos por correo cuando terminemos.',
    );
  });

  it('adds the rights line to the notice, naming the privacy contact placeholder once', () => {
    expect(accountSuspensionCopy.rights).toBe(rights);
    expect(legalContacts.privacy).toBe('{{REPP_CONTACTO_PRIVACIDAD}}');
    expect(accountSuspensionCopy.notice({ pendingReview: false, until: null, reason: acoso })).toBe(
      `Tu cuenta está suspendida por incumplir las normas de la comunidad. ${acosoSentence} ${rights}`,
    );
  });
});

describe('account ban by code', () => {
  it('reads ACCOUNT_BANNED and its reason, and nothing else', () => {
    expect(accountBanOf({ code: 'ACCOUNT_BANNED', details: { reason: acoso } })).toEqual({ reason: acoso });
    expect(accountBanOf({ code: 'ACCOUNT_BANNED' })).toEqual({ reason: null });
    expect(accountBanOf({ code: 'ACCOUNT_SUSPENDED', details: { pendingReview: true } })).toBeNull();
  });

  it('words the expulsion with its reason and the privacy contact', () => {
    expect(accountBanCopy.message({ reason: acoso })).toBe(
      `Tu cuenta fue expulsada por incumplir varias veces las normas de la comunidad. ${acosoSentence} Para tus datos, escribe a {{REPP_CONTACTO_PRIVACIDAD}}.`,
    );
  });

  it('builds the reason sentence like the backend reasonSentence', () => {
    expect(sanctionReasonSentence(acoso)).toBe(acosoSentence);
    expect(sanctionReasonSentence(null)).toBeNull();
  });
});

describe('sanction message for login and sign-in', () => {
  it('says the suspension with rights, the ban, or nothing', () => {
    expect(accountSanctionMessage({ code: 'ACCOUNT_SUSPENDED', details: { pendingReview: true, reason: minor } })).toMatch(
      /^Tu cuenta está suspendida mientras revisamos una denuncia\. Motivo: Menor de edad .* escribe a \{\{REPP_CONTACTO_PRIVACIDAD\}\}\.$/u,
    );
    expect(accountSanctionMessage({ code: 'ACCOUNT_BANNED', details: { reason: acoso } })).toBe(accountBanCopy.message({ reason: acoso }));
    expect(accountSanctionMessage({ code: 'UNAUTHORIZED' })).toBeNull();
  });

  it('Google/Apple sign-in says the suspension and the ban too', () => {
    const suspended = { code: 'ACCOUNT_SUSPENDED', status: 403, details: { pendingReview: true, reason: minor } };
    expect(identityErrorMessage('Google', suspended)).toBe(accountSanctionMessage(suspended));
    expect(identityErrorMessage('Apple', { code: 'ACCOUNT_BANNED', status: 403, details: { reason: acoso } })).toBe(
      accountBanCopy.message({ reason: acoso }),
    );
  });
});

describe('sanction reasons by code', () => {
  it('rebuilds only known codes, never echoing an unknown one', () => {
    expect(sanctionReasonFromCode('ACOSO')).toEqual(acoso);
    expect(sanctionReasonFromCode('<script>')).toBeNull();
    expect(sanctionReasonFromCode('toString')).toBeNull();
    expect(sanctionReasonFromCode(null)).toBeNull();
  });
});

describe('notice destinations', () => {
  it('sends both export notices to the export card, and nothing else', () => {
    expect(noticeDestination({ tipo: 'ACCOUNT_EXPORT_READY' })).toBe('account-export');
    expect(noticeDestination({ tipo: 'ACCOUNT_EXPORT_FAILED' })).toBe('account-export');
    expect(noticeDestination({ tipo: 'SANCTION' })).toBeNull();
    expect(noticeDestination({ tipo: null })).toBeNull();
    expect(noticeActionLabel({ tipo: 'ACCOUNT_EXPORT_READY' })).toBe('Ir a descargar mi copia');
    expect(noticeActionLabel({ tipo: null })).toBeNull();
  });
});
