/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { activeFilterCount, displayName, highlightParts, normalizeSearch, NO_FILTERS, resultCountLabel } from './search-text.ts';

test('normaliza acentos y mayúsculas sin cambiar la longitud', () => {
  assert.equal(normalizeSearch('Bíceps ÉPICO'), 'biceps epico');
  assert.equal(normalizeSearch('Jalón').length, 'Jalón'.length);
});

test('resalta por principio de palabra, sin acentos', () => {
  assert.deepEqual(highlightParts('Curl de bíceps con mancuernas', 'biceps'), [
    { text: 'Curl de ', match: false },
    { text: 'bíceps', match: true },
    { text: ' con mancuernas', match: false },
  ]);
  // «sentad» a medio teclear marca el principio de la palabra.
  assert.deepEqual(highlightParts('Sentadilla con barra', 'sentad barra'), [
    { text: 'Sentad', match: true },
    { text: 'illa con ', match: false },
    { text: 'barra', match: true },
  ]);
});

test('no marca en mitad de una palabra ni con consultas de una letra', () => {
  assert.deepEqual(highlightParts('Press de banca', 'anca'), [{ text: 'Press de banca', match: false }]);
  assert.deepEqual(highlightParts('Press de banca', 'p'), [{ text: 'Press de banca', match: false }]);
});

test('una errata corregida por el servidor deja el nombre sin marcar', () => {
  assert.deepEqual(highlightParts('Sentadilla con barra', 'sentadiya'), [
    { text: 'Sentadilla con barra', match: false },
  ]);
});

test('nombre visible: español si existe, con mayúscula inicial', () => {
  assert.equal(displayName({ nombre: 'barbell squat', nombreEs: 'Sentadilla con barra' }), 'Sentadilla con barra');
  assert.equal(displayName({ nombre: 'barbell squat', nombreEs: null }), 'Barbell squat');
});

test('contadores', () => {
  assert.equal(activeFilterCount(NO_FILTERS), 0);
  assert.equal(activeFilterCount({ ...NO_FILTERS, musculo: 'pecho', conImagen: true }), 2);
  assert.equal(resultCountLabel(0), 'Sin resultados');
  assert.equal(resultCountLabel(1), '1 ejercicio');
  assert.equal(resultCountLabel(1653), '1653 ejercicios'); // el español no agrupa cuatro cifras
});
