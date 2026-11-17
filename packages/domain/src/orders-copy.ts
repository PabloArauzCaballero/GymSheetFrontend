import type { OrderRejectionCode, PaymentConfig, PaymentConfigInput } from '@gymsheet/schemas';

/**
 * Words and forms of the orders flows (franja 8d): the business's rejection
 * chips, the buyer's dispute, the errors of the backend in Spanish and the
 * payment config form in steps of at most four fields.
 */

export const orderRejectionLabels: Readonly<Record<OrderRejectionCode, string>> = {
  AMOUNT_MISMATCH: 'El monto no coincide',
  UNREADABLE: 'No se lee',
  NOT_RECEIVED: 'No me llegó',
  OTHER: 'Otro motivo',
};

/** A note is required with OTHER (backend 422 ORDER_REJECTION_NOTE_REQUIRED) and has 3–500 characters. */
export function rejectionNoteError(code: OrderRejectionCode | null, note: string): string | null {
  const text = note.trim();
  if (!code) return 'Elige un motivo.';
  if (code === 'OTHER' && text.length === 0) return 'Explica el motivo para que la persona sepa qué corregir.';
  if (text.length > 0 && text.length < 3) return 'Escribe al menos 3 letras.';
  if (text.length > 500) return 'Máximo 500 caracteres.';
  return null;
}

/** «Tengo un problema con este pedido»: reasons out of the closed moderation taxonomy. */
export const orderDisputeReasons = ['SPAM', 'INFORMACION_ENGANOSA', 'ACOSO', 'OTRO'] as const;
export type OrderDisputeReason = (typeof orderDisputeReasons)[number];
export const orderDisputeReasonLabels: Readonly<Record<OrderDisputeReason, string>> = {
  SPAM: 'Pagué y no responde o no lo entrega',
  INFORMACION_ENGANOSA: 'No es lo que ofrecía',
  ACOSO: 'Me trató mal',
  OTRO: 'Otro problema',
};

export const orderCopy = {
  buy: 'Comprar',
  confirmTitle: 'Confirma tu pedido',
  confirm: 'Confirmar pedido',
  payQr: 'Pagar con QR',
  payQrHint: 'Escaneas el QR del negocio desde tu banco.',
  payCash: 'Pagar en efectivo',
  payCashHint: 'Pagas en el negocio. Solo si lo acepta.',
  paid: 'Ya pagué',
  upload: 'Enviar comprobante',
  resend: 'Volver a subir',
  cancel: 'Cancelar pedido',
  dispute: 'Tengo un problema con este pedido',
  disputeConsequence: 'REPP lo revisa y puede suspender al negocio. REPP no devuelve dinero: pagaste directo al negocio.',
  disputeSent: 'Recibimos tu reporte. REPP lo revisará.',
  doNotPay: 'No pagues: este negocio no está disponible.',
  receiptPrivate: 'Tu comprobante es privado: solo lo ven el negocio y, si reportas un problema, REPP.',
  businessOnly: 'Las cuentas de negocio no compran en el marketplace.',
  signIn: 'Inicia sesión para comprar',
  myOrders: 'Mis compras',
  emptyMine: 'Lo que compres en el marketplace aparece aquí, con su estado.',
  inbox: 'Pedidos',
  pendingSection: 'Por confirmar',
  historySection: 'Historial',
  emptyInbox: 'Cuando alguien compre, su pedido llega aquí para que confirmes el pago.',
  confirmPayment: 'Confirmar pago',
  rejectPayment: 'Rechazar',
  confirmQuestion: '¿Recibiste el pago?',
  confirmBody: 'Confirma solo si el dinero ya está en tu cuenta. La persona recibe el aviso al instante.',
} as const;

const ERRORS: Readonly<Record<string, string>> = {
  ORDER_ALREADY_OPEN: 'Ya tienes un pedido abierto de esta publicación.',
  ORDER_BUSINESS_UNAVAILABLE: orderCopy.doNotPay,
  ORDER_INVALID_TRANSITION: 'El pedido ya cambió. Recarga para verlo.',
  ORDER_REJECTION_NOTE_REQUIRED: 'Explica el motivo para que la persona sepa qué corregir.',
  PAYMENT_CONFIG_REQUIRED: 'Primero guarda los datos de cobro.',
  PAYMENT_EVIDENCE_UNAVAILABLE: 'No podemos guardar imágenes de pago ahora. Vuelve a intentarlo en un rato.',
  BUSINESS_ACCOUNT_LOCKED: 'Tu negocio está suspendido o cerrado: no puedes cambiar el cobro.',
};

