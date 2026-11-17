import { ApiError } from '@gymsheet/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BusinessOrderDetail, PublicListing, Subscriber } from '@/shared/api/schemas';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { OrderDecision } from '@/features/orders/components/business/order-decision';
import { CheckoutForm } from '@/features/orders/components/checkout-form';
import { SubscriberDecision } from './business/subscriber-decision';
import { MySubscriptions } from './person/my-subscriptions';

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  confirmOrder: vi.fn(),
  myGym: vi.fn(),
  profile: vi.fn(),
  list: vi.fn(),
  suspend: vi.fn(),
  ask: vi.fn(),
  push: vi.fn(),
  businessMe: vi.fn(),
}));
vi.mock('@/features/orders/services/orders-client', async (original) => ({
  ...(await original<typeof import('@/features/orders/services/orders-client')>()),
  buyerOrdersService: { create: mocks.create },
  businessOrdersService: { confirm: mocks.confirmOrder, reject: vi.fn() },
}));
vi.mock('@/features/affiliations/services/affiliations-client', async (original) => ({
  ...(await original<typeof import('@/features/affiliations/services/affiliations-client')>()),
  personAffiliationsService: { myGym: mocks.myGym },
}));
vi.mock('@/features/business-listings/services/listings-client', () => ({ marketplaceService: { profile: mocks.profile } }));
vi.mock('../services/subscriptions-client', async (original) => ({
  ...(await original<typeof import('../services/subscriptions-client')>()),
  personSubscriptionsService: { list: mocks.list },
  businessSubscriptionsService: { suspend: mocks.suspend },
}));
vi.mock('@/features/business/hooks/use-kyc', () => ({ useBusinessMe: () => ({ data: mocks.businessMe() }) }));
vi.mock('@/shared/notifications', () => ({ confirm: mocks.ask, notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }) }));

const GYM = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const SEDE = '0190e2cb-a6d4-7ec3-8f91-a6c735631502';
const ID = '0190e2cb-a6d4-7ec3-8f91-a6c735631505';
const none = { status: 'NONE', gym: null, location: null, since: null, affiliationId: null, pendingRequest: null, membershipVisible: true };
const listing = {
  id: ID,
  offerKind: 'MEMBERSHIP',
  name: 'Mensual',
  price: '150.00',
  currency: 'BOB',
  inStock: null,
  seller: { id: GYM, name: 'Top Fitness', handle: 'topfitness', entityType: 'GYM', logoUrl: null, city: null, badge: 'NEW' },
} as unknown as PublicListing;
const sede = { id: SEDE, name: 'Centro', address: null, city: 'La Paz', latitude: null, longitude: null, businessHours: {} };

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}
const inDialog = (node: ReactNode) => (
  <Dialog open>
    <DialogContent title="Confirma tu pedido">{node}</DialogContent>
  </Dialog>
);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.myGym.mockResolvedValue(none);
  mocks.profile.mockResolvedValue({ handle: 'topfitness', entity: {}, locations: [sede], listings: { items: [], nextCursor: null } });
});

describe('checkout of a gym membership (franja 8e)', () => {
  it('asks «Hazte socio» with the only sede preselected and sends the SOCIO data', async () => {
    mocks.create.mockResolvedValue({ id: 'new-order' });
    wrap(inDialog(<CheckoutForm listing={listing} />));
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('heading', { name: 'Hazte socio' })).toBeTruthy();
    expect((await screen.findByRole('radio', { name: /Centro/u }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    expect(await screen.findByText('Escribe los últimos 3 dígitos de tu CI.')).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Últimos 3 dígitos de tu CI'), { target: { value: '4a56' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ listingId: ID, method: 'QR', affiliation: { locationId: SEDE, ciLast3: '456' } }));
    expect(mocks.push).toHaveBeenCalledWith('/profile/compras/new-order');
  });

  it('asks once to switch gyms and resends with switchGym', async () => {
    mocks.create.mockRejectedValueOnce(new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'SOCIO_OF_ANOTHER_GYM', details: { affiliationId: 'a', action: 'SWITCH_GYM' } }));
    mocks.create.mockResolvedValueOnce({ id: 'switched' });
    mocks.ask.mockResolvedValue({ confirmed: true });
    wrap(inDialog(<CheckoutForm listing={listing} />));
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }));
    await screen.findByRole('radio', { name: /Centro/u });
    fireEvent.change(screen.getByLabelText('Últimos 3 dígitos de tu CI'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => expect(mocks.create).toHaveBeenLastCalledWith({ listingId: ID, method: 'QR', affiliation: { locationId: SEDE, ciLast3: '123', switchGym: true } }));
    expect(mocks.ask).toHaveBeenCalledTimes(1);
  });

  it('buys as is when the person is already SOCIO of that gym', async () => {
    mocks.myGym.mockResolvedValue({ ...none, status: 'CONFIRMED', gym: { id: GYM, name: 'Top Fitness', handle: 'topfitness', logoUrl: null } });
    mocks.create.mockResolvedValue({ id: 'plain' });
    wrap(inDialog(<CheckoutForm listing={listing} />));
    await waitFor(() => expect(mocks.myGym).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar pedido' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ listingId: ID, method: 'QR' }));
  });
});

