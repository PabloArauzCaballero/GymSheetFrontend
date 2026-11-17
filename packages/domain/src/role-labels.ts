import type { UserRole } from '@gymsheet/types';

/**
 * Etiquetas legibles de los roles de cuenta. Fuente única: ninguna pantalla
 * debe mostrar el código crudo del rol (`SYSTEM_ADMIN`, `MODERATOR`…).
 */
const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  CLIENTE: 'Socio',
  SYSTEM_ADMIN: 'Administrador del sistema',
  MODERATOR: 'Moderación REPP',
  NEGOCIO: 'Negocio',
};

/** Etiqueta en español del rol; para un rol desconocido humaniza el código. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return '';
  const known = (ROLE_LABELS as Readonly<Record<string, string>>)[role];
  if (known) return known;
  const words = role.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
