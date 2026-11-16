import {
  ACCOUNT_SUSPENDED,
  accountSuspensionDetailsSchema,
  type AccountExportStatus,
  type ClosurePreview,
} from '@gymsheet/schemas';

/** Copy and pure rules of the account rights (rename, email change, export, closure). */

export const privacySettingsCopy = {
  title: 'Privacidad y datos',
  description: 'Tus consentimientos, una copia de tus datos y el cierre de tu cuenta.',
} as const;

export const accountNameCopy = {
  title: 'Cambiar nombre',
  label: 'Nombre completo',
  submit: 'Guardar nombre',
  saved: 'Nombre actualizado.',
} as const;

export const emailChangeCopy = {
  title: 'Cambiar correo',
  description: 'Te enviamos un código al correo nuevo. Tu correo actual sigue igual hasta que lo confirmes.',
  newEmailLabel: 'Correo nuevo',
  passwordLabel: 'Tu contraseña',
  request: 'Enviar código',
  pinLabel: 'Código del correo nuevo',
  pinSent: (email: string) => `Te enviamos un código a ${email}.`,
  confirm: 'Confirmar correo',
  restart: 'Usar otro correo',
  changed: (email: string) => `Listo. Ahora entras con ${email}.`,
  errors: {
    CURRENT_PASSWORD_INVALID: 'La contraseña no es correcta.',
    EMAIL_UNCHANGED: 'Ese ya es tu correo.',
    EMAIL_CHANGE_BLOCKED_BY_SANCTION: 'No puedes cambiar el correo mientras tengas sanciones de moderación vigentes.',
    taken: 'Ese correo ya está registrado en otra cuenta.',
  },
} as const;

export const accountExportCopy = {
  title: 'Descargar mis datos',
  description: 'Prepara una copia de todo lo que guardamos de ti, en un archivo JSON.',
  request: 'Preparar copia',
  pending: 'Preparando tu copia. Puede tardar unos minutos.',
  ready: 'Tu copia está lista.',
  download: 'Descargar copia',
  failed: 'No pudimos preparar tu copia. Inténtalo más tarde.',
  expires: (date: string) => `Disponible hasta el ${date}.`,
  rateLimited: (wait: string) => `Ya pediste una copia hoy. Pide otra en ${wait}.`,
} as const;

export const accountClosureCopy = {
  title: 'Cerrar mi cuenta',
  description: 'Borra tus datos personales. No se puede deshacer.',
  start: 'Revisar qué se borra',
  deleted: 'Se borra',
  anonymized: 'Queda sin datos tuyos',
  kept: 'Se conserva',
  staff: 'Las cuentas del personal las cierra el administrador del gimnasio.',
  proofTitle: 'Confirma que eres tú',
  passwordLabel: 'Tu contraseña',
  usePassword: 'Confirmar con contraseña',
  usePin: 'Confirmar con un código por correo',
  /** Short labels of the proof switch. */
  proofPassword: 'Contraseña',
  proofPin: 'Código por correo',
  sendPin: 'Enviar código',
  pinSent: 'Te enviamos un código a tu correo.',
  pinLabel: 'Código del correo',
  submit: 'Cerrar mi cuenta',
  confirmTitle: '¿Cerrar tu cuenta para siempre?',
  confirmMessage: 'Borramos tus datos y cerramos tu sesión. No se puede deshacer.',
  confirmLabel: 'Cerrar para siempre',
  errors: {
    CURRENT_PASSWORD_INVALID: 'La contraseña no es correcta.',
    CLOSURE_PROOF_REQUIRED: 'Confirma el cierre con tu contraseña.',
    ACCOUNT_CLOSURE_STAFF: 'Las cuentas del personal las cierra el administrador del gimnasio.',
  },
} as const;

export const goodbyeCopy = {
  title: 'Tu cuenta está cerrada',
  description: 'Borramos tus datos personales. Gracias por entrenar con nosotros.',
  action: 'Ir al inicio',
} as const;

/** How the closure can be proven: the password always; an emailed PIN for Google/Apple accounts. */
export function closureProofOptions(preview: Pick<ClosurePreview, 'proof'>): Array<'password' | 'pin'> {
  return preview.proof.emailPin ? ['password', 'pin'] : ['password'];
}

/** Rows in the three groups of a preview: the screen shows what exists, not the schema. */
export function closurePreviewIsEmpty(preview: Pick<ClosurePreview, 'deleted' | 'anonymized' | 'kept'>): boolean {
  return preview.deleted.length + preview.anonymized.length + preview.kept.length === 0;
}

/** Poll every few seconds while the archive is being built; stop once it settles. */
export const ACCOUNT_EXPORT_POLL_MS = 4_000;

export function accountExportPollInterval(status: Pick<AccountExportStatus, 'status'> | undefined): number | false {
  return status?.status === 'PENDING' ? ACCOUNT_EXPORT_POLL_MS : false;
}

/** Downloadable now: READY with a path the backend still serves. */
export function isAccountExportDownloadable(
  status: Pick<AccountExportStatus, 'status' | 'downloadPath'> | undefined,
): boolean {
  return status?.status === 'READY' && Boolean(status.downloadPath);
}

/** Seconds a 429 `ACCOUNT_EXPORT_RATE_LIMITED` asks to wait (`details.retryAfterSeconds`). */
export function exportRetryAfterSeconds(details: unknown): number | null {
  const value = (details as { retryAfterSeconds?: unknown } | null | undefined)?.retryAfterSeconds;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.ceil(value) : null;
}

/** «23 h», «45 min» or «1 min»: the wait before another export, rounded up. */
export function waitLabel(seconds: number): string {
  if (seconds >= 3_600) return `${Math.ceil(seconds / 3_600)} h`;
  return `${Math.max(1, Math.ceil(seconds / 60))} min`;
}

export type AccountSuspension = { pendingReview: boolean; until: string | null };

/**
 * The suspension a failed request reports (`code: ACCOUNT_SUSPENDED`, 403 at
 * login, 401 with a valid token), or null for any other failure. Reads the
 * code and details, never the sentence. Duck-typed: no HTTP client needed.
 */
export function accountSuspensionOf(error: unknown): AccountSuspension | null {
  const { code, details } = (error ?? {}) as { code?: unknown; details?: unknown };
  if (code !== ACCOUNT_SUSPENDED) return null;
  const parsed = accountSuspensionDetailsSchema.safeParse(details);
  // A suspension without readable details is still a suspension: say so without a date.
  if (!parsed.success) return { pendingReview: false, until: null };
  return parsed.data.pendingReview
    ? { pendingReview: true, until: null }
    : { pendingReview: false, until: parsed.data.until };
}

const longDate = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
};

const suspensionText = {
  pendingReview: 'Tu cuenta está suspendida mientras revisamos un reporte. Te avisaremos cuando terminemos.',
  until: (date: string) => `Tu cuenta está suspendida hasta el ${date} por incumplir las normas de la comunidad.`,
  undated: 'Tu cuenta está suspendida por incumplir las normas de la comunidad.',
};

export const accountSuspensionCopy = {
  title: 'Tu cuenta está suspendida',
  ...suspensionText,
  rules: 'Leer las normas',
  /** The sentence for one suspension (safe to destructure). */
  message: (suspension: AccountSuspension): string => {
    if (suspension.pendingReview) return suspensionText.pendingReview;
    const date = suspension.until ? longDate(suspension.until) : null;
    return date ? suspensionText.until(date) : suspensionText.undated;
  },
} as const;
