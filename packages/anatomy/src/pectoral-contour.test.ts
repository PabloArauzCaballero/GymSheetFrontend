import assert from 'node:assert/strict';
import { it } from 'node:test';
import { containsPoint } from './hit-test.ts';
import { REGIONS } from './regions.generated.ts';

it('el pectoral no tiene muescas rectangulares en su borde inferior', () => {
  const pectoral = REGIONS['surface-front']?.find((region) => region.code === 'PECTORALIS_MAJOR');
  assert.ok(pectoral);
  assert.equal(containsPoint(pectoral.rings, 435, 655), true);
  assert.equal(containsPoint(pectoral.rings, 565, 655), true);
  assert.equal(containsPoint(pectoral.rings, 500, 600), false);
});
