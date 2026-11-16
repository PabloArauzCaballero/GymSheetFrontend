import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { ApiError, createApiClient } from '@gymsheet/api-client';
import { requestRoutineProgressFile } from './routine-progress-request.ts';

// Captured verbatim from the local API (POST /api/v1/export/routine-progress,
// Accept: application/json, format csv). The file is nested under `data`.
const captured = JSON.parse(
  readFileSync(new URL('./__fixtures__/routine-progress-export-csv.json', import.meta.url), 'utf8'),
) as { ok: true; data: { fileName: string; mimeType: string; content: string; base64: string } };

const filters = { format: 'csv', routineId: 'ALL', datePreset: 'ALL' } as const;

function clientAnswering(status: number, body: unknown, seen: Request[] = []) {
  return createApiClient({
    baseUrl: 'http://api.test/api/v1',
    tokenProvider: {
      getAccessToken: async () => 'token',
      setAccessToken: async () => undefined,
      clear: async () => undefined,
    },
    fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(new Request(input, init));
      return new Response(JSON.stringify(body), { status });
    }) as typeof fetch,
  });
}

test('unwraps the envelope: the base64 comes from data, not the top level', async () => {
  const seen: Request[] = [];
  const file = await requestRoutineProgressFile(clientAnswering(201, captured, seen), filters);

  assert.equal(file.fileName, captured.data.fileName);
  assert.equal(file.mimeType, 'text/csv; charset=utf-8');
  assert.equal(file.recordsCount, 0);
  // The bytes written to disk decode back to the CSV the server built.
  assert.equal(Buffer.from(file.base64, 'base64').toString('utf8'), captured.data.content);
  // The top-level reading this replaces found nothing to save.
  assert.equal((captured as Record<string, unknown>).base64, undefined);

  const [request] = seen;
  assert.equal(request?.method, 'POST');
  assert.equal(request?.url, 'http://api.test/api/v1/export/routine-progress');
  assert.equal(request?.headers.get('accept'), 'application/json');
  assert.equal(request?.headers.get('authorization'), 'Bearer token');
  assert.deepEqual(await request?.json(), filters);
});

test('rejects a payload without the file instead of saving an empty one', async () => {
  const withoutFile: Partial<typeof captured.data> = { ...captured.data };
  delete withoutFile.base64;
  await assert.rejects(
    requestRoutineProgressFile(clientAnswering(201, { ok: true, data: withoutFile }), filters),
    (error: unknown) => error instanceof ApiError && error.kind === 'contract',
  );
});

test('rejects the unwrapped shape the old code assumed', async () => {
  await assert.rejects(
    requestRoutineProgressFile(clientAnswering(201, captured.data), filters),
    (error: unknown) => error instanceof ApiError && error.kind === 'contract',
  );
});

test('surfaces the server message on failure', async () => {
  // Problem body as the API answers it (captured with an invalid format).
  const problem = {
    type: 'about:blank',
    title: 'Bad Request',
    status: 400,
    detail: 'Datos de entrada inválidos.',
    ok: false,
    error: { message: 'Datos de entrada inválidos.' },
  };
  await assert.rejects(
    requestRoutineProgressFile(clientAnswering(400, problem), filters),
    (error: unknown) =>
      error instanceof ApiError && error.status === 400 && error.message === 'Datos de entrada inválidos.',
  );
});
