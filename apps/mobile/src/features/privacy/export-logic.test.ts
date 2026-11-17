/// <reference types="node" />
import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiError } from '@gymsheet/api-client';
import type { AccountExportStatus } from '@gymsheet/schemas';
import { exportCopy, exportPollInterval, exportRateLimitSeconds, exportView } from './export-logic.ts';

function job(status: AccountExportStatus['status'], downloadPath: string | null = null): AccountExportStatus {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    status,
    requestedAt: '2026-11-16T10:00:00.000Z',
    completedAt: status === 'PENDING' ? null : '2026-11-16T10:02:00.000Z',
    expiresAt: status === 'READY' ? '2026-11-23T10:02:00.000Z' : null,
    sizeBytes: status === 'READY' ? 2048 : null,
    downloadPath,
  };
}

test('no job yet: offer to prepare one', () => {
  assert.deepEqual(exportView(null, null), { kind: 'idle' });
  assert.ok(exportCopy({ kind: 'idle' }).action);
});

test('while the worker builds it: wait and poll, no action', () => {
  const pending = job('PENDING');
  assert.deepEqual(exportView(pending, null), { kind: 'pending' });
  assert.equal(exportCopy({ kind: 'pending' }).action, null);
  assert.equal(typeof exportPollInterval(pending), 'number');
  assert.equal(exportPollInterval(job('READY', '/me/export/x/download')), false);
  assert.equal(exportPollInterval(undefined), false);
});

test('ready with a path: download and share, with its expiry', () => {
  const view = exportView(job('READY', '/me/export/x/download'), null);
  assert.equal(view.kind, 'ready');
  assert.equal(view.kind === 'ready' && view.downloadPath, '/me/export/x/download');
  assert.match(exportCopy(view).message, /23 de noviembre/);
});

test('ready without a path is expired; failed offers another try', () => {
  assert.deepEqual(exportView(job('READY'), null), { kind: 'expired' });
  assert.deepEqual(exportView(job('FAILED'), null), { kind: 'failed' });
  assert.ok(exportCopy({ kind: 'failed' }).action);
});

test('a 429 says how long to wait and offers nothing to tap', () => {
  const error = new ApiError({
    message: 'Ya pediste una copia hoy.',
    status: 429,
    kind: 'rate-limit',
    code: 'ACCOUNT_EXPORT_RATE_LIMITED',
    details: { retryAfterSeconds: 5 * 3_600 - 10 },
  });
  const seconds = exportRateLimitSeconds(error);
  assert.equal(seconds, 5 * 3_600 - 10);
  const view = exportView(job('FAILED'), seconds);
  assert.equal(view.kind, 'rate-limited');
  assert.match(exportCopy(view).message, /5 h/);
  assert.equal(exportCopy(view).action, null);
  assert.equal(exportRateLimitSeconds(new ApiError({ message: 'x', status: 429, kind: 'rate-limit' })), null);
});

test('a ready copy still downloads even after a 429 for a new one', () => {
  assert.equal(exportView(job('READY', '/me/export/x/download'), 3_600).kind, 'ready');
});
