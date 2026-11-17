import type { BusinessSuspensionReasonCode, KycDecideInput, KycQueue, KycRejectionReasonCode } from '@gymsheet/schemas';

/**
 * REPP's KYC console (plan §2.7, backend ADR-0021): labels and copy. The
 * backend decides and audits; this only words what it answers.
 */

export const kycQueueLabels: Readonly<Record<KycQueue, string>> = {
  REVIEW: 'Por revisar',
  POST_REVIEW: 'Revisión posterior',
};

/** Automatic checks, as a reviewer reads them. Moderators may see every one, blocklist included. */
export const kycCheckLabels: Readonly<Record<string, string>> = {
  PHONE_VERIFIED: 'Teléfono verificado',
  DOCUMENTS_READABLE: 'Fotos legibles',
  DUPLICATE_NIT: 'NIT sin duplicar',
  DUPLICATE_CI: 'Carnet sin duplicar',
  DUPLICATE_PHONE: 'Teléfono sin duplicar',
  DUPLICATE_EMAIL: 'Correo sin duplicar',
  NAME_SIMILARITY: 'Nombre distinto a otros',
  ANTIBOT_RISK: 'Riesgo del alta',
  BLOCKLIST: 'Lista negra',
  CLOSED_ACCOUNT_SANCTION: 'Sanción de cuenta cerrada',
  BANNED_TERMS: 'Términos prohibidos',
  MATERIAL_CHANGE: 'Cambio de datos',
  IMAGE_MODERATION: 'Moderación de imagen',
};

export function kycCheckLabel(code: string): string {
  return kycCheckLabels[code] ?? code.replace(/_/g, ' ').toLowerCase();
}

export type KycCheckTone = 'success' | 'warning' | 'danger' | 'neutral';
export function kycCheckTone(outcome: string): KycCheckTone {
  if (outcome === 'PASS') return 'success';
  if (outcome === 'WARN') return 'warning';
  if (outcome === 'FAIL') return 'danger';
  return 'neutral';
}
export const kycCheckOutcomeLabels: Readonly<Record<string, string>> = { PASS: 'Pasa', WARN: 'Aviso', FAIL: 'Falla', ERROR: 'Error' };

/** The reasons REPP picks; the business reads the backend's own text for each. */
export const kycRejectionLabels: Readonly<Record<KycRejectionReasonCode, string>> = {
  DOCUMENT_UNREADABLE: 'Documento ilegible',
  DOCUMENT_MISMATCH: 'Datos no coinciden con el documento',
  SELFIE_MISMATCH: 'Selfie no coincide con el carnet',
  GESTURE_MISMATCH: 'Gesto equivocado',
  NIT_INVALID: 'NIT no válido',
  LEGAL_NAME_MISMATCH: 'Razón social no coincide',
  IMPERSONATION: 'Suplantación',
  DUPLICATE_ACCOUNT: 'Cuenta duplicada',
  PROHIBITED_ACTIVITY: 'Actividad prohibida',
  FRAUD_SUSPECTED: 'Sospecha de fraude',
  OTHER: 'Otro motivo',
};

export const businessSuspensionLabels: Readonly<Record<BusinessSuspensionReasonCode, string>> = {
  FRAUD_SUSPECTED: 'Sospecha de fraude',
  IMPERSONATION: 'Suplantación',
  PAYMENT_COMPLAINTS: 'Denuncias por cobros',
  PROHIBITED_ACTIVITY: 'Actividad prohibida',
  KYC_MISSING: 'Faltan datos de verificación',
  OTHER: 'Otro motivo',
};

export const kycStatusLabels: Readonly<Record<string, string>> = {
  DRAFT: 'Borrador',
  SUBMITTED: 'Enviada',
  AUTO_APPROVED: 'Aprobada automáticamente',
  IN_REVIEW: 'En revisión',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  SUSPENDED: 'Suspendida',
  SUPERSEDED: 'Reemplazada',
};

