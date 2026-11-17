import { describe, expect, it } from 'vitest';
import { accountClosureCopy } from './account-rights';
import {
  businessClosureCopy,
  businessLegalDocuments,
  closureBlockerFromError,
  closureBlockerNotice,
  closureBlockerNotices,
  kycErasureCopy,
  kycErasureFailure,
} from './business-account';
import { timelineEntryText } from './orders';
import { cancelledByBusinessNotice, orderErrorMessage, orderRefusalStopsPayment } from './orders-copy';

describe('closure blockers of a business (ADR-0028)', () => {
  it('says how many receipts wait and sends the business to «Pedidos» on each app', () => {
    const notice = closureBlockerNotice({ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', count: 2 });
    expect(notice.title).toBe('Tienes 2 comprobantes de pago por revisar');
    expect(notice.action).toEqual({ label: 'Ir a Pedidos', web: '/negocio/pedidos', mobile: '/(business)/(tabs)/pedidos' });
    expect(closureBlockerNotice({ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', count: 1 }).title).toBe('Tienes 1 comprobante de pago por revisar');
  });

  it('keeps an unknown blocker generic and without a destination', () => {
    expect(closureBlockerNotice({ code: 'SOMETHING_NEW' })).toMatchObject({ code: 'SOMETHING_NEW', action: null });
  });

  it('reads no blockers from a person, nor from a server before franja 8f', () => {
    expect(closureBlockerNotices({ blockers: [] })).toEqual([]);
    expect(closureBlockerNotices({})).toEqual([]);
    expect(closureBlockerNotices({ blockers: [{ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', count: 3 }] })).toHaveLength(1);
  });

  it('turns the 409 of the closure into the same blocker the preview shows', () => {
    expect(closureBlockerFromError({ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', details: { count: 4, action: 'GET /business/me/orders' } })).toEqual({
      code: 'BUSINESS_HAS_PENDING_VERIFICATIONS',
      count: 4,
    });
    expect(closureBlockerFromError({ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS' })).toEqual({ code: 'BUSINESS_HAS_PENDING_VERIFICATIONS', count: null });
    expect(closureBlockerFromError({ code: 'CURRENT_PASSWORD_INVALID' })).toBeNull();
    expect(closureBlockerFromError(new Error('boom'))).toBeNull();
    expect(accountClosureCopy.errors.BUSINESS_HAS_PENDING_VERIFICATIONS).toMatch(/Pedidos/u);
  });
});

describe('business account copy', () => {
  it('lists the business legal set and says what the closure and the KYC erasure do', () => {
    expect(businessLegalDocuments).toEqual(['BUSINESS_TERMS', 'BUSINESS_DPA', 'PRIVACY']);
    expect(businessClosureCopy.effects.join(' ')).toMatch(/180 días/u);
    expect(businessClosureCopy.effects.join(' ')).toMatch(/REPP no devuelve dinero/u);
    expect(kycErasureCopy.consequence).toMatch(/suspendido/u);
    expect(accountClosureCopy.notAllowed).not.toMatch(/negocio/u);
  });
});

describe('KYC erasure refusals', () => {
  it('puts a wrong password next to the field and anything else in a banner', () => {
    expect(kycErasureFailure({ code: 'CURRENT_PASSWORD_INVALID', message: 'x' })).toEqual({ field: 'password', message: 'La contraseña no es correcta.' });
    expect(kycErasureFailure({ code: 'RATE_LIMITED', message: 'Demasiados intentos.' })).toEqual({ field: null, message: 'Demasiados intentos.' });
    expect(kycErasureFailure(null).message).toMatch(/No pudimos borrar/u);
  });
});

describe('orders refused or cancelled because of the business', () => {
  it('tells the person to wait or write when a new business holds too many open orders', () => {
    expect(orderErrorMessage('ORDER_SELLER_OPEN_LIMIT', 'x')).toMatch(/^Este negocio es nuevo en REPP/u);
  });

  it('stops the payment and the receipt only when the business is not available', () => {
    expect(orderRefusalStopsPayment('ORDER_BUSINESS_UNAVAILABLE')).toBe(true);
    expect(orderRefusalStopsPayment('ORDER_RECEIPT_LIMIT')).toBe(false);
    expect(orderRefusalStopsPayment(undefined)).toBe(false);
  });

  it('explains a cancellation by a closed or unavailable business, and nothing else', () => {
    expect(cancelledByBusinessNotice('BUSINESS_CLOSED')).toMatch(/cerró su cuenta/u);
    expect(cancelledByBusinessNotice('BUSINESS_UNAVAILABLE')).toBe('No pagues: este negocio no está disponible.');
    expect(cancelledByBusinessNotice('BUYER')).toBeNull();
    expect(cancelledByBusinessNotice(null)).toBeNull();
    expect(timelineEntryText({ status: 'CANCELLED', by: 'SYSTEM', reasonCode: 'BUSINESS_CLOSED' }, 'QR')).toBe('Cancelado: el negocio cerró su cuenta');
  });
});
