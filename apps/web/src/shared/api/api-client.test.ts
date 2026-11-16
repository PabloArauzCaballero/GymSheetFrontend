import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiRequest, downloadFromApi } from './api-client';

describe('apiRequest', () => {
  afterEach(() => vi.restoreAllMocks());

  it('extracts and validates data from the backend response envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { items: ['exercise-1'] } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(
      apiRequest('/exercises', z.object({ items: z.array(z.string()) })),
    ).resolves.toEqual({ items: ['exercise-1'] });
  });
});

describe('downloadFromApi', () => {
  afterEach(() => vi.restoreAllMocks());

  it('saves the binary body with its content type under the given filename', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([0x25, 0x50, 0x44, 0x46]), { headers: { 'Content-Type': 'application/pdf' } }),
    );
    const save = vi.spyOn(await import('@/shared/lib/data-transfer'), 'saveBlob').mockImplementation(() => undefined);
    await downloadFromApi('/export/workout-history/pdf', 'repp-avance.pdf');
    expect(fetch).toHaveBeenCalledWith('/api/backend/export/workout-history/pdf', expect.objectContaining({ credentials: 'same-origin' }));
    const [blob, name] = save.mock.calls[0]!;
    expect(name).toBe('repp-avance.pdf');
    expect(blob.type).toBe('application/pdf');
  });
});
