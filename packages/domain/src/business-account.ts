import { businessDestination } from './business-onboarding';

/**
 * «Cuenta» of a business (franja 8f, backend ADR-0028): its legal documents,
 * the copy of its data, the erasure of its KYC on request and the closure of
 * the business account. Copy and pure rules, shared by web and mobile.
 */

/** The legal set a business accepted at signup (backend `LEGAL_SETS.BUSINESS`). */
export const businessLegalDocuments = ['BUSINESS_TERMS', 'BUSINESS_DPA', 'PRIVACY'] as const;

export const businessAccountCopy = {
  title: 'Cuenta',
  description: 'Tus documentos, una copia de tus datos y el cierre de tu negocio.',
  legalTitle: 'Documentos legales',
  legalDescription: 'Lo que aceptaste al registrar tu negocio.',
  /** `PATCH /me/account` answers 403 to a business: its name is material and changes through the KYC. */
  nameNote: 'El nombre de tu negocio cambia con una verificación nueva, no desde aquí.',
  nameAction: 'Ver verificación',
  exportTitle: 'Exportar mis datos',
  exportDescription:
    'Prepara un archivo JSON con tu perfil, publicaciones, pedidos, afiliaciones, suscripciones y tu verificación. No trae las fotos públicas.',
  dangerTitle: 'Borrar y cerrar',
} as const;

export const kycErasureCopy = {
  title: 'Borrar mis documentos de verificación',
  description: 'Borra las fotos de tu CI, la selfie, el SEPREC y tus datos cifrados.',
  consequence:
    'Tu negocio queda suspendido: deja de verse en REPP y no puede vender, cobrar ni recibir pedidos hasta que envíes una verificación nueva.',
  kept: 'Conservamos las decisiones de la verificación y sus huellas, sin imágenes ni datos en claro, para prevenir fraudes.',
  start: 'Revisar qué se borra',
  passwordLabel: 'Tu contraseña',
  submit: 'Borrar mis documentos',
  confirmTitle: '¿Borrar tus documentos de verificación?',
  confirmMessage: 'Tu negocio queda suspendido y no podrá operar hasta que envíes una verificación nueva. No se puede deshacer.',
  confirmLabel: 'Borrar y suspender',
  done: 'Borramos tus documentos. Tu negocio está suspendido hasta que envíes una verificación nueva.',
  errors: {
    CURRENT_PASSWORD_INVALID: 'La contraseña no es correcta.',
  },
} as const;

export const businessClosureCopy = {
  title: 'Cerrar mi cuenta de negocio',
  description: 'Cierra tu ficha, tus publicaciones y tu @handle. No se puede deshacer.',
  subtitle: 'Antes de cerrarla, mira qué pasa con tu negocio.',
  effectsTitle: 'Qué pasa al cerrar',
  effects: [
    'Tu ficha deja de verse y tus publicaciones se archivan.',
    'Tu @handle se retira y nadie puede usarlo durante 180 días.',
    'Los pedidos sin pagar se cancelan y avisamos a cada persona.',
    'Las afiliaciones terminan, con aviso a cada socio o entrenador.',
    'Los planes en curso se cancelan. REPP no devuelve dinero: te pagaron directo a ti.',
    'Tus chats quedan de solo lectura para las personas, como constancia.',
  ],
  blockedTitle: 'Antes de cerrar',
  submit: 'Cerrar mi cuenta de negocio',
  confirmTitle: '¿Cerrar tu negocio para siempre?',
  confirmMessage: 'Se cierran tu ficha, tus publicaciones y tu @handle, y se cierra tu sesión. No se puede deshacer.',
  confirmLabel: 'Cerrar mi negocio',
} as const;

/** `BUSINESS_HAS_PENDING_VERIFICATIONS`: QR receipts still waiting for the business (money may have moved). */
export const BUSINESS_PENDING_VERIFICATIONS_CODE = 'BUSINESS_HAS_PENDING_VERIFICATIONS';

export type ClosureBlockerNotice = {
  code: string;
  title: string;
  message: string;
  action: { label: string; web: string; mobile: string } | null;
};

const receipts = (count: number) => (count === 1 ? '1 comprobante de pago' : `${count} comprobantes de pago`);

/** What one blocker of the preview (or of the 409) says, and where it sends the business. */
export function closureBlockerNotice(blocker: { code: string; count?: number | null }): ClosureBlockerNotice {
  if (blocker.code === BUSINESS_PENDING_VERIFICATIONS_CODE) {
    const count = typeof blocker.count === 'number' && blocker.count > 0 ? blocker.count : 1;
    return {
      code: blocker.code,
      title: `Tienes ${receipts(count)} por revisar`,
      message: 'Confírmalos o recházalos en «Pedidos» antes de cerrar: puede que ya te hayan pagado.',
      action: { label: 'Ir a Pedidos', web: businessDestination.web.orders, mobile: businessDestination.mobile.orders },
    };
  }
  return { code: blocker.code, title: 'Todavía no puedes cerrar tu negocio', message: 'Resuelve lo pendiente y vuelve a intentarlo.', action: null };
}

/** The notices of a preview; a server before franja 8f sends no `blockers`. */
export function closureBlockerNotices(preview: { blockers?: ReadonlyArray<{ code: string; count?: number | null }> | null }): ClosureBlockerNotice[] {
  return (preview.blockers ?? []).map(closureBlockerNotice);
}

/** The blocker carried by a refused closure (409), so the screen shows it like the preview does. */
export function closureBlockerFromError(error: unknown): { code: string; count: number | null } | null {
  const shape = (typeof error === 'object' && error !== null ? error : {}) as { code?: unknown; details?: unknown };
  if (shape.code !== BUSINESS_PENDING_VERIFICATIONS_CODE) return null;
  const count = (shape.details as { count?: unknown } | null | undefined)?.count;
  return { code: BUSINESS_PENDING_VERIFICATIONS_CODE, count: typeof count === 'number' ? count : null };
}

/** Where a refused KYC erasure is said: next to the password, or as the form's banner. */
export function kycErasureFailure(error: unknown): { field: 'password' | null; message: string } {
  const shape = (typeof error === 'object' && error !== null ? error : {}) as { code?: unknown; message?: unknown };
  if (shape.code === 'CURRENT_PASSWORD_INVALID') return { field: 'password', message: kycErasureCopy.errors.CURRENT_PASSWORD_INVALID };
  const text = typeof shape.message === 'string' && shape.message.trim() !== '' ? shape.message : 'No pudimos borrar tus documentos. Inténtalo de nuevo.';
  return { field: null, message: text };
}
