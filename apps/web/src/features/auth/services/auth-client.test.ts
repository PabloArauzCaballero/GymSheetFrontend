import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchBusinessLegal } from './auth-client';

// Exact body of `GET /legal/current?accountKind=BUSINESS` from the franja 8b backend.
const businessLegalBody = {
  ok: true,
  data: {
    documents: [
      { document: 'BUSINESS_TERMS', version: '2026-11-16', contentSha256: 'a'.repeat(64) },
      { document: 'BUSINESS_DPA', version: '2026-11-16', contentSha256: 'b'.repeat(64) },
      { document: 'PRIVACY', version: '2026-08-25', contentSha256: null },
    ],
    consents: [{ kind: 'KYC_SELFIE', version: '2026-11-16' }],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('fetchBusinessLegal', () => {
  it('reads the business set even though it lists the KYC_SELFIE consent', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(businessLegalBody), { status: 200 })));

    const documents = await fetchBusinessLegal();

    expect(documents.map((entry) => entry.document)).toEqual(['BUSINESS_TERMS', 'BUSINESS_DPA', 'PRIVACY']);
  });
});
