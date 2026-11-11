/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { emailTypoSuggestion, passwordChecks } from './signup-hints.ts';

test('sugiere el dominio conocido ante una errata de una o dos letras', () => {
  assert.equal(emailTypoSuggestion('pablo@gmial.com'), 'pablo@gmail.com');
  assert.equal(emailTypoSuggestion('Ana@Hotmial.com '), 'ana@hotmail.com');
  assert.equal(emailTypoSuggestion('leo@outlok.com'), 'leo@outlook.com');
});

test('no sugiere nada con un dominio correcto, ajeno o a medio escribir', () => {
  assert.equal(emailTypoSuggestion('pablo@gmail.com'), null);
  assert.equal(emailTypoSuggestion('pablo@empresa.com.bo'), null);
  assert.equal(emailTypoSuggestion('pablo@gm'), null);
  assert.equal(emailTypoSuggestion('pablo'), null);
  assert.equal(emailTypoSuggestion('@gmial.com'), null);
});

test('las comprobaciones de contraseña siguen al esquema', () => {
  assert.deepEqual(passwordChecks('', ''), { longEnough: false, matches: null });
  assert.deepEqual(passwordChecks('1234567', '1234567'), { longEnough: false, matches: true });
  assert.deepEqual(passwordChecks('12345678', '1234'), { longEnough: true, matches: false });
  assert.deepEqual(passwordChecks('12345678', '12345678'), { longEnough: true, matches: true });
});
