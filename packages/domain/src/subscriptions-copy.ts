import type { SubscriberFilter, SubscriptionCancelReason, SubscriptionReason, SubscriptionSuspendReason } from '@gymsheet/schemas';
import { affiliationErrorMessage } from './affiliations-copy';
import { orderErrorMessage } from './orders-copy';

/**
 * Words of the subscription flows (franja 8e): «Mis suscripciones», the
 * checkout's «Hazte socio», the confirm checkbox and the business's
 * «Suscriptores». Voice: de tú, short, verb first.
 */

export const subscriptionCopy = {
  mine: 'Mis suscripciones',
  emptyMine: 'Cuando compres una membresía, un pase o un paquete, lo ves aquí con sus días.',
  renew: 'Renovar',
  openOrder: 'Ver el pedido',
  history: 'Historial',
  upcoming: 'Ya renovaste: empieza cuando termine la actual.',
  legacySeller: 'Plan anterior de tu gimnasio',
  // Checkout step 2
  socioTitle: 'Hazte socio',
  socioBody: 'Esta membresía es para socios. El gimnasio confirma tu sede y tus 3 dígitos junto con el pago.',
  socioBack: 'Volver',
  // The business's confirm dialog
  alsoConfirm: 'También confirmo que es socio',
  alsoConfirmHint: 'Compara los 3 dígitos del CI con tu registro antes de confirmarlo.',
  gymNotActive: 'REPP pausó tu gimnasio: puedes confirmar el pago, pero no sumar socios por ahora.',
  confirmPaymentOnly: 'Confirmar solo el pago',
  // «Suscriptores»
  subscribers: 'Suscriptores',
  subscribersBody: 'Quién tiene un plan contigo y cuándo vence.',
  emptySubscribers: 'Cuando confirmes un pago de una membresía, un pase o un paquete, su plan aparece aquí.',
  cancel: 'Cancelar plan',
  suspend: 'Suspender',
  reactivate: 'Reactivar',
  cancelTitle: '¿Por qué cancelas el plan?',
  suspendTitle: '¿Por qué lo suspendes?',
  cancelFinal: 'Cancelar es definitivo. La persona recibe el aviso con el motivo.',
  suspendHint: 'Puedes reactivarlo cuando quieras. La persona recibe el aviso.',
  reactivated: 'Plan reactivado. Le avisamos a la persona.',
  cancelled: 'Plan cancelado. Le avisamos a la persona.',
  suspended: 'Plan suspendido. Le avisamos a la persona.',
} as const;

export const subscriberFilterOptions: ReadonlyArray<{ value: SubscriberFilter | ''; label: string }> = [
  { value: '', label: 'Todos' },
  { value: 'EXPIRING', label: 'Por vencer' },
  { value: 'EXPIRED', label: 'Vencidos' },
  { value: 'ACTIVE', label: 'Activos' },
  { value: 'SUSPENDED', label: 'Suspendidos' },
  { value: 'CANCELLED', label: 'Cancelados' },
];

export const subscriptionReasonLabels: Readonly<Record<SubscriptionReason, string>> = {
  BUYER_REQUEST: 'Lo pidió la persona',
  REFUNDED_BY_BUSINESS: 'Le devolví el pago',
  PAYMENT_ISSUE: 'Problema con el pago',
  HEALTH: 'Salud',
  CONDUCT: 'Convivencia',
  OTHER: 'Otro motivo',
};

export const cancelReasonOrder: readonly SubscriptionCancelReason[] = ['BUYER_REQUEST', 'REFUNDED_BY_BUSINESS', 'PAYMENT_ISSUE', 'CONDUCT', 'OTHER'];
export const suspendReasonOrder: readonly SubscriptionSuspendReason[] = ['BUYER_REQUEST', 'PAYMENT_ISSUE', 'HEALTH', 'CONDUCT', 'OTHER'];

/** Why a period changed, as the person reads it in the history (never who changed it). */
const PERSON_REASON: Readonly<Record<string, string>> = {
  BUYER_REQUEST: 'Lo pediste al negocio.',
  REFUNDED_BY_BUSINESS: 'El negocio te devolvió el pago.',
  PAYMENT_ISSUE: 'El negocio observó el pago.',
  HEALTH: 'Por un tema de salud.',
  CONDUCT: 'Por una cuestión de convivencia.',
  OTHER: 'El negocio dejó una nota.',
};

/** One history row: «Se activó», «Se suspendió · Por un tema de salud.» */
export function historyEntryText(entry: { fromStatus: string | null; toStatus: string; reasonCode: string | null }): string {
  const what =
    entry.toStatus === 'ACTIVE'
      ? entry.fromStatus === 'SUSPENDED'
        ? 'Se reactivó'
        : 'Se activó'
      : entry.toStatus === 'SUSPENDED'
        ? 'Se suspendió'
        : entry.toStatus === 'CANCELLED'
          ? 'Se canceló'
          : entry.toStatus === 'EXPIRED'
            ? 'Venció'
            : 'Cambió de estado';
  const why = entry.reasonCode ? PERSON_REASON[entry.reasonCode] : undefined;
  return why ? `${what} · ${why}` : what;
}

const SUBSCRIPTION_ERRORS: Readonly<Record<string, string>> = {
  SUBSCRIPTION_NOTE_REQUIRED: 'Explica el motivo para que la persona sepa qué pasó.',
  SUBSCRIPTION_INVALID_TRANSITION: 'El plan ya cambió. Recarga para verlo.',
  GYM_NOT_ACTIVE: subscriptionCopy.gymNotActive,
  AFFILIATION_REQUIRED: 'Elige tu sede y escribe los últimos 3 dígitos de tu CI.',
  EMAIL_VERIFICATION_REQUIRED: 'Verifica tu correo para hacerte socio.',
};

const AFFILIATION_CODE = /^(AFFILIATION_|SOCIO_OF_ANOTHER_GYM$)/u;

/** Errors of the checkout and the subscription writes; orders and affiliations keep their own words. */
export function subscriptionErrorMessage(code: string | null | undefined, fallback: string, details?: Readonly<Record<string, unknown>> | null): string {
  if (code && SUBSCRIPTION_ERRORS[code]) return SUBSCRIPTION_ERRORS[code] ?? fallback;
  if (code && AFFILIATION_CODE.test(code)) return affiliationErrorMessage(code, fallback, details);
  return orderErrorMessage(code, fallback, details);
}