export const kycDocumentKindLabels: Readonly<Record<string, string>> = {
  CI_FRONT: 'Carnet, anverso',
  CI_BACK: 'Carnet, reverso',
  SELFIE: 'Selfie',
  SEPREC: 'SEPREC',
};

export const kycPurposeLabels: Readonly<Record<string, string>> = {
  INITIAL: 'Alta',
  RESUBMISSION: 'Reenvío',
  MATERIAL_CHANGE: 'Cambio de datos',
};

/** The decision this submission can take: an automatic approval closes its post-review instead of approving again. */
export function approveDecision(status: string): KycDecideInput['decision'] {
  return status === 'AUTO_APPROVED' ? 'POST_REVIEW_OK' : 'APPROVE';
}

export function rejectInputOf(reasons: readonly KycRejectionReasonCode[], allowResubmit: boolean, note: string): KycDecideInput {
  const trimmed = note.trim();
  return { decision: 'REJECT', reasonCodes: [...reasons], allowResubmit, ...(trimmed ? { note: trimmed } : {}) };
}

export const kycReviewCopy = {
  title: 'Negocios',
  description: 'Verificación de negocios: lo vencido primero. Ver el detalle y cada documento queda en la auditoría.',
  accountsTitle: 'Cuentas de negocio',
  emptyTitle: 'Nada por revisar',
  emptyBody: 'Cuando un negocio quede en revisión, aparece aquí.',
  pickOne: 'Elige una solicitud de la lista.',
  overdueOnly: 'Solo vencidas',
  overdue: 'Vencida',
  dueAt: (when: string) => `Vence ${when}`,
  claim: 'Tomar',
  release: 'Soltar',
  claimedByYou: 'La tienes tomada tú',
  claimedByOther: 'La tiene tomada otra persona de REPP',
  approve: 'Aprobar',
  postReviewOk: 'Confirmar revisión',
  reject: 'Rechazar',
  reasonsLegend: 'Motivos del rechazo',
  note: 'Nota interna (opcional)',
  allowResubmit: 'Puede corregir y volver a enviarla',
  approved: 'Negocio aprobado: ya lleva «Verificado por REPP».',
  rejected: 'Solicitud rechazada. Avisamos al negocio.',
  superseded: 'Esta versión ya no es la vigente. Recargamos la cola.',
  locked: 'La cuenta está suspendida o cerrada: no se puede decidir.',
  claimedElsewhere: 'Otra persona de REPP la tomó. Recargamos la cola.',
  selfCase: 'No puedes revisar tu propio negocio.',
  identity: 'Identidad (en claro, auditado)',
  checks: 'Comprobaciones automáticas',
  documents: 'Documentos',
  documentFailed: 'No pudimos abrir el documento.',
  documentDeleted: 'Borrado',
  history: 'Historial',
  phoneVerified: 'verificado',
  phoneUnverified: 'sin verificar',
  search: 'Buscar por nombre, correo o @usuario',
  suspend: 'Suspender',
  reinstate: 'Reactivar',
  suspensionReason: 'Motivo',
  suspended: 'Cuenta suspendida.',
  reinstated: 'Cuenta reactivada.',
  noAccounts: 'No hay cuentas con ese filtro.',
  noAccountsBody: 'Prueba con otro nombre, correo o @usuario.',
} as const;

/** What a refused console action tells the reviewer, by code; null = show the generic error. */
export function kycReviewRefusal(code: string | undefined): string | null {
  switch (code) {
    case 'KYC_SUBMISSION_SUPERSEDED':
    case 'KYC_INVALID_TRANSITION':
      return kycReviewCopy.superseded;
    case 'BUSINESS_ACCOUNT_LOCKED':
      return kycReviewCopy.locked;
    case 'KYC_CLAIMED_BY_OTHER':
      return kycReviewCopy.claimedElsewhere;
    case 'MODERATION_SELF_CASE':
      return kycReviewCopy.selfCase;
    default:
      return null;
  }
}