function count(details: Readonly<Record<string, unknown>> | null | undefined, key: string): number | null {
  const value = details?.[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Errors of the orders flows, in Spanish; unknown codes fall back to the backend's own message. */
export function orderErrorMessage(code: string | null | undefined, fallback: string, details?: Readonly<Record<string, unknown>> | null): string {
  switch (code) {
    case 'ORDER_OUT_OF_STOCK': {
      const available = count(details, 'available');
      return available && available > 0 ? `Solo quedan ${available}. Pide menos unidades.` : 'Se agotó. Vuelve a mirar más tarde.';
    }
    case 'ORDER_OPEN_LIMIT':
      return `Tienes ${count(details, 'max') ?? 5} pedidos abiertos. Termina o cancela alguno.`;
    case 'ORDER_QUANTITY_NOT_ALLOWED':
      return `Puedes pedir hasta ${count(details, 'max') ?? 1}.`;
    case 'ORDER_RECEIPT_LIMIT':
      return `Ya enviaste ${count(details, 'max') ?? 3} comprobantes. Reporta el problema si el negocio no responde.`;
    case 'ORDER_PAYMENT_METHOD_UNAVAILABLE':
      return details?.method === 'CASH' ? 'Este negocio no recibe efectivo. Elige pagar con QR.' : 'Este negocio no recibe pagos por QR ahora.';
    default:
      return (code && ERRORS[code]) || fallback;
  }
}

export type PaymentConfigForm = {
  bankName: string;
  accountHolderName: string;
  accountNumber: string;
  aliasOrPhone: string;
  instructions: string;
  acceptsCash: boolean;
  isActive: boolean;
};
export type PaymentConfigField = keyof PaymentConfigForm;

/** Step 1 «Cuenta» (4 fields), step 2 «Cómo cobras» (3); the QR image is step 3. */
export const PAYMENT_CONFIG_STEPS: Readonly<Record<1 | 2, readonly PaymentConfigField[]>> = {
  1: ['bankName', 'accountHolderName', 'accountNumber', 'aliasOrPhone'],
  2: ['instructions', 'acceptsCash', 'isActive'],
};

export function paymentConfigFormOf(config: PaymentConfig | null): PaymentConfigForm {
  return {
    bankName: config?.bankName ?? '',
    accountHolderName: config?.accountHolderName ?? '',
    accountNumber: config?.accountNumber ?? '',
    aliasOrPhone: config?.aliasOrPhone ?? '',
    instructions: config?.instructions ?? '',
    acceptsCash: config?.acceptsCash ?? false,
    isActive: config?.isActive ?? true,
  };
}

export function paymentConfigErrors(form: PaymentConfigForm, step: 1 | 2): Partial<Record<PaymentConfigField, string>> {
  const errors: Partial<Record<PaymentConfigField, string>> = {};
  if (step === 1) {
    if (form.bankName.trim().length < 2) errors.bankName = 'Escribe el nombre del banco.';
    if (form.accountHolderName.trim().length < 2) errors.accountHolderName = 'Escribe a nombre de quién está la cuenta.';
    if (form.accountNumber.trim().length > 100) errors.accountNumber = 'Máximo 100 caracteres.';
    if (form.aliasOrPhone.trim().length > 100) errors.aliasOrPhone = 'Máximo 100 caracteres.';
  } else if (form.instructions.trim().length > 2000) {
    errors.instructions = 'Máximo 2000 caracteres.';
  }
  return errors;
}

const optional = (text: string) => (text.trim() ? text.trim() : null);

/** The strict body of `PUT /business/me/payment-config`. */
export function paymentConfigPayload(form: PaymentConfigForm): PaymentConfigInput {
  return {
    bankName: form.bankName.trim(),
    accountHolderName: form.accountHolderName.trim(),
    accountNumber: optional(form.accountNumber),
    aliasOrPhone: optional(form.aliasOrPhone),
    instructions: optional(form.instructions),
    acceptsCash: form.acceptsCash,
    isActive: form.isActive,
  };
}

/** What the holder check means to the business: a WARN never blocks, REPP reviews it. */
export function holderMatchText(match: PaymentConfig['holderMatch']): string | null {
  if (match === 'WARN') return 'El titular no se parece al nombre de tu negocio. Puedes cobrar igual: REPP lo revisará.';
  return null;
}

/** Where the business stands to receive orders, said once on its «Cobro» page. */
export function paymentReadiness(config: PaymentConfig | null): { ready: boolean; text: string } {
  if (!config) return { ready: false, text: 'Configura tu cobro para recibir pedidos.' };
  if (!config.isActive) return { ready: false, text: 'Tu cobro está pausado: nadie puede comprarte ahora.' };
  if (!config.hasQr && !config.acceptsCash) return { ready: false, text: 'Sube tu QR para que puedan pagarte.' };
  return { ready: true, text: config.hasQr ? 'Listo: te pueden pagar con tu QR.' : 'Listo: te pueden pagar en efectivo.' };
}
