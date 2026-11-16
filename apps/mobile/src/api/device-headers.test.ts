/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDeviceHeaders, generateInstallationId, isInstallationId } from './device-headers.ts';

const ID = '3f1c2a4b-5d6e-4f70-8a9b-0c1d2e3f4a5b';

test('envía las cuatro cabeceras cuando todo es válido', () => {
  assert.deepEqual(
    buildDeviceHeaders({ installationId: ID, appVersion: '1.4.0', osVersion: '17.4', deviceModel: 'iPhone 15 Pro' }),
    {
      'X-Installation-Id': ID,
      'X-App-Version': '1.4.0',
      'X-OS-Version': '17.4',
      'X-Device-Model': 'iPhone 15 Pro',
    },
  );
});

test('omite lo vacío, lo demasiado largo y lo que no es una etiqueta', () => {
  assert.deepEqual(
    buildDeviceHeaders({
      installationId: 'not-a-uuid',
      appVersion: '   ',
      osVersion: 'x'.repeat(41),
      deviceModel: 'Pixel <script>',
    }),
    {},
  );
});

test('descarta caracteres fuera de ASCII en vez de arriesgar la petición', () => {
  assert.deepEqual(buildDeviceHeaders({ installationId: null, appVersion: null, osVersion: null, deviceModel: 'Galaxy™ S24' }), {});
});

test('recorta espacios y acepta el límite exacto', () => {
  const model = 'M'.repeat(80);
  assert.equal(buildDeviceHeaders({ installationId: null, appVersion: ' 2.0 ', osVersion: null, deviceModel: model })['X-App-Version'], '2.0');
  assert.equal(buildDeviceHeaders({ installationId: null, appVersion: null, osVersion: null, deviceModel: model })['X-Device-Model'], model);
});

test('usa randomUUID cuando el entorno lo ofrece', () => {
  assert.equal(generateInstallationId({ randomUUID: () => ID.toUpperCase() }), ID);
});

test('cae al generador nativo de Expo si no hay Web Crypto', () => {
  assert.equal(generateInstallationId({ nativeUuidv4: () => ID }), ID);
});

test('arma un v4 válido con getRandomValues', () => {
  const id = generateInstallationId({ getRandomValues: (bytes) => bytes.fill(0xff) });
  assert.equal(id, 'ffffffff-ffff-4fff-bfff-ffffffffffff');
  assert.ok(isInstallationId(id));
});

test('ignora una fuente que falla o devuelve basura y sigue con la siguiente', () => {
  const id = generateInstallationId({
    randomUUID: () => {
      throw new Error('no crypto');
    },
    nativeUuidv4: () => 'nope',
    getRandomValues: (bytes) => bytes.fill(0),
  });
  assert.equal(id, '00000000-0000-4000-8000-000000000000');
});

test('sin ninguna fuente sigue devolviendo un v4 con forma correcta', () => {
  const ids = new Set(Array.from({ length: 50 }, () => generateInstallationId({})));
  assert.equal(ids.size, 50);
  for (const id of ids) assert.ok(isInstallationId(id));
});
