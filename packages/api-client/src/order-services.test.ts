import { describe, expect, it } from 'vitest';
import { buyerOrderDetailSchema, moderationCaseContentSchema, paymentConfigInputSchema } from '@gymsheet/schemas';
import { createApiClient } from './client';
import { createBusinessOrdersServices, createBuyerOrdersServices, moderationOrderReceiptPath } from './order-services';

const ORDER = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';
const LISTING = '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21';

const base = {
  id: ORDER,
  orderNumber: 'GS-ORD-1-ABCD',
  status: 'PENDING_PAYMENT',
  method: 'QR',
  quantity: 1,
  unitAmount: '250.00',
  amount: '250.00',
  currency: 'BOB',
  listing: { id: LISTING, name: 'Mensual', offerKind: 'MEMBERSHIP', validityDays: 30, sessionsCount: null },
  seller: { entityId: LISTING, name: 'Top', handle: 'top', logoUrl: null },
  expiresAt: '2026-11-18T10:00:00.000Z',
  submittedAt: null,
  decidedAt: null,
  cancelledAt: null,
  cancelReason: null,
  rejection: null,
  receipt: { uploaded: false, reference: null },
  note: null,
  createdAt: '2026-11-17T10:00:00.000Z',
};
const buyer = { ...base, actions: { canUploadReceipt: true, canCancel: true, canReport: false }, timeline: [] };
const business = { ...base, buyer: { name: 'Ana' }, actions: { canDecide: false }, timeline: [] };
const config = {
  bankName: 'Banco Unión',
  accountHolderName: 'Top SRL',
  accountNumber: null,
  aliasOrPhone: null,
  instructions: null,
  acceptsCash: false,
  isActive: true,
  hasQr: true,
  holderMatch: 'PASS',
  updatedAt: '2026-11-17T10:00:00.000Z',
};

type Call = { url: string; method: string; body: unknown };

function recordingClient(answer: (url: string) => unknown) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : init.body instanceof FormData ? { reference: init.body.get('reference') } : undefined;
    calls.push({ url: url.replace('https://api.test', ''), method, body });
    return new Response(JSON.stringify({ ok: true, data: answer(url) }), { status: 200 });
  }) as typeof fetch;
  return { calls, client: createApiClient({ baseUrl: 'https://api.test', fetchImpl }) };
}

describe('order schemas', () => {
  it('parses an order with string amounts and refuses a float amount', () => {
    expect(buyerOrderDetailSchema.parse(buyer).amount).toBe('250.00');
    expect(buyerOrderDetailSchema.safeParse({ ...buyer, amount: 250 }).success).toBe(false);
  });
  it('keeps the payment config input strict: no tax id, no QR URL', () => {
    expect(paymentConfigInputSchema.safeParse({ bankName: 'BNB', accountHolderName: 'Top', taxId: '1' }).success).toBe(false);
    expect(paymentConfigInputSchema.safeParse({ bankName: 'BNB', accountHolderName: 'Top', qrImageUrl: 'https://x' }).success).toBe(false);
  });
  it('parses the PAYMENT_ORDER case content with its receipt path', () => {
    const content = moderationCaseContentSchema.parse({
      kind: 'PAYMENT_ORDER',
      orderNumber: 'GS-ORD-1',
      status: 'PENDING_VERIFICATION',
      method: 'QR',
      quantity: 1,
      unitAmount: '250.00',
      amount: '250.00',
      currency: 'BOB',
      listingName: 'Mensual',
      buyerNote: null,
      receipt: { uploaded: true, sha256: 'ab', reference: '123', attempts: 1, path: moderationOrderReceiptPath(ORDER) },
      rejection: null,
      cancelReason: null,
      createdAt: '2026-11-17T10:00:00.000Z',
      submittedAt: '2026-11-17T11:00:00.000Z',
      decidedAt: null,
      seller: { entityId: LISTING, name: 'Top', handle: 'top', status: 'ACTIVE', isVerified: true, holderMatch: 'PASS' },
      timeline: [{ status: 'PENDING_PAYMENT', at: '2026-11-17T10:00:00.000Z', reasonCode: null }],
    });
    expect(content.kind === 'PAYMENT_ORDER' && content.receipt.path).toBe(`/admin/moderation/cases/PAYMENT_ORDER/${ORDER}/receipt`);
  });
});

