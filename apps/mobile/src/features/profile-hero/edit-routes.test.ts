/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { editRouteFor } from './edit-routes.ts';

test('each profile item opens the place where it is completed', () => {
  assert.equal(editRouteFor('DATOS'), '/profile-data');
  assert.equal(editRouteFor('NACIMIENTO'), '/profile-data?step=2');
  assert.equal(editRouteFor('FOTO'), '/profile-edit?section=FOTO');
  assert.equal(editRouteFor('BIO'), '/profile-edit?section=BIO');
});
