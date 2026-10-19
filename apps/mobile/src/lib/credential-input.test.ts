/// <reference types="node" />
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { accountEmailTextProps, credentialTextProps } from './credential-input.ts';

const read = (path: string) => readFile(decodeURIComponent(new URL(path, import.meta.url).pathname), 'utf8');

test('las credenciales no se capitalizan ni se autocorrigen', () => {
  assert.equal(credentialTextProps.autoCapitalize, 'none');
  assert.equal(credentialTextProps.autoCorrect, false);
  assert.equal(credentialTextProps.spellCheck, false);
});

test('el correo se declara como usuario para el Llavero de iOS', () => {
  assert.equal(accountEmailTextProps.textContentType, 'username');
  assert.equal(accountEmailTextProps.autoComplete, 'email');
  assert.equal(accountEmailTextProps.autoCapitalize, 'none');
  assert.equal(accountEmailTextProps.autoCorrect, false);
});

test('el campo con ojo aplica las props de credencial después de las del llamador', async () => {
  const ui = await read('../components/ui.tsx');
  const spread = ui.indexOf('{...props}', ui.indexOf('export function Input('));
  const secure = ui.indexOf('secureTextEntry: !revealed, ...credentialTextProps', spread);
  assert.ok(spread > 0 && secure > spread, 'credentialTextProps debe ir tras {...props} en la rama revealable');
});

for (const screen of ['login', 'register', 'recover-password']) {
  test(`${screen}: el correo usa accountEmailTextProps`, async () => {
    const source = await read(`../../app/(auth)/${screen}.tsx`);
    assert.ok(source.includes('{...accountEmailTextProps}'));
    assert.ok(!source.includes('textContentType="emailAddress"'));
  });
}
