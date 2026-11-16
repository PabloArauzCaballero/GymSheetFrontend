import {
  CONSENT_REQUIRED,
  VERIFICATION_ALREADY_VERIFIED,
  VERIFICATION_CHALLENGE_EXPIRED,
  VERIFICATION_IN_REVIEW,
  VERIFICATION_PHOTOS_CHANGED,
  VERIFICATION_PHOTOS_REQUIRED,
  VERIFICATION_RATE_LIMITED,
  VERIFICATION_STATE_CONFLICT,
  VERIFICATION_UNAVAILABLE,
  type DecideVerificationInput,
  type MyVerification,
  type MyVerificationStatus,
  type VerificationGesture,
  type VerificationQueueItem,
  type VerificationRejectionReason,
} from '@gymsheet/schemas';

/** Copy and pure rules of the person verification (franja 6), shared by web and mobile. */

/** A big glyph plus the instruction: the gesture must read at a glance before the camera opens. */
export const verificationGestureGlyph: Readonly<Record<string, string>> = {
  THUMB_UP: '👍',
  PEACE_SIGN: '✌️',
  HAND_ON_CHIN: '🤔',
  TOUCH_EAR: '👂',
  POINT_UP: '☝️',
  OPEN_PALM: '✋',
  WINK_THUMB: '😉',
  CHIN_UP: '🙂',
};

/** Glyph of a gesture; a neutral one for a code this client does not know yet. */
export function gestureGlyph(gesture: Pick<VerificationGesture, 'code'>): string {
  return verificationGestureGlyph[gesture.code] ?? '🙂';
}

export const verificationCopy = {
  ctaTitle: 'Verifícate para aparecer antes',
  ctaWhy: 'Los perfiles verificados salen antes en Conocer.',
  ctaAction: 'Verificarme',
  ctaDismiss: 'Ahora no',
  pageTitle: 'Verifica tu perfil',
  pageIntro: 'Hazte una selfie con el gesto que te pedimos. Una persona del gimnasio la compara con tus fotos.',
  start: 'Pedir mi gesto',
  gestureTitle: 'Tu gesto',
  countdown: (clock: string) => `Te quedan ${clock}`,
  expiredTitle: 'El gesto caducó',
  expiredBody: 'Pide otro gesto para volver a intentarlo.',
  newChallenge: 'Pedir otro gesto',
  openCamera: 'Abrir cámara',
  takeSelfie: 'Tomar selfie',
  chooseFile: 'Elegir una foto',
  retake: 'Repetir',
  send: 'Enviar selfie',
  previewAlt: 'Tu selfie antes de enviarla',
  privacyNote: 'Solo la ve el equipo que revisa. La borramos 30 días después de decidir.',
  pendingTitle: 'Tu selfie está en revisión',
  pendingBody: 'Te avisaremos cuando la revisemos.',
  approvedTitle: 'Perfil verificado',
  approvedBody: 'Tu perfil muestra la insignia de verificación.',
  rejectedTitle: 'No pudimos verificarte',
  retry: 'Intentar de nuevo',
  revokedTitle: 'Tu verificación ya no vale',
  revokedBody: 'Cambiaste las fotos que comparamos. Verifícate otra vez con las de ahora.',
  noneTitle: 'Perfil sin verificar',
  unavailableTitle: 'Verificación en pausa',
  unavailableBody: 'Ahora no podemos recibir selfies. Vuelve a intentarlo más tarde.',
  consentDeclined: 'Sin tu consentimiento no podemos usar una selfie para verificarte.',
  rateLimited: 'Llegaste al máximo de intentos de hoy. Vuelve más tarde.',
  photosRequired: 'Sube al menos 2 fotos a tu perfil para poder compararlas.',
  goToConocer: 'Ir a Conocer',
} as const;

export type VerificationView = {
  tone: 'neutral' | 'info' | 'success' | 'warning';
  title: string;
  body: string;
  /** The member can request a challenge (or continue an open one) from here. */
  canStart: boolean;
};

/** One status in words, for the status card and the flow page. */
export function verificationView(state: Pick<MyVerification, 'status' | 'lastDecision' | 'canRetryAt'>): VerificationView {
  const capped = Boolean(state.canRetryAt);
  switch (state.status) {
    case 'APPROVED':
      return { tone: 'success', title: verificationCopy.approvedTitle, body: verificationCopy.approvedBody, canStart: false };
    case 'PENDING_REVIEW':
      return { tone: 'info', title: verificationCopy.pendingTitle, body: verificationCopy.pendingBody, canStart: false };
    case 'PENDING_UPLOAD':
      return { tone: 'neutral', title: verificationCopy.ctaTitle, body: verificationCopy.ctaWhy, canStart: true };
    case 'REJECTED':
      return {
        tone: 'warning',
        title: verificationCopy.rejectedTitle,
        body: capped ? verificationCopy.rateLimited : (state.lastDecision?.reasonText ?? verificationCopy.expiredBody),
        canStart: !capped,
      };
    case 'EXPIRED':
      return {
        tone: 'neutral',
        title: verificationCopy.expiredTitle,
        body: capped ? verificationCopy.rateLimited : verificationCopy.expiredBody,
        canStart: !capped,
      };
    case 'REVOKED':
      return { tone: 'warning', title: verificationCopy.revokedTitle, body: verificationCopy.revokedBody, canStart: !capped };
    default:
      return {
        tone: 'neutral',
        title: verificationCopy.noneTitle,
        body: capped ? verificationCopy.rateLimited : verificationCopy.ctaWhy,
        canStart: !capped,
      };
  }
}

