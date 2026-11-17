import { ApiError } from '@gymsheet/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusinessOrderDetail, BuyerOrderDetail, PublicListing } from '@/shared/api/schemas';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { OrderDecision } from './business/order-decision';
import { CheckoutForm } from './checkout-form';
import { OrderDetail } from './order-detail';
import { ReceiptUpload } from './receipt-upload';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  get: vi.fn(),
  instructions: vi.fn(),
  reject: vi.fn(),
  confirm: vi.fn(),
  push: vi.fn(),
  uploadReceipt: vi.fn(),
}));
vi.mock('../services/orders-client', async (original) => ({
  ...(await original<typeof import('../services/orders-client')>()),
  buyerOrdersService: { create: mocks.create, get: mocks.get, instructions: mocks.instructions, uploadReceipt: mocks.uploadReceipt, paymentQrPath: () => '/qr' },
  businessOrdersService: { reject: mocks.reject, confirm: mocks.confirm },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));

const ID = '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11';
const listing = {
  id: ID,
  offerKind: 'PRODUCT',
  name: 'Whey 2 kg',
  price: '199.50',
  currency: 'BOB',
  inStock: true,
  seller: { id: ID, name: 'Tienda Top', handle: 'top', entityType: 'STORE', logoUrl: null, city: null, badge: 'NEW' },
} as unknown as PublicListing;

const order: BuyerOrderDetail = {
  id: ID,
  orderNumber: 'GS-ORD-1',
  status: 'REJECTED',
  method: 'QR',
  quantity: 1,
  unitAmount: '250.00',
  amount: '250.00',
  currency: 'BOB',
  listing: { id: ID, name: 'Mensual', offerKind: 'MEMBERSHIP', validityDays: 30, sessionsCount: null },
  seller: { entityId: ID, name: 'Top', handle: 'top', logoUrl: null },
  expiresAt: null,
  submittedAt: '2026-11-17T10:00:00.000Z',
  decidedAt: '2026-11-17T11:00:00.000Z',
  cancelledAt: null,
  cancelReason: null,
  rejection: { code: 'AMOUNT_MISMATCH', text: 'El monto del comprobante no coincide con el pedido.', note: null },
  receipt: { uploaded: true, reference: null },
  note: null,
  createdAt: '2026-11-17T09:00:00.000Z',
  actions: { canUploadReceipt: true, canCancel: true, canReport: true },
  timeline: [],
};

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

function inDialog(node: ReactNode) {
  return (
    <Dialog open>
      <DialogContent title="Confirma tu pedido">{node}</DialogContent>
    </Dialog>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('checkout', () => {
  it('sends listing, units and method only (never a price) and opens the order', async () => {
    mocks.create.mockResolvedValue({ ...order, id: 'new-order', status: 'PENDING_VERIFICATION', method: 'CASH' });
    wrap(inDialog(<CheckoutForm listing={listing} />));
    fireEvent.click(screen.getByRole('button', { name: 'Una más' }));
    expect(screen.getByText('Bs 399,00')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /Pagar en efectivo/u }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/profile/compras/new-order'));
    expect(mocks.create).toHaveBeenCalledWith({ listingId: ID, method: 'CASH', quantity: 2 });
  });

  it('offers the open order instead of a second one', async () => {
    mocks.create.mockRejectedValue(new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'ORDER_ALREADY_OPEN', details: { orderId: 'open-1' } }));
    wrap(inDialog(<CheckoutForm listing={{ ...listing, offerKind: 'MEMBERSHIP' } as PublicListing} />));
    expect(screen.queryByRole('button', { name: 'Una más' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText('Ya tienes un pedido abierto de esta publicación.')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Abrir tu pedido' }).getAttribute('href')).toBe('/profile/compras/open-1');
  });
});

describe('order detail', () => {
  it('shows the rejection reason and «Volver a subir» opens the payment data and the receipt', async () => {
    mocks.get.mockResolvedValue(order);
    mocks.instructions.mockResolvedValue({ orderId: ID, orderNumber: 'GS-ORD-1', method: 'QR', amount: '250.00', currency: 'BOB', expiresAt: null, bankName: 'BNB', accountHolderName: 'Top SRL', accountNumber: null, aliasOrPhone: null, instructions: null, qrPath: null });
    wrap(<OrderDetail orderId={ID} />);
    expect(await screen.findByText('El monto del comprobante no coincide con el pedido.')).toBeTruthy();
    expect(screen.getByText('Rechazado', { selector: 'span.text-\\[17px\\]' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a subir' }));
    expect(await screen.findByText('BNB')).toBeTruthy();
    expect(screen.getByLabelText('Foto del comprobante')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Tengo un problema con este pedido' })).toBeTruthy();
  });

  it('tells the person not to pay when the business is no longer public', async () => {
    mocks.get.mockResolvedValue({ ...order, status: 'PENDING_PAYMENT', rejection: null, receipt: { uploaded: false, reference: null }, actions: { canUploadReceipt: true, canCancel: true, canReport: false } });
    mocks.instructions.mockRejectedValue(new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'ORDER_BUSINESS_UNAVAILABLE' }));
    wrap(<OrderDetail orderId={ID} />);
    expect(await screen.findByText('No pagues: este negocio no está disponible.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tengo un problema con este pedido' })).toBeNull();
  });
});

describe('business decision', () => {
  const pending = { ...order, status: 'PENDING_VERIFICATION', rejection: null, buyer: { name: 'Ana' }, actions: { canDecide: true } } as unknown as BusinessOrderDetail;

  it('asks a note with «Otro motivo» and sends the reason chip', async () => {
    mocks.reject.mockResolvedValue({ ...pending, status: 'REJECTED', actions: { canDecide: false } });
    wrap(<OrderDecision order={pending} />);
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Otro motivo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar pago' }));
    expect(await screen.findByText('Explica el motivo para que la persona sepa qué corregir.')).toBeTruthy();
    expect(mocks.reject).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'El monto no coincide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar pago' }));
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith(ID, { reasonCode: 'AMOUNT_MISMATCH' }));
  });
});

describe('refusals caused by the business (ADR-0028)', () => {
  const conflict = (code: string, message = 'x') => new ApiError({ message, status: 409, kind: 'conflict', code });

  it('tells the person a new business has too many orders to confirm', async () => {
    mocks.create.mockRejectedValue(conflict('ORDER_SELLER_OPEN_LIMIT'));
    wrap(inDialog(<CheckoutForm listing={listing} />));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText(/^Este negocio es nuevo en REPP/u)).toBeTruthy();
  });

  it('ends the receipt step in «No pagues» when the business stopped being public', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:preview');
    URL.revokeObjectURL = vi.fn();
    mocks.uploadReceipt.mockRejectedValue(conflict('ORDER_BUSINESS_UNAVAILABLE'));
    wrap(<ReceiptUpload orderId={ID} />);
    const file = new File([new Uint8Array([1, 2, 3])], 'pago.png', { type: 'image/png' });
    fireEvent.change(screen.getByLabelText('Foto del comprobante'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar comprobante' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No pagues: este negocio no está disponible.');
    expect(screen.queryByRole('button', { name: 'Enviar comprobante' })).toBeNull();
  });

  it('explains an order cancelled because the business closed', async () => {
    mocks.get.mockResolvedValue({ ...order, status: 'CANCELLED', cancelReason: 'BUSINESS_CLOSED', rejection: null, actions: { canUploadReceipt: false, canCancel: false, canReport: false } });
    wrap(<OrderDetail orderId={ID} />);
    expect(await screen.findByText('El negocio cerró su cuenta en REPP y canceló este pedido. No pagues.')).toBeTruthy();
  });
});
