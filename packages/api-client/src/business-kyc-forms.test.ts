import { describe, expect, it } from 'vitest';
import {
  companyDraftPatch,
  kycCodeFormSchema,
  kycCompanyFormSchema,
  kycDraftPatchSchema,
  kycPersonFormSchema,
  kycPhoneFormSchema,
  kycRepresentativeFormSchema,
  normalizeBolivianMobile,
  representativeDraftPatch,
} from '@gymsheet/schemas';

describe('KYC form schemas (same shape rules as the backend)', () => {
  it('normalizes a Bolivian mobile with or without +591', () => {
    expect(normalizeBolivianMobile('7123 4567')).toBe('+59171234567');
    expect(normalizeBolivianMobile('+591 6-123-4567')).toBe('+59161234567');
    expect(normalizeBolivianMobile('31234567')).toBeNull();
    expect(kycPhoneFormSchema.safeParse({ phone: '712345' }).success).toBe(false);
    expect(kycCodeFormSchema.safeParse({ code: '12345a' }).success).toBe(false);
  });

  it('asks the NIT only until one is saved, and only digits', () => {
    const base = { legalName: 'Top Fitness SRL', nit: '', address: 'Av. Busch 123', seprecNumber: '' };
    expect(kycCompanyFormSchema(false).safeParse(base).success).toBe(false);
    expect(kycCompanyFormSchema(true).safeParse(base).success).toBe(true);
    expect(kycCompanyFormSchema(false).safeParse({ ...base, nit: '1029-384.567' }).data?.nit).toBe('1029384567');
    expect(kycCompanyFormSchema(false).safeParse({ ...base, nit: '12AB' }).success).toBe(false);
  });

  it('validates the CI number, complement and department together', () => {
    const base = { repFullName: 'Ana Rojas', repCiNumber: '7654321', repCiComplement: '1a', repCiExtension: 'SC' };
    const parsed = kycRepresentativeFormSchema(false).parse(base);
    expect(parsed.repCiComplement).toBe('1A');
    expect(kycRepresentativeFormSchema(false).safeParse({ ...base, repCiNumber: '123' }).success).toBe(false);
    expect(kycRepresentativeFormSchema(false).safeParse({ ...base, repCiComplement: 'ABC' }).success).toBe(false);
    expect(kycPersonFormSchema(true).safeParse({ ...base, repCiNumber: '', specialty: '' }).success).toBe(false);
  });

  it('builds a draft patch the backend accepts, without overwriting a saved secret', () => {
    const company = companyDraftPatch({ legalName: 'Top SRL', nit: '', address: 'Av. 1 123', seprecNumber: '' });
    expect(company).toEqual({ legalName: 'Top SRL', address: 'Av. 1 123', seprecNumber: null });
    const person = representativeDraftPatch({ repFullName: 'Ana', repCiNumber: '7654321', repCiComplement: '', repCiExtension: '', specialty: 'Yoga' });
    expect(person).toEqual({ repFullName: 'Ana', repCiComplement: null, repCiExtension: null, repCiNumber: '7654321', specialty: 'Yoga' });
    expect(kycDraftPatchSchema.safeParse(person).success).toBe(true);
    expect(kycDraftPatchSchema.safeParse({ ...person, tenantId: 'x' }).success).toBe(false);
  });
});