/** The CTA shows while there is something to do: never verified, nor in review. Never promises matches. */
export function offersVerificationCta(status: MyVerificationStatus | undefined): boolean {
  return status !== undefined && status !== 'APPROVED' && status !== 'PENDING_REVIEW';
}

/** Whole seconds left before the challenge deadline (never negative). */
export function secondsLeft(expiresAt: string, now: number = Date.now()): number {
  const deadline = Date.parse(expiresAt);
  if (!Number.isFinite(deadline)) return 0;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** `9:05` for a countdown; tabular figures are the caller's job. */
export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

export type VerificationErrorKind =
  | 'consent'
  | 'unavailable'
  | 'expired'
  | 'rateLimited'
  | 'inReview'
  | 'alreadyVerified'
  | 'photosRequired'
  | 'photosChanged'
  | 'stale'
  | 'other';

const ERROR_KINDS: Readonly<Record<string, VerificationErrorKind>> = {
  [CONSENT_REQUIRED]: 'consent',
  [VERIFICATION_UNAVAILABLE]: 'unavailable',
  [VERIFICATION_CHALLENGE_EXPIRED]: 'expired',
  [VERIFICATION_RATE_LIMITED]: 'rateLimited',
  [VERIFICATION_IN_REVIEW]: 'inReview',
  [VERIFICATION_ALREADY_VERIFIED]: 'alreadyVerified',
  [VERIFICATION_PHOTOS_REQUIRED]: 'photosRequired',
  [VERIFICATION_PHOTOS_CHANGED]: 'photosChanged',
  [VERIFICATION_STATE_CONFLICT]: 'stale',
};

/** Which verification failure this is. Duck-typed so this package stays HTTP-free. */
export function verificationErrorKind(error: unknown): VerificationErrorKind {
  const { code, status } = (error ?? {}) as { code?: unknown; status?: unknown };
  if (typeof code === 'string' && ERROR_KINDS[code]) return ERROR_KINDS[code];
  return status === 503 ? 'unavailable' : 'other';
}

/** Calm message for a member-side failure; null means «use the server's own message». */
export function verificationErrorMessage(kind: VerificationErrorKind): string | null {
  switch (kind) {
    case 'consent':
      return verificationCopy.consentDeclined;
    case 'unavailable':
      return verificationCopy.unavailableBody;
    case 'expired':
      return verificationCopy.expiredBody;
    case 'rateLimited':
      return verificationCopy.rateLimited;
    case 'photosRequired':
      return verificationCopy.photosRequired;
    default:
      return null;
  }
}

/** Staff-facing reason labels, in the backend's order. */
export const verificationRejectionLabels: Readonly<Record<VerificationRejectionReason, string>> = {
  FACE_NOT_VISIBLE: 'No se ve bien la cara',
  GESTURE_MISMATCH: 'El gesto no coincide',
  DOES_NOT_MATCH_PHOTOS: 'No coincide con sus fotos',
  MULTIPLE_PEOPLE: 'Aparece más de una persona',
  LOW_QUALITY: 'Borrosa o muy oscura',
  OTHER: 'Otro motivo',
};

export const verificationReviewCopy = {
  title: 'Verificaciones',
  description: 'Compara cada selfie con las fotos del perfil y el gesto pedido. Lo más antiguo primero.',
  emptyTitle: 'No hay selfies por revisar',
  emptyBody: 'Aquí aparecerán las selfies que envíen las personas.',
  pickOne: 'Elige una selfie de la lista para compararla.',
  selfie: 'Selfie',
  photos: 'Fotos del perfil',
  gesture: 'Gesto pedido',
  noSelfie: 'La selfie ya no está disponible.',
  approve: 'Aprobar',
  reject: 'Rechazar',
  reasonLabel: 'Motivo del rechazo',
  approved: 'Verificación aprobada.',
  rejected: 'Verificación rechazada.',
  photosChanged: 'Las fotos cambiaron, vuelve a cargar.',
  reload: 'Volver a cargar',
  alreadyDecided: 'Otra persona ya decidió esta verificación.',
} as const;

/** An approval is bound to exactly the photos the moderator saw. */
export function approveInput(item: Pick<VerificationQueueItem, 'profilePhotos'>): DecideVerificationInput {
  return { decision: 'APPROVE', comparedPhotoIds: item.profilePhotos.map((photo) => photo.id) };
}

export function rejectInput(reason: VerificationRejectionReason): DecideVerificationInput {
  return { decision: 'REJECT', reason };
}