describe('the gym confirms a membership', () => {
  const order = { id: ID, status: 'PENDING_VERIFICATION', listing: { id: ID, name: 'Mensual', offerKind: 'MEMBERSHIP' }, actions: { canDecide: true } } as unknown as BusinessOrderDetail;

  it('keeps «También confirmo que es socio» checked by default and sends false when unchecked', async () => {
    mocks.businessMe.mockReturnValue({ entity: { entityType: 'GYM' } });
    mocks.confirmOrder.mockResolvedValue({ ...order, status: 'CONFIRMED' });
    wrap(<OrderDecision order={order} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }));
    const box = (await screen.findByRole('checkbox', { name: 'También confirmo que es socio' })) as HTMLInputElement;
    expect(box.checked).toBe(true);
    fireEvent.click(box);
    fireEvent.click(screen.getAllByRole('button', { name: 'Confirmar pago' }).at(-1) as HTMLElement);
    await waitFor(() => expect(mocks.confirmOrder).toHaveBeenCalledWith(ID, { alsoConfirmAffiliation: false }));
  });

  it('explains a paused gym and offers the payment alone', async () => {
    mocks.businessMe.mockReturnValue({ entity: { entityType: 'GYM' } });
    mocks.confirmOrder.mockRejectedValueOnce(new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'GYM_NOT_ACTIVE' }));
    wrap(<OrderDecision order={order} />);
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar pago' }));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Confirmar pago' })).at(-1) as HTMLElement);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar solo el pago' }));
    await waitFor(() => expect(mocks.confirmOrder).toHaveBeenLastCalledWith(ID, { alsoConfirmAffiliation: false }));
  });
});

describe('«Mis suscripciones» and «Suscriptores»', () => {
  it('groups by seller with days left and «Renovar» to the listing', async () => {
    mocks.list.mockResolvedValue({
      today: '2026-11-17',
      items: [
        {
          seller: { entityId: GYM, name: 'Top Fitness', handle: 'topfitness', logoUrl: null, entityType: 'GYM' },
          affiliation: { id: 'a', status: 'CONFIRMED' },
          subscriptions: [{ listing: { id: ID, name: 'Mensual', offerKind: 'MEMBERSHIP' }, status: 'EXPIRING', current: { id: SEDE, status: 'EXPIRING', startsOn: '2026-10-25', endsOn: '2026-11-23', daysLeft: 6, sessions: null, origin: 'MARKETPLACE' }, upcoming: null, pendingOrder: null, renew: { listingId: ID, available: true } }],
        },
      ],
    });
    wrap(<MySubscriptions />);
    expect(await screen.findByText('Quedan 6 días')).toBeTruthy();
    expect(screen.getByText('Por vencer')).toBeTruthy();
    expect(screen.getByText('Socio')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Renovar' }).getAttribute('href')).toBe(`/publicacion/${ID}`);
  });

  it('asks a note with «Otro motivo» before suspending', async () => {
    const row = { id: ID, subscriber: { displayName: 'Ana' }, actions: { canCancel: true, canSuspend: true, canReactivate: false } } as unknown as Subscriber;
    mocks.suspend.mockResolvedValue({ ...row, status: 'SUSPENDED' });
    wrap(<SubscriberDecision row={row} />);
    fireEvent.click(screen.getByRole('button', { name: 'Suspender' }));
    fireEvent.click(screen.getByRole('button', { name: 'Otro motivo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Suspender plan' }));
    expect(await screen.findByText('Explica el motivo para que la persona sepa qué pasó.')).toBeTruthy();
    expect(mocks.suspend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Salud' }));
    fireEvent.click(screen.getByRole('button', { name: 'Suspender plan' }));
    await waitFor(() => expect(mocks.suspend).toHaveBeenCalledWith(ID, { reasonCode: 'HEALTH' }));
  });
});
