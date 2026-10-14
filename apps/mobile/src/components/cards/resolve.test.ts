/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { CARD_ART, ILLUSTRATION_KEYS, cardArtXml } from './art.ts';
import { isVeiled, resolveIllustration } from './resolve.ts';

test('cada clave del contrato tiene ilustración y SVG válido', () => {
  assert.equal(ILLUSTRATION_KEYS.length, 33);
  for (const key of ILLUSTRATION_KEYS) {
    assert.ok(CARD_ART[key], key);
    const xml = cardArtXml(key);
    assert.ok(xml.startsWith('<svg') && xml.endsWith('</svg>'), key);
    assert.ok(!xml.includes('undefined') && !xml.includes('NaN'), `${key} tiene un valor sin resolver`);
  }
});

test('la clave del servidor manda; si no llega o no se conoce, se resuelve por icono y categoría', () => {
  assert.equal(resolveIllustration({ illustration: 'crown', icon: 'flame' }), 'crown');
  assert.equal(resolveIllustration({ illustration: 'no-existe', icon: 'flame-outline', category: 'HITO' }), 'streak-flame');
  assert.equal(resolveIllustration({ icon: 'footsteps-outline', category: 'HITO' }), 'first-step');
  assert.equal(resolveIllustration({ icon: 'glifo-raro', category: 'CARDIO' }), 'heart-pulse');
  assert.equal(resolveIllustration({ icon: null, category: 'NUEVA' }), 'star');
});

test('solo se vela la secreta sin conseguir', () => {
  assert.equal(isVeiled({ earned: false, secret: true }), true);
  assert.equal(isVeiled({ earned: true, secret: true }), false);
  assert.equal(isVeiled({ earned: false, category: 'SECRETA', progress: null }), true);
  assert.equal(isVeiled({ earned: false, category: 'HITO', progress: 0.2 }), false);
});
