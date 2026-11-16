import 'server-only';
import { hasAdminPermissionGrants } from '@gymsheet/domain';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { UserRole } from '@/shared/api/contracts';
import type { PortalSession } from '@/shared/auth/portal-session';
import { sessionPrincipalSchema, userSchema } from '@/shared/api/schemas';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { accountSuspensionOf, type AccountSuspension } from '@gymsheet/domain';
import { apiErrorFromProblem } from '@/shared/api/api-error';
import { suspendedExitPath } from '@/shared/auth/suspension';
import { backendRequest, isBackendUnreachable, readBackendJson } from './backend';

const envelopeSchema = z.object({ ok: z.literal(true), data: z.unknown() });
const principalSchema = sessionPrincipalSchema;
const permissionsMeSchema = z.object({ permissionKeys: z.array(z.string()) });

async function readData<T>(response: Response, schema: z.ZodType<T>) {
  if (!response.ok) return null;
  const envelope = envelopeSchema.safeParse(await readBackendJson(response));
  if (!envelope.success) return null;
  const parsed = schema.safeParse(envelope.data.data);
  return parsed.success ? parsed.data : null;
}

/**
 * El backend no contestó, así que no sabemos si la sesión vale.
 *
 * Existe para que «no pude preguntar» no se confunda con «no tienes sesión»:
 * lo segundo se resuelve cerrando la sesión, y hacer eso ante un fallo de red
 * dejaba fuera al usuario y le borraba la cookie por un parpadeo del backend.
 */
export class BackendUnavailableError extends Error {
  constructor() {
    super('No pudimos contactar al servidor.');
    this.name = 'BackendUnavailableError';
  }
}

/**
 * The backend refused the token because the account is suspended (401
 * `ACCOUNT_SUSPENDED`). Not «no session»: the person must be told why.
 */
export class AccountSuspendedError extends Error {
  constructor(readonly suspension: AccountSuspension) {
    super('Cuenta suspendida.');
    this.name = 'AccountSuspendedError';
  }
}

/**
 * Memoizada por petición.
 *
 * El layout del portal resuelve la sesión y luego casi cada página vuelve a
 * pedirla con `requireRole`/`requireSession`: sin memoizar, una sola navegación
 * hacía dos o tres rondas de `/auth/me` + `/users/me` + permisos contra el
 * backend para contestar lo mismo. `cache` de React vive en el ámbito de una
 * petición, que es exactamente la vida útil de esta respuesta — el siguiente
 * request vuelve a preguntar, así que una sesión revocada sigue notándose de
 * inmediato.
 *
 * También memoiza el lanzamiento de `BackendUnavailableError`, que es lo
 * deseable: si el backend no contestó, no tiene sentido insistir tres veces
 * dentro del mismo render.
 */
export const getSession = cache(async function getSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [principalResponse, userResponse] = await Promise.all([
    backendRequest('/auth/me', { token }),
    backendRequest('/users/me', { token }),
  ]);
  // Antes de interpretar nada: si no hubo respuesta útil, no se concluye que la
  // sesión sea inválida. `readData` devuelve `null` tanto para un 401 como para
  // un timeout, y ahí es donde se perdía la distinción.
  if (isBackendUnreachable(principalResponse)) throw new BackendUnavailableError();
  if (principalResponse.status === 401) {
    const suspension = accountSuspensionOf(
      apiErrorFromProblem(401, await readBackendJson(principalResponse.clone())),
    );
    if (suspension) throw new AccountSuspendedError(suspension);
  }
  const principal = await readData(principalResponse, principalSchema);
  const user = await readData(userResponse, userSchema);
  if (!principal) return null;

  // Only the roles `/admin/permissions/me` answers for (ADMIN, FRONT_DESK and
  // SYSTEM_ADMIN, whose list is the whole catalog) ask for it: a coach or a
  // moderator would get 403, and a moderator needs no grant (ADR-0018). This
  // also saves a round-trip on every page load for member accounts.
  const permissions =
    hasAdminPermissionGrants(principal.role)
      ? await readData(
          await backendRequest('/admin/permissions/me', { token }),
          permissionsMeSchema,
        )
      : null;

  return {
    ...principal,
    ...(user?.nombreCompleto ? { nombreCompleto: user.nombreCompleto } : {}),
    ...(permissions ? { permissions: permissions.permissionKeys } : {}),
  };
});

/**
 * Sesión obligatoria para una vista del portal.
 *
 * `null` aquí ya significa una sola cosa: el backend respondió y la sesión no
 * vale. Sólo entonces se cierra. Si no se pudo preguntar, `getSession` lanza
 * `BackendUnavailableError` y sube hasta `app/error.tsx`, que pinta un error con
 * botón de reintento — sin tocar la cookie, así que al volver el backend el
 * usuario sigue dentro.
 */
export async function requireSession() {
  let session: PortalSession | null;
  try {
    session = await getSession();
  } catch (error: unknown) {
    // Clears the cookie and lands on login with the suspension, not «sesión expirada».
    if (error instanceof AccountSuspendedError) redirect(suspendedExitPath(error.suspension));
    throw error;
  }
  if (!session) redirect('/api/auth/logout?returnTo=/login');
  return session;
}

export async function requireRole(roles: readonly UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect('/dashboard?denied=1');
  return session;
}
