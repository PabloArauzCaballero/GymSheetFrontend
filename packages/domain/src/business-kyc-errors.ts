import { formatDateTime } from './date';

/**
 * Where a refused KYC call is shown and what it says (backend ADR-0021 error
 * codes), on web and mobile. Read structurally, so the domain stays
 * transport-free: anything with `code`, `status` and `details`.
 */
type ErrorShape = { code?: unknown; status?: unknown; details?: unknown };

export type KycFailure = {
  code: string | null;
  message: string;
  /** Form field the message belongs next to (wizard field names, not backend ones). */
  field?: string;
  /** 422 KYC_INCOMPLETE: what still blocks the submit. */
  missing?: string[];
  /** 409 KYC_NOT_EDITABLE / material change: what to do instead. */
  next?: 'wait' | 'resubmit' | 'startChange';
  retryAt?: string;
};

function shapeOf(error: unknown): { code: string | null; status: number | null; details: Record<string, unknown> } {
  const shape = (typeof error === 'object' && error !== null ? error : {}) as ErrorShape;
  return {
    code: typeof shape.code === 'string' ? shape.code : null,
    status: typeof shape.status === 'number' ? shape.status : null,
    details: typeof shape.details === 'object' && shape.details !== null ? (shape.details as Record<string, unknown>) : {},
  };
}

const text = (value: unknown): string | undefined => (typeof value === 'string' && value.length > 0 ? value : undefined);

const FIELD_FORMAT: Readonly<Record<string, string>> = {
  nit: 'Revisa el NIT: solo números, de 7 a 13 dígitos.',
  repCiNumber: 'Revisa el carnet: de 4 a 10 dígitos.',
  repCiComplement: 'El complemento tiene 2 letras o números.',
  repCiExtension: 'Elige dónde se expidió tu carnet.',
  legalName: 'Revisa la razón social.',
  address: 'Revisa la dirección.',
  repFullName: 'Revisa el nombre.',
  specialty: 'Revisa tu especialidad.',
  seprecNumber: 'Revisa la matrícula.',
  tradeName: 'Revisa el nombre comercial.',
};

export const kycGenericFailure = 'No pudimos guardar. Inténtalo de nuevo.';

