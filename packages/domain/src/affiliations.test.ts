import { describe, expect, it } from 'vitest';
import type { Affiliation } from '@gymsheet/schemas';
import {
  affiliationChip,
  ciDigitsError,
  ciDigitsOf,
  ciEndingText,
  gymAffiliationName,
  gymBadgeLabel,
  gymHandleOf,
  isSwitchGymConflict,
  joinGymErrors,
  joinGymFormOf,
  joinGymPayload,
  liveAffiliationsWith,
  ownAffiliationAction,
} from './affiliations';
import { affiliationErrorMessage, affiliationNoteError, affiliationReasonText } from './affiliations-copy';

const GYM = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const SEDE = '0190e2cb-a6d4-7ec3-8f91-a6c735631502';
const AFF = '0190e2cb-a6d4-7ec3-8f91-a6c735631503';
const gym = { id: GYM, name: 'Top Fitness', handle: 'topfitness', logoUrl: null };

function affiliation(patch: Partial<Affiliation>): Affiliation {
  return {
    id: AFF,
    kind: 'SOCIO',
    status: 'REQUESTED',
    gym,
    location: { id: SEDE, name: 'Centro' },
    ciLast3: '123',
    replacesAffiliationId: null,
    reasonCode: null,
    reasonNote: null,
    requestedAt: '2026-11-17T10:00:00.000Z',
    confirmedAt: null,
    closedAt: null,
    ...patch,
  };
}

describe('CI digits', () => {
  it('keeps only three digits, whatever was pasted', () => {
    expect(ciDigitsOf('12-34')).toBe('123');
    expect(ciDigitsOf(' a9 ')).toBe('9');
  });
  it('asks for exactly three digits', () => {
    expect(ciDigitsError('12')).toBe('Escribe los últimos 3 dígitos de tu CI.');
    expect(ciDigitsError('123')).toBeNull();
  });
});

describe('«Hacerme socio» form', () => {
  const locations = [{ id: SEDE }];
  it('preselects a single sede and requires one for a SOCIO', () => {
    expect(joinGymFormOf(locations).locationId).toBe(SEDE);
    expect(joinGymErrors({ kind: 'SOCIO', locationId: '', ciLast3: '123' }, [{ id: SEDE }, { id: GYM }]).locationId).toBe('Elige la sede donde entrenas.');
    expect(joinGymErrors({ kind: 'SOCIO', locationId: '', ciLast3: '123' }, []).locationId).toBe('Este gimnasio todavía no publicó sus sedes.');
  });
  it('lets a coach go without a sede but still asks for the digits', () => {
    expect(joinGymErrors({ kind: 'ENTRENADOR', locationId: '', ciLast3: '1' }, locations)).toEqual({ ciLast3: 'Escribe los últimos 3 dígitos de tu CI.' });
  });
  it('builds the strict body by handle, and the switch only when asked', () => {
    const form = { kind: 'SOCIO' as const, locationId: SEDE, ciLast3: '123' };
    expect(joinGymPayload(form, { handle: 'topfitness', entityId: GYM })).toEqual({ gymHandle: 'topfitness', kind: 'SOCIO', locationId: SEDE, ciLast3: '123' });
    expect(joinGymPayload({ ...form, kind: 'ENTRENADOR', locationId: '' }, { handle: null, entityId: GYM }, true)).toEqual({
      gymEntityId: GYM,
      kind: 'ENTRENADOR',
      ciLast3: '123',
      switchGym: true,
    });
  });
  it('recognizes the gym switch conflict only with its action', () => {
    expect(isSwitchGymConflict({ code: 'SOCIO_OF_ANOTHER_GYM', details: { affiliationId: AFF, action: 'SWITCH_GYM' } })).toBe(true);
    expect(isSwitchGymConflict({ code: 'SOCIO_OF_ANOTHER_GYM', details: {} })).toBe(false);
    expect(isSwitchGymConflict({ code: 'AFFILIATION_SOCIO_PENDING' })).toBe(false);
  });
});

describe('own affiliations', () => {
  it('finds the live rows with one gym and the action each allows', () => {
    const rows = [affiliation({}), affiliation({ id: SEDE, status: 'REJECTED' }), affiliation({ id: GYM, gym: { ...gym, id: SEDE } })];
    expect(liveAffiliationsWith(rows, GYM).map((row) => row.id)).toEqual([AFF]);
    expect(ownAffiliationAction({ status: 'REQUESTED' })).toBe('cancel');
    expect(ownAffiliationAction({ status: 'CONFIRMED' })).toBe('end');
    expect(ownAffiliationAction({ status: 'ENDED' })).toBeNull();
  });
  it('says each state in a chip and why a row closed', () => {
    expect(affiliationChip({ kind: 'SOCIO', status: 'REQUESTED' })).toEqual({ label: 'Solicitud enviada', tone: 'info' });
    expect(affiliationChip({ kind: 'ENTRENADOR', status: 'CONFIRMED' }).label).toBe('Entrenador');
    expect(affiliationChip({ kind: 'SOCIO', status: 'ENDED', reasonCode: 'SWITCHED_GYM' }).label).toBe('Te cambiaste de gimnasio');
    expect(affiliationReasonText('CI_MISMATCH')).toBe('Los dígitos del CI no coinciden con los del gimnasio.');
    expect(affiliationReasonText('OTHER', 'No pagó')).toBe('«No pagó»');
    expect(affiliationReasonText(null)).toBeNull();
  });
});

describe('the gym side', () => {
  it('shows «CI termina en …» only for a live person', () => {
    expect(ciEndingText({ type: 'PERSON', displayName: 'Ana', photoUrl: null, ciLast3: '123' })).toBe('CI termina en 123');
    expect(ciEndingText({ type: 'BUSINESS', name: 'Coach', handle: 'c', logoUrl: null, badge: 'NEW' })).toBeNull();
    expect(ciEndingText(null)).toBeNull();
    expect(gymAffiliationName({ subject: null })).toBe('Afiliación cerrada');
  });
  it('requires a note with «Otro motivo»', () => {
    expect(affiliationNoteError(null, '')).toBe('Elige un motivo.');
    expect(affiliationNoteError('OTHER', ' ')).toBe('Explica el motivo para que la persona sepa qué pasó.');
    expect(affiliationNoteError('CI_MISMATCH', '')).toBeNull();
    expect(affiliationNoteError('CONDUCT', 'ab')).toBe('Escribe al menos 3 letras.');
  });
  it('says the backend errors in Spanish', () => {
    expect(affiliationErrorMessage('AFFILIATION_LIMIT', 'x', { max: 10 })).toBe('Tienes 10 solicitudes esperando. Espera respuesta o cancela alguna.');
    expect(affiliationErrorMessage('AFFILIATION_COOLDOWN', 'x', { retryAfter: 'nope' })).toBe('Todavía no puedes volver a pedirlo a este gimnasio.');
    expect(affiliationErrorMessage('GYM_NOT_ACTIVE', 'x')).toBe('Publica tu gimnasio para ver y decidir solicitudes.');
    expect(affiliationErrorMessage(undefined, 'Algo', null, 404)).toBe('No encontramos ese gimnasio, o todavía no está publicado.');
    expect(affiliationErrorMessage('FUTURE', 'Del servidor')).toBe('Del servidor');
  });
  it('strips the @ of a typed handle and labels the badge', () => {
    expect(gymHandleOf('  @@TopFitness ')).toBe('TopFitness');
    expect(gymBadgeLabel(gym)).toBe('Socio de Top Fitness');
    expect(gymBadgeLabel(null)).toBeNull();
  });
});
