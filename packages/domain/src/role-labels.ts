/**
 * Etiquetas legibles de los roles de cuenta. Fuente única: ninguna pantalla
 * debe mostrar el código crudo del rol (`SYSTEM_ADMIN`, `FRONT_DESK`…).
 */
const ROLE_LABELS: Readonly<Record<string, string>> = {
  CLIENTE: 'Socio',
  ADMIN: 'Administrador del gimnasio',
  SYSTEM_ADMIN: 'Administrador del sistema',
  COACH: 'Entrenador',
  ENTRENADOR_EXTERNO: 'Entrenador externo',
  FRONT_DESK: 'Recepción',
};

/** Etiqueta en español del rol; para un rol desconocido humaniza el código. */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return '';
  const known = ROLE_LABELS[role];
  if (known) return known;
  const words = role.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
