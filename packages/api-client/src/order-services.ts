import { z } from 'zod';
import {
  businessOrderDetailSchema,
  businessOrdersPageSchema,
  buyerOrderDetailSchema,
  buyerOrdersPageSchema,
  createOrderInputSchema,
  paymentConfigInputSchema,
  paymentConfigSchema,
  paymentInstructionsSchema,
  rejectOrderInputSchema,
  type CreateOrderInput,
  type OrderStatus,
  type PaymentConfigInput,
  type RejectOrderInput,
} from '@gymsheet/schemas';
import type { UploadFn } from './business-kyc-services';
import type { RequestFn } from './routine-services';

const UPLOAD_TIMEOUT_MS = 60_000;
const reportResultSchema = z.object({ id: z.string(), status: z.string(), contentHidden: z.boolean() });
const id = (value: string) => encodeURIComponent(value);

function pageQuery(filter: { status?: OrderStatus; cursor?: string | null; limit?: number }): string {
  const params = new URLSearchParams({ limit: String(filter.limit ?? 20) });
  if (filter.status) params.set('status', filter.status);
  if (filter.cursor) params.set('cursor', filter.cursor);
  return params.toString();
}

/**
 * The person's orders (ADR-0024): buy a public listing, pay the business by
 * its QR or in cash, send the private receipt, follow the timeline. Persons
 * only: a business account gets 403. The QR and the receipt are private
 * images: each app fetches `paymentQrPath`/`receiptPath` with its own session
 * (web BFF blob, mobile bearer header), never a public URL.
 */
export function createBuyerOrdersServices(request: RequestFn, upload: UploadFn) {
  const order = (orderId: string) => `/directory/payments/orders/${id(orderId)}`;
  return {
    /** `201` with the order and its timeline. */
    create: (input: CreateOrderInput) =>
      request('/directory/payments/orders', buyerOrderDetailSchema, { method: 'POST', body: createOrderInputSchema.parse(input) }),
    list: (filter: { status?: OrderStatus; cursor?: string | null; limit?: number } = {}) =>
      request(`/directory/payments/orders/my-orders?${pageQuery(filter)}`, buyerOrdersPageSchema, { method: 'GET' }),
    get: (orderId: string) => request(order(orderId), buyerOrderDetailSchema, { method: 'GET' }),
    instructions: (orderId: string) => request(`${order(orderId)}/payment-instructions`, paymentInstructionsSchema, { method: 'GET' }),
    /** `form` carries the photo as `file` (JPEG/PNG); the operation number goes as `reference`. */
    uploadReceipt: (orderId: string, form: FormData, reference?: string) => {
      const trimmed = reference?.trim();
      if (trimmed) form.append('reference', trimmed.slice(0, 100));
      return upload(`${order(orderId)}/receipt`, buyerOrderDetailSchema, form, { timeoutMs: UPLOAD_TIMEOUT_MS });
    },
    cancel: (orderId: string) => request(`${order(orderId)}/cancel`, buyerOrderDetailSchema, { method: 'POST' }),
    /** «Tengo un problema con este pedido»: a PAYMENT_ORDER report for REPP (not while PENDING_PAYMENT). */
    report: (orderId: string, reason: string, details?: string) =>
      request('/me/reports', reportResultSchema, {
        method: 'POST',
        body: { targetKind: 'PAYMENT_ORDER', targetId: orderId, reason, ...(details?.trim() ? { details: details.trim() } : {}) },
      }),
    paymentQrPath: (orderId: string) => `${order(orderId)}/payment-qr`,
    receiptPath: (orderId: string) => `${order(orderId)}/receipt`,
  };
}
export type BuyerOrdersServices = ReturnType<typeof createBuyerOrdersServices>;

/**
 * The business's inbox and how it is paid (ADR-0024). NEGOCIO only: persons,
 * MODERATOR and SYSTEM_ADMIN get 403 (REPP never confirms a payment).
 */
export function createBusinessOrdersServices(request: RequestFn, upload: UploadFn) {
  const order = (orderId: string) => `/business/me/orders/${id(orderId)}`;
  return {
    /** «Por confirmar» first (oldest first), then the rest newest first; `pendingCount` feeds the badge. */
    list: (filter: { status?: OrderStatus; cursor?: string | null; limit?: number } = {}) =>
      request(`/business/me/orders?${pageQuery(filter)}`, businessOrdersPageSchema, { method: 'GET' }),
    get: (orderId: string) => request(order(orderId), businessOrderDetailSchema, { method: 'GET' }),
    confirm: (orderId: string) => request(`${order(orderId)}/confirm`, businessOrderDetailSchema, { method: 'POST' }),
    reject: (orderId: string, input: RejectOrderInput) =>
      request(`${order(orderId)}/reject`, businessOrderDetailSchema, { method: 'POST', body: rejectOrderInputSchema.parse(input) }),
    receiptPath: (orderId: string) => `${order(orderId)}/receipt`,

    paymentConfig: () => request('/business/me/payment-config', paymentConfigSchema.nullable(), { method: 'GET' }),
    savePaymentConfig: (input: PaymentConfigInput) =>
      request('/business/me/payment-config', paymentConfigSchema, { method: 'PUT', body: paymentConfigInputSchema.parse(input) }),
    /** `form` carries the QR image as `file`; the data must be saved first (409 PAYMENT_CONFIG_REQUIRED). */
    uploadPaymentQr: (form: FormData) =>
      upload('/business/me/payment-config/qr', paymentConfigSchema, form, { timeoutMs: UPLOAD_TIMEOUT_MS, method: 'PUT' }),
    paymentQrPath: '/business/me/payment-config/qr',
  };
}
export type BusinessOrdersServices = ReturnType<typeof createBusinessOrdersServices>;

/** REPP's door to a receipt: only inside a PAYMENT_ORDER case, audited by the backend. */
export function moderationOrderReceiptPath(orderId: string): string {
  return `/admin/moderation/cases/PAYMENT_ORDER/${id(orderId)}/receipt`;
}
