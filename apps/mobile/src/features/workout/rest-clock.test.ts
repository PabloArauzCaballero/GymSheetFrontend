/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { msToNextSecond } from './rest-clock.ts';

describe('msToNextSecond', () => {
  it('espera justo hasta que cambia la cifra redondeada hacia arriba', () => {
    // 4.300 ms se ven como 0:05; pasa a 0:04 al llegar a 4.000.
    assert.equal(msToNextSecond(4300), 308);
    assert.equal(msToNextSecond(4001), 9);
  });

  it('en un segundo exacto espera el segundo entero', () => {
    // 4.000 ms ya se ven como 0:04; el cambio a 0:03 llega en 1.000 ms.
    assert.equal(msToNextSecond(4000), 1008);
  });

  it('cada tic cae dentro del segundo siguiente', () => {
    for (const remaining of [90_000, 59_999, 10_500, 1234, 1]) {
      const wait = msToNextSecond(remaining);
      const shown = Math.ceil(remaining / 1000);
      const after = Math.ceil(Math.max(0, remaining - wait) / 1000);
      assert.equal(after, shown - 1, `con ${remaining} ms`);
    }
  });
});
