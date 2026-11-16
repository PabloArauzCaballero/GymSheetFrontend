/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { MIN_PROFILE_AGE, ageOn, birthDateError } from './birth-date.ts';

/** Born on 1 January, `age` years ago: exactly `age` all year long. */
const bornJanuaryFirst = (age: number) => ['01', '01', String(new Date().getFullYear() - age)] as const;

test('the whole app is 18+', () => {
  assert.equal(MIN_PROFILE_AGE, 18);
});

test('rejects anyone under 18 and accepts 18', () => {
  const [dia, mes, anio] = bornJanuaryFirst(17);
  assert.equal(birthDateError(dia, mes, anio), 'Debes tener 18 años o más.');
  const [d18, m18, a18] = bornJanuaryFirst(18);
  assert.equal(ageOn(Number(a18), Number(m18), Number(d18)), 18);
  assert.equal(birthDateError(d18, m18, a18), null);
});

test('the field stays optional and still rejects impossible dates', () => {
  assert.equal(birthDateError('', '', ''), null);
  assert.equal(birthDateError('31', '02', '1996'), 'Esa fecha no existe.');
  assert.equal(birthDateError('15', '03', '1896'), 'Debes tener entre 18 y 100 años.');
});
