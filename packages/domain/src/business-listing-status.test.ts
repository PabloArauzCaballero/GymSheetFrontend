import { describe, expect, it } from 'vitest';
import { listingActions, listingChip, listingErrorMessage, listingLockText } from './business-listing-status';

describe('listingChip (driven by visibility)', () => {
  it('names each state for the seller', () => {
    expect(listingChip({ visibility: 'PUBLIC' }).label).toBe('Publicada');
    expect(listingChip({ visibility: 'BUSINESS_NOT_PUBLIC' }).label).toBe('Tu negocio aún no es público');
    expect(listingChip({ visibility: 'PAUSED' }).label).toBe('Pausada');
    expect(listingChip({ visibility: 'UNDER_REVIEW' }).tone).toBe('warning');
  });
  it('explains what the automatic checks found, never the raw code', () => {
    const chip = listingChip({ visibility: 'UNDER_REVIEW', autoCheckCodes: ['PRICE_OUT_OF_BAND'] });
    expect(chip.detail).toContain('rango permitido');
    expect(chip.detail).not.toContain('PRICE_OUT_OF_BAND');
  });
  it('gives REPP reason when it hid or rejected the listing', () => {
    expect(listingChip({ visibility: 'HIDDEN_BY_REPP', moderationReasonCode: null }).label).toBe('Oculta por REPP');
    expect(listingChip({ visibility: 'REJECTED_BY_REPP', moderationReasonCode: 'MISLEADING' }).detail).toBe('Información engañosa');
    expect(listingChip({ visibility: 'HIDDEN_BY_REPP', moderationReasonCode: 'UNKNOWN_CODE' }).detail).toContain('denuncia');
  });
});

describe('listingActions', () => {
  it('mirrors the backend transitions', () => {
    expect(listingActions('ACTIVE')).toEqual({ pause: true, resume: false, archive: true, edit: true });
    expect(listingActions('INACTIVE')).toEqual({ pause: false, resume: true, archive: true, edit: true });
    expect(listingActions('ARCHIVED')).toEqual({ pause: false, resume: false, archive: false, edit: false });
  });
  it('translates known error codes and keeps the server text otherwise', () => {
    expect(listingErrorMessage('LISTING_SAME_PRICE', 'x')).toContain('Ese ya es el precio');
    expect(listingErrorMessage('SOMETHING', 'Texto del servidor')).toBe('Texto del servidor');
  });
});

describe('content locked by REPP (409 LISTING_LOCKED_BY_REPP)', () => {
  it('locks hidden and rejected listings only', () => {
    expect(listingLockText('HIDDEN_BY_REPP')).toContain('mientras lo revisa');
    expect(listingLockText('REJECTED_BY_REPP')).toContain('rechazó');
    expect(listingLockText('PUBLIC')).toBeNull();
    expect(listingLockText('UNDER_REVIEW')).toBeNull();
  });
  it('words the 409 by the moderation status it carries', () => {
    expect(listingErrorMessage('LISTING_LOCKED_BY_REPP', 'x', { moderationStatus: 'REJECTED' })).toContain('rechazó');
    expect(listingErrorMessage('LISTING_LOCKED_BY_REPP', 'x', { moderationStatus: 'HIDDEN' })).toContain('ocultó');
    expect(listingErrorMessage('LISTING_CHANGED_SINCE_REVIEW', 'x')).toContain('Revísala de nuevo');
  });
});