describe('createBuyerOrdersServices', () => {
  it('creates with a strict body and never sends a price', async () => {
    const { calls, client } = recordingClient(() => buyer);
    const orders = createBuyerOrdersServices(client.request, client.upload);
    await orders.create({ listingId: LISTING, method: 'QR' });
    expect(calls[0]).toEqual({ url: '/directory/payments/orders', method: 'POST', body: { listingId: LISTING, method: 'QR' } });
    expect(() => orders.create({ listingId: LISTING, amount: '1' } as never)).toThrow();
  });

  it('calls the list, detail, instructions, cancel, receipt and report routes', async () => {
    const { calls, client } = recordingClient((url) => {
      if (url.includes('my-orders')) return { items: [buyer], nextCursor: null };
      if (url.endsWith('/payment-instructions')) return { orderId: ORDER, orderNumber: 'x', method: 'QR', amount: '250.00', currency: 'BOB', expiresAt: null, bankName: 'BNB', accountHolderName: 'Top', accountNumber: null, aliasOrPhone: null, instructions: null, qrPath: `/directory/payments/orders/${ORDER}/payment-qr` };
      if (url.endsWith('/me/reports')) return { id: 'r', status: 'OPEN', contentHidden: false };
      return buyer;
    });
    const orders = createBuyerOrdersServices(client.request, client.upload);
    await orders.list({ cursor: 'abc' });
    await orders.get(ORDER);
    await orders.instructions(ORDER);
    await orders.cancel(ORDER);
    const form = new FormData();
    form.append('file', new Blob(['x'], { type: 'image/png' }), 'c.png');
    await orders.uploadReceipt(ORDER, form, '  OP-123 ');
    await orders.report(ORDER, 'SPAM', ' ');
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /directory/payments/orders/my-orders?limit=20&cursor=abc',
      `GET /directory/payments/orders/${ORDER}`,
      `GET /directory/payments/orders/${ORDER}/payment-instructions`,
      `POST /directory/payments/orders/${ORDER}/cancel`,
      `POST /directory/payments/orders/${ORDER}/receipt`,
      'POST /me/reports',
    ]);
    expect(calls[4]?.body).toMatchObject({ reference: 'OP-123' });
    expect(calls[5]?.body).toEqual({ targetKind: 'PAYMENT_ORDER', targetId: ORDER, reason: 'SPAM' });
    expect(orders.paymentQrPath(ORDER)).toBe(`/directory/payments/orders/${ORDER}/payment-qr`);
  });
});

describe('createBusinessOrdersServices', () => {
  it('calls the inbox, decisions and payment config routes; the QR goes up with PUT', async () => {
    const { calls, client } = recordingClient((url) => {
      if (url.includes('/payment-config')) return config;
      if (url.includes('/business/me/orders?')) return { items: [business], nextCursor: null, pendingCount: 2 };
      return business;
    });
    const orders = createBusinessOrdersServices(client.request, client.upload);
    expect((await orders.list({ status: 'PENDING_VERIFICATION' })).pendingCount).toBe(2);
    await orders.confirm(ORDER);
    await orders.reject(ORDER, { reasonCode: 'AMOUNT_MISMATCH' });
    await orders.savePaymentConfig({ bankName: 'BNB', accountHolderName: 'Top SRL', acceptsCash: true });
    const form = new FormData();
    form.append('file', new Blob(['x'], { type: 'image/png' }), 'qr.png');
    await orders.uploadPaymentQr(form);
    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      'GET /business/me/orders?limit=20&status=PENDING_VERIFICATION',
      `POST /business/me/orders/${ORDER}/confirm`,
      `POST /business/me/orders/${ORDER}/reject`,
      'PUT /business/me/payment-config',
      'PUT /business/me/payment-config/qr',
    ]);
    expect(calls[2]?.body).toEqual({ reasonCode: 'AMOUNT_MISMATCH' });
    expect(() => orders.reject(ORDER, { reasonCode: 'LATE' } as never)).toThrow();
  });
});
