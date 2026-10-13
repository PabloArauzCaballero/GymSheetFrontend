import assert from 'node:assert/strict';
import test from 'node:test';
import { trainingPlaceMapUrl } from './place-maps.ts';

test('abre Maps con el nombre exacto del lugar acordado', () => {
  assert.equal(
    trainingPlaceMapUrl(' Parque Central, La Paz '),
    'https://www.google.com/maps/search/?api=1&query=Parque%20Central%2C%20La%20Paz',
  );
});

test('no abre una búsqueda vacía', () => {
  assert.throws(() => trainingPlaceMapUrl('  '), /no tiene un lugar/u);
});
