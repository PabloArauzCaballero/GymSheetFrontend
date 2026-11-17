import { describe, expect, it } from 'vitest';
import {
  buyerNextStep,
  buyerOrderChip,
  buyerOrderSteps,
  businessOrderChip,
  formatMoney,
  maxOrderQuantity,
  multiplyMoney,
  orderDeadline,
  orderItemLine,
  timelineEntryText,
} from './orders';
import {
  holderMatchText,
  orderErrorMessage,
  paymentConfigErrors,
  paymentConfigFormOf,
  paymentConfigPayload,
  paymentReadiness,
  rejectionNoteError,
} from './orders-copy';

const qr = { method: 'QR' as const, receipt: { uploaded: false } };
const NOW = Date.parse('2026-11-17T12:00:00.000Z');

describe('formatMoney', () => {
  it('formats the server string with two decimals and Bs, without float math', () => {
    expect(formatMoney('250.00', 'BOB')).toBe('Bs 250,00');
    expect(formatMoney('1234.5', 'BOB')).toBe('Bs 1.234,50');
    expect(formatMoney('0.1', 'BOB')).toBe('Bs 0,10');
    expect(formatMoney('9007199254740993.99', 'BOB')).toBe('Bs 9.007.199.254.740.993,99');
    expect(formatMoney('15', 'USD')).toBe('USD 15,00');
  });
  it('multiplies in whole cents', () => {
    expect(multiplyMoney('0.10', 3)).toBe('0.30');
    expect(multiplyMoney('199.99', 20)).toBe('3999.80');
  });
});

describe('quantity', () => {
  it('lets only a product take several units', () => {
    expect(maxOrderQuantity('PRODUCT')).toBe(20);
    expect(maxOrderQuantity('MEMBERSHIP')).toBe(1);
    expect(orderItemLine({ listing: { name: 'Whey' }, quantity: 2 })).toBe('Whey · 2 unidades');
  });
});

describe('buyer track', () => {
  it('walks Pendiente de pago → En verificación por el negocio → Confirmado', () => {
    expect(buyerOrderSteps({ ...qr, status: 'PENDING_PAYMENT' }).map((step) => step.state)).toEqual(['current', 'upcoming', 'upcoming']);
    expect(buyerOrderSteps({ ...qr, status: 'PENDING_VERIFICATION' }).map((step) => [step.label, step.state])).toEqual([
      ['Pendiente de pago', 'done'],
      ['En verificación por el negocio', 'current'],
      ['Confirmado', 'upcoming'],
    ]);
    expect(buyerOrderSteps({ ...qr, status: 'CONFIRMED' }).every((step) => step.state === 'done')).toBe(true);
  });

  it('stops a rejected order at the verification and an expired one at the payment', () => {
    expect(buyerOrderSteps({ ...qr, status: 'REJECTED' })[1]).toEqual({ key: 'verification', label: 'Rechazado', state: 'stopped' });
    expect(buyerOrderSteps({ ...qr, status: 'EXPIRED' })[0]).toEqual({ key: 'payment', label: 'Vencido', state: 'stopped' });
    expect(buyerOrderSteps({ method: 'CASH', status: 'CANCELLED' })[1]?.label).toBe('Cancelado');
  });

  it('says cash its own way', () => {
    expect(buyerOrderSteps({ method: 'CASH', status: 'PENDING_VERIFICATION' })[1]).toEqual({ key: 'verification', label: 'Paga en efectivo en el negocio', state: 'current' });
    expect(buyerOrderChip({ method: 'CASH', status: 'PENDING_VERIFICATION' }).label).toBe('Paga en el negocio');
  });

  it('offers paying, resending, waiting or nothing', () => {
    const can = { canUploadReceipt: true };
    expect(buyerNextStep({ ...qr, status: 'PENDING_PAYMENT', actions: can })).toBe('pay');
    expect(buyerNextStep({ ...qr, status: 'REJECTED', actions: can })).toBe('resend');
    expect(buyerNextStep({ ...qr, status: 'REJECTED', actions: { canUploadReceipt: false } })).toBe('closed');
    expect(buyerNextStep({ ...qr, status: 'PENDING_VERIFICATION', actions: { canUploadReceipt: false } })).toBe('wait');
    expect(buyerNextStep({ method: 'CASH', status: 'PENDING_VERIFICATION', actions: { canUploadReceipt: false } })).toBe('cash');
    expect(buyerNextStep({ ...qr, status: 'CONFIRMED', actions: { canUploadReceipt: false } })).toBe('done');
  });
});

