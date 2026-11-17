import { describe, expect, it } from 'vitest';
import { isNoStoreBackendPath, isOrderUploadPath, resolveAllowedBackendPath } from './backend-route-policy';

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';

const allowedCases: Array<[string[], string]> = [
  // The person's orders, the business's inbox and payment config, and REPP's case evidence.
  [['directory', 'payments', 'orders'], '/directory/payments/orders'],
  [['directory', 'payments', 'orders', id], `/directory/payments/orders/${id}`],
  [['directory', 'payments', 'orders', id, 'payment-instructions'], `/directory/payments/orders/${id}/payment-instructions`],
  [['directory', 'payments', 'orders', id, 'payment-qr'], `/directory/payments/orders/${id}/payment-qr`],
  [['directory', 'payments', 'orders', id, 'receipt'], `/directory/payments/orders/${id}/receipt`],
  [['directory', 'payments', 'orders', id, 'cancel'], `/directory/payments/orders/${id}/cancel`],
  [['business', 'me', 'orders'], '/business/me/orders'],
  [['business', 'me', 'orders', id], `/business/me/orders/${id}`],
  [['business', 'me', 'orders', id, 'receipt'], `/business/me/orders/${id}/receipt`],
  [['business', 'me', 'orders', id, 'confirm'], `/business/me/orders/${id}/confirm`],
  [['business', 'me', 'orders', id, 'reject'], `/business/me/orders/${id}/reject`],
  [['business', 'me', 'payment-config'], '/business/me/payment-config'],
  [['business', 'me', 'payment-config', 'qr'], '/business/me/payment-config/qr'],
  [['admin', 'moderation', 'cases', 'PAYMENT_ORDER', id], `/admin/moderation/cases/PAYMENT_ORDER/${id}`],
  [['admin', 'moderation', 'cases', 'PAYMENT_ORDER', id, 'receipt'], `/admin/moderation/cases/PAYMENT_ORDER/${id}/receipt`],
];

const blockedCases: Array<[string[]]> = [
  // the public payment config is gone (D5), orders are addressed by UUID, the verbs are exact,
  // and the old `admin/directory/*` console no longer exists (D9).
  [['public', 'directory', 'entities', id, 'payment-config']],
  [['directory', 'payments', 'orders', 'not-a-uuid', 'receipt']],
  [['directory', 'payments', 'orders', id, 'confirm']],
  [['business', 'me', 'orders', id, 'refund']],
  [['admin', 'directory', 'orders', id, 'confirm']],
  [['admin', 'moderation', 'cases', 'BUSINESS_LISTING', id, 'receipt']],
];

describe('backend route policy for the orders (franja 8d, ADR-0024)', () => {
  it.each(allowedCases)('allows a verified route', (parts, expected) => {
    expect(resolveAllowedBackendPath(parts)).toBe(expected);
  });

  it.each(blockedCases)('blocks an unapproved route', (parts) => {
    expect(resolveAllowedBackendPath(parts)).toBeNull();
  });

  it('gives the receipt and the QR upload the long timeout of the other media', () => {
    expect(isOrderUploadPath(`/directory/payments/orders/${id}/receipt`)).toBe(true);
    expect(isOrderUploadPath('/business/me/payment-config/qr')).toBe(true);
    expect(isOrderUploadPath('/business/me/payment-config')).toBe(false);
  });

  it('marks the payment data, QR and receipts of the orders as never cacheable (franja 8d)', () => {
    expect(isNoStoreBackendPath(`/directory/payments/orders/${id}/payment-qr`)).toBe(true);
    expect(isNoStoreBackendPath(`/directory/payments/orders/${id}/payment-instructions`)).toBe(true);
    expect(isNoStoreBackendPath(`/business/me/orders/${id}/receipt`)).toBe(true);
    expect(isNoStoreBackendPath('/business/me/payment-config/qr')).toBe(true);
    expect(isNoStoreBackendPath(`/admin/moderation/cases/PAYMENT_ORDER/${id}/receipt`)).toBe(true);
    expect(isNoStoreBackendPath('/business/me/listings')).toBe(false);
  });
});
