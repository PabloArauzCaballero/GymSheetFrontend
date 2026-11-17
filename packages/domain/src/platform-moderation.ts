/**
 * The central REPP moderation team (backend ADR-0018): how a verdict is named
 * and what the moderators page says. The backend decides; this only words it.
 */

/** `resolution` of `POST /admin/moderation/cases/:kind/:id/resolve`. */
export const moderationResolutions = [
  'SIN_ACCION',
  'CONTENIDO_OCULTO',
  'USUARIO_ADVERTIDO',
  'USUARIO_SUSPENDIDO',
  'USUARIO_EXPULSADO',
  'MENOR_CONFIRMADO',
  'NEGOCIO_SUSPENDIDO',
] as const;
export type ModerationResolution = (typeof moderationResolutions)[number];

const RESOLUTION_LABEL: Readonly<Record<ModerationResolution, string>> = {
  SIN_ACCION: 'Sin infracción',
  CONTENIDO_OCULTO: 'Contenido oculto',
  USUARIO_ADVERTIDO: 'Advertencia',
  USUARIO_SUSPENDIDO: 'Suspensión',
  USUARIO_EXPULSADO: 'Cuenta expulsada',
  MENOR_CONFIRMADO: 'Menor de edad confirmado',
  NEGOCIO_SUSPENDIDO: 'Negocio suspendido',
};

/** Label of a verdict; an unknown code is humanized instead of shown raw. */
export function moderationResolutionLabel(resolution: string): string {
  const known = RESOLUTION_LABEL[resolution as ModerationResolution];
  if (known) return known;
  const words = resolution.replace(/_/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** `PUT /admin/platform/moderators/:userId` refusal: staff or a platform admin. */
export const MODERATOR_NOT_ASSIGNABLE = 'MODERATOR_NOT_ASSIGNABLE';

export const moderatorsCopy = {
  title: 'Equipo de moderación',
  description: 'Quién revisa las denuncias de todos los gimnasios. Cada alta y cada baja queda en la auditoría.',
  addTitle: (name: string) => `¿Sumar a ${name} al equipo de moderación?`,
  addMessage:
    'Verá las denuncias de todos los gimnasios, la copia de lo denunciado y decidirá avisos, suspensiones y expulsiones. ' +
    'Su cuenta deja de ser de socio mientras modere.',
  addLabel: 'Sumar al equipo',
  added: (name: string) => `${name} ya modera.`,
  removeTitle: (name: string) => `¿Quitar a ${name} del equipo?`,
  removeMessage: 'Vuelve a ser una cuenta de socio y los casos que tenía tomados vuelven a la cola.',
  removeLabel: 'Quitar del equipo',
  removed: (name: string) => `${name} ya no modera.`,
  errors: {
    [MODERATOR_NOT_ASSIGNABLE]: 'Solo una cuenta de socio puede moderar. El personal de un gimnasio y la administración del sistema no.',
    addNotFound: 'Esa cuenta no existe o está cerrada. Actualiza la búsqueda.',
    removeNotFound: 'Esa cuenta ya no estaba en el equipo. Actualiza la lista.',
    failed: 'No pudimos guardar el cambio. Inténtalo de nuevo.',
  },
} as const;

/** The sentence for a refused change, by code and status (never the server's wording). */
export function moderatorErrorMessage(error: unknown, action: 'add' | 'remove'): string {
  const { code, status } = (error ?? {}) as { code?: unknown; status?: unknown };
  const { errors } = moderatorsCopy;
  if (code === MODERATOR_NOT_ASSIGNABLE) return errors[MODERATOR_NOT_ASSIGNABLE];
  if (status === 404) return action === 'add' ? errors.addNotFound : errors.removeNotFound;
  return errors.failed;
}
