import { STAFF_CLOSURE_LAST_ADMIN, STAFF_CLOSURE_NOT_STAFF, STAFF_CLOSURE_SELF } from '@gymsheet/schemas';

/**
 * Closure of a staff account by its gym's admin (`POST /admin/users/:id/close`).
 * The staff member cannot close it from the app (`ACCOUNT_CLOSURE_STAFF`); the
 * erasure is the same as any closure. The backend decides; this only drives
 * which rows offer it and what each answer says.
 */

const closableRoles: readonly string[] = ['ADMIN', 'COACH', 'FRONT_DESK', 'ENTRENADOR_EXTERNO'];

/** A staff row other than the caller's own: members close theirs, a platform admin is out of scope. */
export function canCloseStaffAccount(role: string, userId: string, callerId: string | undefined): boolean {
  return closableRoles.includes(role) && userId !== callerId;
}

export const staffClosureCopy = {
  action: 'Cerrar cuenta',
  confirmTitle: (name: string) => `¿Cerrar la cuenta de ${name}?`,
  confirmMessage:
    'Borramos sus datos personales, sus sesiones, sus entrenos y su contenido, y su ficha de personal queda terminada. ' +
    'Se quedan, firmadas «Cuenta cerrada», las rutinas que asignó a socios y los chats del gimnasio que atendió. ' +
    'Los registros que el gimnasio debe guardar se conservan sin sus datos. No se puede deshacer.',
  confirmLabel: 'Cerrar para siempre',
  closed: (name: string) => `Cerramos la cuenta de ${name}.`,
  errors: {
    [STAFF_CLOSURE_NOT_STAFF]: 'Las cuentas de socios las cierra cada socio desde su app.',
    [STAFF_CLOSURE_SELF]: 'No puedes cerrar tu propia cuenta desde aquí.',
    [STAFF_CLOSURE_LAST_ADMIN]: 'Es el único administrador del gimnasio: nombra otro antes de cerrar esta cuenta.',
    notFound: 'Esa cuenta ya no está en tu gimnasio o ya estaba cerrada. Actualiza la lista.',
    failed: 'No pudimos cerrar la cuenta. Inténtalo de nuevo.',
  },
} as const;

/** The sentence for a refused closure, by code and status (never the server's wording). */
export function staffClosureErrorMessage(error: unknown): string {
  const { code, status } = (error ?? {}) as { code?: unknown; status?: unknown };
  const { errors } = staffClosureCopy;
  if (code === STAFF_CLOSURE_NOT_STAFF || code === STAFF_CLOSURE_SELF || code === STAFF_CLOSURE_LAST_ADMIN) return errors[code];
  if (status === 404) return errors.notFound;
  return errors.failed;
}
