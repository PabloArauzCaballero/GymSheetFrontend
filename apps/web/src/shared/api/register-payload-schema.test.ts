import { describe, expect, it } from 'vitest';
import { registerDefaults, registerPayloadSchema, toRegisterPayload } from '@gymsheet/schemas';

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

  it('requires the terms version and an adult birth date', () => {
    const accepted = { ...base, acceptedTerms: true };
    const withoutVersion = Object.fromEntries(Object.entries(accepted).filter(([key]) => key !== 'termsVersion'));
    expect(registerPayloadSchema.safeParse(withoutVersion).success).toBe(false);
    const seventeen = new Date();
    seventeen.setFullYear(seventeen.getFullYear() - 17);
    const minor = seventeen.toISOString().slice(0, 10);
    expect(registerPayloadSchema.safeParse({ ...accepted, fechaNacimiento: minor }).success).toBe(false);
  });
});
