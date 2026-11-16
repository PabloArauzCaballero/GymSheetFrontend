/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { registerSchema, toRegisterPayload, registerDefaults } from '@gymsheet/schemas';
import { birthDateFromParts } from './signup-logic.ts';

function partsYearsAgo(years: number, extraDays = 0) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setDate(date.getDate() + extraDays);
  return { dia: String(date.getDate()), mes: String(date.getMonth() + 1), anio: String(date.getFullYear()) };
}

const filled = {
  ...registerDefaults,
  nombreCompleto: 'Ana Pérez',
  email: 'ana@example.com',
  password: 'segura-123',
  confirmation: 'segura-123',
  acceptedTerms: true,
};

function errorsOf(values: typeof filled) {
  const result = registerSchema.safeParse(values);
  return result.success ? {} : result.error.flatten().fieldErrors;
}

test('an untouched birth date stays empty, a typed one becomes YYYY-MM-DD', () => {
  assert.equal(birthDateFromParts({ dia: '', mes: '', anio: '' }), '');
  assert.equal(birthDateFromParts({ dia: '5', mes: '3', anio: '1996' }), '1996-03-05');
});

test('sex and birth date are required at signup', () => {
  const errors = errorsOf(filled);
  assert.deepEqual(errors.genero, ['Elige tu sexo.']);
  // The form shows the first message of a field.
  assert.equal(errors.fechaNacimiento?.[0], 'Indica tu fecha de nacimiento.');
});

test('a 17-year-old is rejected, an 18-year-old is not', () => {
  const minor = errorsOf({ ...filled, genero: 'MALE', fechaNacimiento: birthDateFromParts(partsYearsAgo(18, 1)) });
  assert.deepEqual(minor.fechaNacimiento, ['Debes tener al menos 18 años.']);
  const adult = errorsOf({ ...filled, genero: 'MALE', fechaNacimiento: birthDateFromParts(partsYearsAgo(18)) });
  assert.equal(adult.fechaNacimiento, undefined);
});

test('a half-typed date is not a date', () => {
  const errors = errorsOf({ ...filled, genero: 'MALE', fechaNacimiento: birthDateFromParts({ dia: '31', mes: '02', anio: '1996' }) });
  assert.deepEqual(errors.fechaNacimiento, ['Indica una fecha válida.']);
});

test('the payload carries the terms version the person saw', () => {
  const payload = toRegisterPayload({ ...filled, genero: 'FEMALE', fechaNacimiento: '1996-03-15' }, '2026-08-25');
  assert.deepEqual(payload, {
    nombreCompleto: 'Ana Pérez',
    email: 'ana@example.com',
    password: 'segura-123',
    fechaNacimiento: '1996-03-15',
    genero: 'FEMALE',
    termsVersion: '2026-08-25',
    acceptedTerms: true,
  });
});
