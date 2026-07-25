import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { SessionPrincipal, UserRole } from '@/shared/api/contracts';
import { sessionPrincipalSchema, userSchema } from '@/shared/api/schemas';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { backendRequest, readBackendJson } from './backend';

const envelopeSchema = z.object({ ok: z.literal(true), data: z.unknown() });

async function readData<T>(response: Response, schema: z.ZodType<T>) {
  if (!response.ok) return null;
  const envelope = envelopeSchema.safeParse(await readBackendJson(response));
  if (!envelope.success) return null;
  const parsed = schema.safeParse(envelope.data.data);
  return parsed.success ? parsed.data : null;
}

export async function getSession(): Promise<SessionPrincipal | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [principalResponse, userResponse] = await Promise.all([
    backendRequest('/auth/me', { token }),
    backendRequest('/users/me', { token }),
  ]);
  const principal = await readData(principalResponse, sessionPrincipalSchema);
  const user = await readData(userResponse, userSchema);
  if (!principal) return null;
  return {
    ...principal,
    ...(user?.nombreCompleto ? { nombreCompleto: user.nombreCompleto } : {}),
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect('/api/auth/logout?returnTo=/login');
  return session;
}

export async function requireRole(roles: readonly UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect('/dashboard?denied=1');
  return session;
}
