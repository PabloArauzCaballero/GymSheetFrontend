/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { describeSessionCount, showsModeBonus } from './session-block-copy.ts';

const base = { sesionCuenta: true, motivoNoCuenta: null, sesionesHechasSemana: 1, sesionesPlanSemana: 4, semana: 2 };
const bonus = { multiplicador: 1, proximoMultiplicador: 1.2, puntosPrevistos: 13 };

test('cuenta con fracción', () => {
  assert.equal(describeSessionCount(base), 'Esta sesión cuenta: 1 de 4 de la semana 2.');
});

test('sin sesiones planeadas no dice «1 de 0»', () => {
  const text = describeSessionCount({ ...base, sesionesPlanSemana: 0, semana: 1 });
  assert.doesNotMatch(text, /\bde 0\b/u);
  assert.equal(text, 'Esta sesión cuenta para tu programa (semana 1).');
});

test('si no cuenta da el motivo', () => {
  assert.equal(
    describeSessionCount({ ...base, sesionCuenta: false, motivoNoCuenta: 'Para contar necesitas al menos 10 minutos y 3 series.' }),
    'Para contar necesitas al menos 10 minutos y 3 series.',
  );
});

test('el bono del modo solo se promete si la sesión cuenta', () => {
  assert.equal(showsModeBonus({ sesionCuenta: true, bonusModo: bonus }), true);
  assert.equal(showsModeBonus({ sesionCuenta: false, bonusModo: bonus }), false);
  assert.equal(showsModeBonus({ sesionCuenta: true, bonusModo: null }), false);
});
