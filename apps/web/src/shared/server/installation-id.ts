import 'server-only';
import { cookies } from 'next/headers';
import { unstable_rethrow } from 'next/navigation';
import { randomUuid } from '@/shared/lib/uuid';
import {
  INSTALLATION_COOKIE,
  installationCookieOptions,
  isInstallationId,
} from './installation-cookie';

/**
 * Installation id to send as `X-Installation-Id`, created on first use.
 *
 * `proxy.ts` already mints the cookie on the first page load. This covers a
 * route handler reached before any page (an API-first client): it creates the
 * cookie once and later calls in the same request read it back. Server
 * Components cannot set cookies; there it answers `null` and the header is
 * simply left out (the backend treats it as unknown, never as an error).
 */
export async function resolveInstallationId(): Promise<string | null> {
  let store: Awaited<ReturnType<typeof cookies>>;
  try {
    store = await cookies();
  } catch (error: unknown) {
    unstable_rethrow(error);
    return null;
  }
  const existing = store.get(INSTALLATION_COOKIE)?.value;
  if (isInstallationId(existing)) return existing.toLowerCase();
  const fresh = randomUuid();
  try {
    store.set(INSTALLATION_COOKIE, fresh, installationCookieOptions());
    return fresh;
  } catch {
    return null;
  }
}
