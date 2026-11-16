import 'server-only';
import { accountKindOf, authDestination } from '@gymsheet/domain';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';
import { businessMeSchema, type BusinessMe } from '@/shared/api/schemas';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import type { PortalSession } from '@/shared/auth/portal-session';
import { backendRequest, isBackendUnreachable, readBackendJson } from './backend';
import { BackendUnavailableError, requireSession } from './session';

const envelopeSchema = z.object({ ok: z.literal(true), data: businessMeSchema });

/** Whether a session belongs to a business account (ADR-0020). */
export function isBusinessSession(session: Pick<PortalSession, 'role' | 'accountKind'>): boolean {
  return accountKindOf(session) === 'BUSINESS';
}

/**
 * The business portal's session: a person never sees `/negocio` (the API
 * refuses `business/*` to a person anyway, 403); they land on their own home.
 */
export async function requireBusinessSession(): Promise<PortalSession> {
  const session = await requireSession();
  if (!isBusinessSession(session)) redirect(authDestination.web.afterLogin);
  return session;
}

/**
 * `GET /business/me`, memoized per request. Null when the backend answered
 * and the account has no business (or the contract changed); a backend that
 * did not answer throws, so the error boundary offers a retry.
 */
export const getBusinessMe = cache(async function getBusinessMe(): Promise<BusinessMe | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const response = await backendRequest('/business/me', { token });
  if (isBackendUnreachable(response)) throw new BackendUnavailableError();
  if (!response.ok) return null;
  const parsed = envelopeSchema.safeParse(await readBackendJson(response));
  return parsed.success ? parsed.data.data : null;
});
