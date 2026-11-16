import { describe, expect, it } from 'vitest';
import { registerDefaults, registerPayloadSchema, toRegisterPayload } from '@gymsheet/schemas';

const valid = {
  ...registerDefaults,
  nombreCompleto: '  Ana Pérez ',
  email: '  Ana.Perez@Example.COM ',
  password: 'segura-123',
  confirmation: 'segura-123',
  acceptedTerms: true,
};

describe('registerPayloadSchema', () => {
  it('trims and lowercases an email typed with spaces and uppercase', () => {
    const parsed = registerPayloadSchema.parse({
      email: '  Ana.Perez@Example.COM ',
      password: 'segura-123',
      nombreCompleto: 'Ana Pérez',
      acceptedTerms: true,
    });
    expect(parsed.email).toBe('ana.perez@example.com');
  });

  it('accepts exactly what toRegisterPayload produces, unchanged', () => {
    const payload = toRegisterPayload(valid);
    expect(payload).toEqual({
      nombreCompleto: 'Ana Pérez',
      email: 'ana.perez@example.com',
      password: 'segura-123',
      acceptedTerms: true,
    });
    expect(registerPayloadSchema.parse(payload)).toEqual(payload);
    expect(registerPayloadSchema.parse(toRegisterPayload({ ...valid, genero: 'FEMALE' }))).toMatchObject({
      genero: 'FEMALE',
    });
  });

  it('rejects anything but the literal true for acceptedTerms', () => {
    const base = { email: 'ana@example.com', password: 'segura-123', nombreCompleto: 'Ana Pérez' };
    expect(registerPayloadSchema.safeParse({ ...base, acceptedTerms: false }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...base, acceptedTerms: 'true' }).success).toBe(false);
    expect(registerPayloadSchema.safeParse(base).success).toBe(false);
  });

  it('rejects the form-only empty gender and an invalid email', () => {
    const base = { password: 'segura-123', nombreCompleto: 'Ana Pérez', acceptedTerms: true };
    expect(registerPayloadSchema.safeParse({ ...base, email: 'ana@example.com', genero: '' }).success).toBe(false);
    expect(registerPayloadSchema.safeParse({ ...base, email: '  not an email ' }).success).toBe(false);
  });
});
