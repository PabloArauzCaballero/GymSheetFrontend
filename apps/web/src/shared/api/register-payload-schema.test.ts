import { describe, expect, it } from 'vitest';
import { registerDefaults, registerPayloadSchema, registerSchema, toRegisterPayload } from '@gymsheet/schemas';

const valid = {
  ...registerDefaults,
  nombreCompleto: '  Ana Pérez ',
  email: '  Ana.Perez@Example.COM ',
  password: 'segura-123',
  confirmation: 'segura-123',
  fechaNacimiento: '1996-03-15',
  genero: 'FEMALE' as const,
  acceptedTerms: true,
};

/** A payload that satisfies every required field of the current contract. */
const base = {
  email: 'ana@example.com',
  password: 'segura-123',
  nombreCompleto: 'Ana Pérez',
  fechaNacimiento: '1996-03-15',
  genero: 'FEMALE',
  termsVersion: '2026-08-25',
};

describe('registerPayloadSchema', () => {
  it('trims and lowercases an email typed with spaces and uppercase', () => {
    const parsed = registerPayloadSchema.parse({
      ...base,
      email: '  Ana.Perez@Example.COM ',
      acceptedTerms: true,
    });
    expect(parsed.email).toBe('ana.perez@example.com');
  });

  it('accepts exactly what toRegisterPayload produces, unchanged', () => {
    const payload = toRegisterPayload(valid, '2026-08-25');
    expect(payload).toEqual({
      nombreCompleto: 'Ana Pérez',
      email: 'ana.perez@example.com',
      password: 'segura-123',
      fechaNacimiento: '1996-03-15',
      genero: 'FEMALE',
      termsVersion: '2026-08-25',
      acceptedTerms: true,
    });
    expect(registerPayloadSchema.parse(payload)).toEqual(payload);
  });

  it('rejects anything but the literal true for acceptedTerms', () => {
    expect(registerPayloadSchema.safeParse({ ...base, acceptedTerms: false }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...base, acceptedTerms: 'true' }).success).toBe(false);
    expect(registerPayloadSchema.safeParse(base).success).toBe(false);
  });

  it('rejects the form-only empty gender and an invalid email', () => {
    const accepted = { ...base, acceptedTerms: true };
    expect(registerPayloadSchema.safeParse({ ...accepted, genero: '' }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...accepted, email: '  not an email ' }).success).toBe(false);
  });

  it('requires the terms version and a real YYYY-MM-DD birth date', () => {
    const accepted = { ...base, acceptedTerms: true };
    const withoutVersion = Object.fromEntries(Object.entries(accepted).filter(([key]) => key !== 'termsVersion'));
    expect(registerPayloadSchema.safeParse(withoutVersion).success).toBe(false);
    for (const fechaNacimiento of ['', '2000-02-30', '15/03/1996', '1996-3-15']) {
      expect(registerPayloadSchema.safeParse({ ...accepted, fechaNacimiento }).success).toBe(false);
    }
  });

  it('does not judge the age: the backend is the single authority (other clock, other time zone)', () => {
    const seventeen = new Date();
    seventeen.setFullYear(seventeen.getFullYear() - 17);
    const minor = seventeen.toISOString().slice(0, 10);
    expect(registerPayloadSchema.safeParse({ ...base, acceptedTerms: true, fechaNacimiento: minor }).success).toBe(true);
  });

  it('keeps the 18+ check on the form, in the local calendar of the person', () => {
    const tomorrow18 = new Date();
    tomorrow18.setFullYear(tomorrow18.getFullYear() - 18);
    tomorrow18.setDate(tomorrow18.getDate() + 1);
    const pad = (value: number) => String(value).padStart(2, '0');
    const fechaNacimiento = `${tomorrow18.getFullYear()}-${pad(tomorrow18.getMonth() + 1)}-${pad(tomorrow18.getDate())}`;
    const result = registerSchema.safeParse({ ...valid, fechaNacimiento });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toContain('Debes tener al menos 18 años.');
  });
});
