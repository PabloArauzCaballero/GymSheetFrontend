import { isSystemAdmin } from '@gymsheet/domain';
import type { UserRole } from '@gymsheet/types';

/** Personal que atiende un gimnasio concreto; el `COACH` no, porque entrena. */
const GYM_STAFF_ROLES: readonly UserRole[] = ['ADMIN', 'FRONT_DESK'];

/**
 * El panel de quien no viene a entrenar, o `null` si la persona entrena.
 *
 * Las pantallas de socio (Comunidad, Inicio) abren con una baraja vacía o
 * «aún no tienes membresía» para una cuenta que no las usa: al `SYSTEM_ADMIN`
 * se le manda a `/sistema` y a quien atiende el gimnasio (`ADMIN`,
 * `FRONT_DESK`) a su operación del día.
 */
export function staffHomeFor(role: UserRole): string | null {
  if (isSystemAdmin(role)) return '/sistema';
  if (GYM_STAFF_ROLES.includes(role)) return '/admin/operacion';
  return null;
}