/** The message (and field) of a refused KYC call; `null` code = not a KYC refusal: use `kycGenericFailure`. */
export function kycFailure(error: unknown): KycFailure {
  const { code, status, details } = shapeOf(error);
  const retryAt = text(details.retryAt);
  const failure = (message: string, extra: Partial<KycFailure> = {}): KycFailure => ({ code, message, ...extra });
  switch (code) {
    case 'PHONE_INVALID':
      return failure('Escribe un celular de Bolivia: 8 dígitos que empiezan con 6 o 7.', { field: 'phone' });
    case 'PHONE_OTP_RATE_LIMITED':
      return failure(
        retryAt ? `Espera un momento: puedes pedir otro código desde las ${formatDateTime(retryAt)}.` : 'Espera un momento antes de pedir otro código.',
        { field: 'phone', ...(retryAt ? { retryAt } : {}) },
      );
    case 'PHONE_OTP_UNAVAILABLE':
      return failure('No pudimos enviarte el código. Inténtalo en unos minutos.');
    case 'PHONE_OTP_INVALID': {
      const left = typeof details.attemptsLeft === 'number' ? details.attemptsLeft : null;
      return failure(left === null ? 'El código no es correcto.' : `El código no es correcto. Te quedan ${left} ${left === 1 ? 'intento' : 'intentos'}.`, { field: 'code' });
    }
    case 'PHONE_OTP_NOT_REQUESTED':
      return failure('Primero pide un código para tu celular.', { field: 'code' });
    case 'PHONE_OTP_EXPIRED':
      return failure('El código venció. Pide uno nuevo.', { field: 'code' });
    case 'PHONE_OTP_EXHAUSTED':
      return failure('Agotaste los intentos. Pide un código nuevo.', { field: 'code' });
    case 'KYC_FIELD_INVALID': {
      const field = text(details.field) ?? 'root';
      if (details.reason === 'NOT_APPLICABLE') return failure('Ese dato no corresponde a tu tipo de negocio.', { field });
      if (details.reason === 'INCOMPLETE') return failure('Escribe el número de carnet completo.', { field: 'repCiNumber' });
      return failure(FIELD_FORMAT[field] ?? 'Revisa el formato de ese dato.', { field });
    }
    case 'BUSINESS_NAME_INVALID':
      return failure('Ese nombre no se puede usar. Prueba con otro.', { field: 'tradeName' });
    case 'BUSINESS_NAME_RESERVED':
      return failure('Ese nombre está reservado. Prueba con otro.', { field: 'tradeName' });
    case 'BUSINESS_NAME_TOO_SIMILAR':
      return failure('Se parece demasiado al de otro negocio. Prueba con otro.', { field: 'tradeName' });
    case 'KYC_NOT_EDITABLE':
      if (details.action === 'RESUBMIT') return failure('Tu solicitud fue rechazada. Corrígela desde «Verificación».', { next: 'resubmit' });
      if (details.action === 'CHANGE') return failure('Tu negocio ya está verificado. Para cambiar datos, pide un cambio.', { next: 'startChange' });
      return failure('Tu solicitud ya está en revisión. Te avisamos cuando haya novedades.', { next: 'wait' });
    case 'BUSINESS_MATERIAL_CHANGE_REQUIRES_REVIEW':
      return failure('Cambiar el nombre o la categoría lo revisa REPP. Pide el cambio desde «Verificación».', { next: 'startChange' });
    case 'CONSENT_REQUIRED':
      return failure('Acepta el uso de tu selfie para seguir.', { field: 'consent' });
    case 'CONSENT_VERSION_OUTDATED':
      return failure('El texto del consentimiento cambió. Léelo de nuevo para aceptarlo.', { field: 'consent' });
    case 'KYC_SELFIE_CHALLENGE_REQUIRED':
      return failure('Primero pide tu gesto.', { field: 'SELFIE' });
    case 'KYC_SELFIE_CHALLENGE_EXPIRED':
      return failure('El gesto venció. Pide otro y toma la selfie.', { field: 'SELFIE' });
    case 'KYC_DOCUMENT_UNSUPPORTED':
      return failure(status === 413 ? 'La foto pesa más de 8 MB. Toma otra.' : 'Usa una foto JPG o PNG (HEIC no sirve).');
    case 'KYC_INCOMPLETE': {
      const missing = Array.isArray(details.missing) ? details.missing.filter((item): item is string => typeof item === 'string') : [];
      return failure('Te falta completar algo. Te llevamos ahí.', { missing });
    }
    case 'KYC_RESUBMIT_COOLDOWN':
      return failure(retryAt ? `Podrás volver a enviarla desde el ${formatDateTime(retryAt)}.` : 'Todavía no puedes volver a enviarla.', {
        ...(retryAt ? { retryAt } : {}),
      });
    case 'KYC_RESUBMIT_NOT_ALLOWED':
      return failure(details.reason === 'MAX_ATTEMPTS' ? 'Ya usaste los 3 intentos. Escríbenos a soporte.' : 'Esta solicitud no se puede volver a enviar.');
    case 'KYC_CHANGE_NOT_ALLOWED':
      return failure('Solo un negocio verificado puede pedir un cambio de datos.');
    case 'BUSINESS_ACCOUNT_LOCKED':
      return failure('Tu negocio está suspendido o cerrado: no se puede editar.');
    case 'KYC_UNAVAILABLE':
      return failure('La verificación no está disponible ahora. Inténtalo más tarde.');
    default:
      if (status === 413) return failure('La foto pesa más de 8 MB. Toma otra.');
      if (status === 429) return failure('Hiciste demasiados intentos. Espera un momento.');
      return { code: null, message: kycGenericFailure };
  }
}
