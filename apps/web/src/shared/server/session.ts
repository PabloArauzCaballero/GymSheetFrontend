import 'server-only';
import { isStaff } from '@gymsheet/domain';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { SessionPrincipal, UserRole } from '@/shared/api/contracts';
import { sessionPrincipalSchema, userSchema } from '@/shared/api/schemas';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { backendRequest, isBackendUnreachable, readBackendJson } from './backend';

const envelopeSchema = z.object({ ok: z.literal(true), data: z.unknown() });
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

export async function getSession(): Promise<SessionPrincipal | null> {
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
  const principal = await readData(principalResponse, sessionPrincipalSchema);
  const user = await readData(userResponse, userSchema);
  if (!principal) return null;

  // Solo el personal (ADMIN/COACH/FRONT_DESK) puede tener permisos granulares
  // de administración; evita un round-trip extra en cada carga de página para
  // el resto de las cuentas.
  const permissions = isStaff(principal.role)
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
}

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
  const session = await getSession();
  if (!session) redirect('/api/auth/logout?returnTo=/login');
  return session;
}

export async function requireRole(roles: readonly UserRole[]) {
  const session = await requireSession();
  if (!roles.includes(session.role)) redirect('/dashboard?denied=1');
  return session;
}
