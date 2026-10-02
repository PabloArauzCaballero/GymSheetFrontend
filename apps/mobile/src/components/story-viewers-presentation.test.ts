/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { storyViewersPresentation } from './story-viewers-presentation.ts';

test('shows the viewer count as the primary compact control, like a story viewer', () => {
  assert.deepEqual(storyViewersPresentation(27), {
    controlLabel: '27',
    accessibilityLabel: 'Ver las 27 personas que vieron tu story',
    detailLabel: '27 personas vieron esta story',
    isOpenable: true,
  });
});

test('uses singular language for one viewer', () => {
  assert.deepEqual(storyViewersPresentation(1), {
    controlLabel: '1',
    accessibilityLabel: 'Ver la persona que vio tu story',
    detailLabel: '1 persona vio esta story',
    isOpenable: true,
  });
});

test('formats large viewer counts for the Spanish-speaking audience', () => {
  assert.equal(storyViewersPresentation(1250).controlLabel, '1.250');
});

test('does not let an unknown or empty count open an empty sheet', () => {
  assert.deepEqual(storyViewersPresentation(null), {
    controlLabel: 'Vistas',
    accessibilityLabel: 'Cargando las vistas de tu story',
    detailLabel: 'Cargando vistas…',
    isOpenable: false,
  });
  assert.deepEqual(storyViewersPresentation(0), {
    controlLabel: '0',
    accessibilityLabel: 'Tu story todavía no tiene vistas',
    detailLabel: 'Todavía nadie vio esta story',
    isOpenable: false,
  });
});
