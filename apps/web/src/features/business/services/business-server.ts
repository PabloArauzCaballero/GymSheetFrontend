import 'server-only';
import { cache } from 'react';
import { z } from 'zod';
import { handleResolutionSchema, type DirectoryEntityDetail } from '@/shared/api/schemas';
import { backendRequest, isBackendUnreachable, readBackendJson } from '@/shared/server/backend';
import { BackendUnavailableError } from '@/shared/server/session';

export type PublicHandle =
  | { kind: 'found'; handle: string; entity: DirectoryEntityDetail }
  | { kind: 'redirect'; to: string }
  | { kind: 'missing' };

const envelopeSchema = z.object({ ok: z.literal(true), data: handleResolutionSchema });

/**
 * `GET /public/handles/:handle`, server to server (public, no session). Only
 * an ACTIVE handle of an ACTIVE listing resolves; a PENDING reservation is a
 * 404 like any unknown handle, so a draft business is never public.
 */
export const resolvePublicHandle = cache(async function resolvePublicHandle(handle: string): Promise<PublicHandle> {
  const response = await backendRequest(`/public/handles/${encodeURIComponent(handle)}`);
  if (isBackendUnreachable(response)) throw new BackendUnavailableError();
  if (!response.ok) return { kind: 'missing' };
  const parsed = envelopeSchema.safeParse(await readBackendJson(response));
  if (!parsed.success) return { kind: 'missing' };
  const data = parsed.data.data;
  return 'redirectTo' in data ? { kind: 'redirect', to: data.redirectTo } : { kind: 'found', handle: data.handle, entity: data.entity };
});
