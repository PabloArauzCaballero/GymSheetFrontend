/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@gymsheet/api-client';
import { shouldRetryQuery } from './query-retry.ts';

test('a legal block (428) is never retried, with or without its code', () => {
  assert.equal(shouldRetryQuery(0, new ApiError({ message: 'x', status: 428, kind: 'unexpected', code: 'LEGAL_ACCEPTANCE_REQUIRED' })), false);
  assert.equal(shouldRetryQuery(0, new ApiError({ message: 'x', status: 428, kind: 'unexpected' })), false);
});

test('final answers are not retried; transient failures are retried once', () => {
  assert.equal(shouldRetryQuery(0, new ApiError({ message: 'x', status: 403, kind: 'forbidden' })), false);
  const outage = new ApiError({ message: 'x', status: 503, kind: 'unexpected' });
  assert.equal(shouldRetryQuery(0, outage), true);
  assert.equal(shouldRetryQuery(1, outage), false);
});
