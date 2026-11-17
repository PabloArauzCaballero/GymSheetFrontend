import { isModerator, isSystemAdmin } from '@gymsheet/domain';
import type { UserRole } from '@gymsheet/types';

/**
 * El panel de quien no viene a entrenar, o `null` si la persona entrena.
 *
 * Las pantallas de socio (Comunidad, Inicio) abren con una baraja vacía o
 * «aún no tienes membresía» para una cuenta que no las usa: al `SYSTEM_ADMIN`
 * se le manda a `/sistema` y al equipo de moderación de REPP (`MODERATOR`,
 * ADR-0018) a su cola. A former gym staff account is a `CLIENTE` since franja
 * 7d (backend ADR-0029) and lands on the person portal like any member.
 */
export function staffHomeFor(role: UserRole): string | null {
  if (isSystemAdmin(role)) return '/sistema';
  if (isModerator(role)) return '/moderacion';
  return null;
}