describe('chips and history', () => {
  it('tells the business what it has to do', () => {
    expect(businessOrderChip({ ...qr, status: 'PENDING_VERIFICATION' })).toEqual({ label: 'Por confirmar', tone: 'warning' });
    expect(businessOrderChip({ ...qr, status: 'CONFIRMED' }).tone).toBe('success');
  });
  it('names every change of the timeline', () => {
    expect(timelineEntryText({ status: 'PENDING_VERIFICATION', by: 'BUYER', reasonCode: null }, 'QR')).toBe('Comprobante enviado');
    expect(timelineEntryText({ status: 'CANCELLED', by: 'SYSTEM', reasonCode: 'BUSINESS_UNAVAILABLE' }, 'QR')).toMatch(/no está disponible/u);
    expect(timelineEntryText({ status: 'CANCELLED', by: 'BUYER', reasonCode: 'BUYER' }, 'QR')).toBe('Cancelaste el pedido');
  });
});

describe('deadline badge', () => {
  it('counts down an unpaid order and up a receipt waiting for the business', () => {
    expect(orderDeadline({ status: 'PENDING_PAYMENT', expiresAt: '2026-11-17T15:00:00.000Z', submittedAt: null }, NOW)).toEqual({ label: 'Vence en 3 h', tone: 'warning' });
    expect(orderDeadline({ status: 'PENDING_VERIFICATION', expiresAt: '2026-11-20T12:00:00.000Z', submittedAt: null }, NOW)?.label).toBe('Vence en 3 días');
    expect(orderDeadline({ status: 'PENDING_VERIFICATION', expiresAt: null, submittedAt: '2026-11-17T10:00:00.000Z' }, NOW)).toEqual({ label: 'Espera hace 2 h', tone: 'neutral' });
    expect(orderDeadline({ status: 'PENDING_VERIFICATION', expiresAt: null, submittedAt: '2026-11-16T10:00:00.000Z' }, NOW)?.tone).toBe('warning');
    expect(orderDeadline({ status: 'PENDING_VERIFICATION', expiresAt: null, submittedAt: '2026-11-15T10:00:00.000Z' }, NOW)?.tone).toBe('danger');
    expect(orderDeadline({ status: 'CONFIRMED', expiresAt: null, submittedAt: null }, NOW)).toBeNull();
  });
});

describe('errors and the rejection note', () => {
  it('says each backend code in Spanish with its details', () => {
    expect(orderErrorMessage('ORDER_OUT_OF_STOCK', 'x', { available: 2 })).toBe('Solo quedan 2. Pide menos unidades.');
    expect(orderErrorMessage('ORDER_OUT_OF_STOCK', 'x', { available: 0 })).toMatch(/Se agotó/u);
    expect(orderErrorMessage('ORDER_PAYMENT_METHOD_UNAVAILABLE', 'x', { method: 'CASH' })).toMatch(/no recibe efectivo/u);
    expect(orderErrorMessage('ORDER_BUSINESS_UNAVAILABLE', 'x')).toBe('No pagues: este negocio no está disponible.');
    expect(orderErrorMessage('ORDER_OPEN_LIMIT', 'x', { max: 5 })).toMatch(/5 pedidos/u);
    expect(orderErrorMessage('UNKNOWN', 'Del servidor')).toBe('Del servidor');
  });
  it('requires a note with OTHER only', () => {
    expect(rejectionNoteError('AMOUNT_MISMATCH', '')).toBeNull();
    expect(rejectionNoteError('OTHER', ' ')).toMatch(/Explica/u);
    expect(rejectionNoteError('OTHER', 'ok')).toMatch(/3 letras/u);
    expect(rejectionNoteError(null, '')).toBe('Elige un motivo.');
  });
});

describe('payment config form', () => {
  it('validates step 1 and sends a strict body with nulls for empty fields', () => {
    const form = paymentConfigFormOf(null);
    expect(Object.keys(paymentConfigErrors(form, 1))).toEqual(['bankName', 'accountHolderName']);
    expect(paymentConfigPayload({ ...form, bankName: ' BNB ', accountHolderName: 'Top SRL', acceptsCash: true })).toEqual({
      bankName: 'BNB',
      accountHolderName: 'Top SRL',
      accountNumber: null,
      aliasOrPhone: null,
      instructions: null,
      acceptsCash: true,
      isActive: true,
    });
  });
  it('says where the business stands to be paid', () => {
    const config = { bankName: 'BNB', accountHolderName: 'Top', accountNumber: null, aliasOrPhone: null, instructions: null, acceptsCash: false, isActive: true, hasQr: false, holderMatch: 'WARN' as const, updatedAt: '' };
    expect(paymentReadiness(null).ready).toBe(false);
    expect(paymentReadiness(config).text).toMatch(/Sube tu QR/u);
    expect(paymentReadiness({ ...config, hasQr: true }).ready).toBe(true);
    expect(holderMatchText('WARN')).toMatch(/REPP lo revisará/u);
    expect(holderMatchText('PASS')).toBeNull();
  });
});
