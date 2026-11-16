import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cache } from 'react';
import { z } from 'zod';
import { pendingLegalDocumentsSchema, type LegalDocumentVersion } from '@/shared/api/schemas';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { backendRequest, readBackendJson } from './backend';

/**
 * Channel the backend stores with every legal acceptance as audit evidence
 * (`legal-client-context.ts`). The BFF is the web client, so it always says web.
 */
export const CLIENT_PLATFORM_HEADER = 'X-Client-Platform';
export const WEB_CLIENT_PLATFORM = 'web';

const envelopeSchema = z.object({ ok: z.literal(true), data: pendingLegalDocumentsSchema });

/**
 * Documents the signed-in person still has to accept, for the portal layout.
 *
 * Fails open (`[]`) when the backend cannot answer: the API stays the authority
 * and keeps answering 428 to every other call, which the client gate catches.
 * Blocking the whole portal on a transient error here would lock everyone out.
 * Memoized per request, like `getSession`.
 */
export const getPendingLegalDocuments = cache(async function getPendingLegalDocuments(): Promise<
  LegalDocumentVersion[]
> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return [];
  const response = await backendRequest('/me/legal/pending', { token });
  if (!response.ok) return [];
  const parsed = envelopeSchema.safeParse(await readBackendJson(response));
  return parsed.success ? parsed.data.data.pending : [];
});

/** Relays a backend answer as is: status, problem body (codes included) and caching. */
export async function relayBackendResponse(backendResponse: Response) {
  const payload = await readBackendJson(backendResponse);
  const response = NextResponse.json(payload, { status: backendResponse.status });
  const cacheControl = backendResponse.headers.get('cache-control');
  if (cacheControl) response.headers.set('Cache-Control', cacheControl);
  return response;
}
