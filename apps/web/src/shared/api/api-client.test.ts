import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { apiRequest } from './api-client';

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
