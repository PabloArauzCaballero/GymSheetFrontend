/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { kycFileFromAsset } from './kyc-photo.ts';

test('a camera JPEG goes as an upload part named by its kind', () => {
  assert.deepEqual(kycFileFromAsset({ uri: 'file:///ci.jpg', mimeType: 'image/jpeg', fileSize: 1000 }, 'CI_FRONT'), {
    uri: 'file:///ci.jpg',
    name: 'ci_front.jpg',
    mimeType: 'image/jpeg',
  });
});

test('a HEIC from the gallery is refused with the fix, before any upload', () => {
  const result = kycFileFromAsset({ uri: 'file:///a.heic', fileName: 'IMG_1.HEIC', mimeType: null }, 'SELFIE');
  assert.ok('error' in result && /JPG o PNG/u.test(result.error));
});

test('a photo over 8 MB is refused', () => {
  const result = kycFileFromAsset({ uri: 'file:///big.png', mimeType: 'image/png', fileSize: 9 * 1024 * 1024 }, 'CI_BACK');
  assert.ok('error' in result && /8 MB/u.test(result.error));
});
