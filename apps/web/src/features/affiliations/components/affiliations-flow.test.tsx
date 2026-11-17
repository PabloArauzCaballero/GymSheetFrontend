import { ApiError } from '@gymsheet/api-client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GymAffiliation, PublicLocation } from '@/shared/api/schemas';
import { AffiliationRow } from './gym/affiliation-row';
import { JoinGymDialog } from './person/join-gym-dialog';

const mocks = vi.hoisted(() => ({ request: vi.fn(), myGym: vi.fn(), reject: vi.fn(), confirm: vi.fn(), ask: vi.fn() }));
vi.mock('../services/affiliations-client', async (original) => ({
  ...(await original<typeof import('../services/affiliations-client')>()),
  personAffiliationsService: { request: mocks.request, myGym: mocks.myGym },
  gymAffiliationsService: { reject: mocks.reject, confirm: mocks.confirm },
}));
vi.mock('@/shared/notifications', () => ({ confirm: mocks.ask, notify: { success: vi.fn(), error: vi.fn() } }));

const GYM = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const SEDE = '0190e2cb-a6d4-7ec3-8f91-a6c735631502';
const OTRA = '0190e2cb-a6d4-7ec3-8f91-a6c735631504';
const AFF = '0190e2cb-a6d4-7ec3-8f91-a6c735631503';
const sede = (id: string, name: string) => ({ id, name, address: null, city: 'La Paz', latitude: null, longitude: null, businessHours: {} }) as unknown as PublicLocation;

function wrap(node: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{node}</QueryClientProvider>);
}

beforeEach(() => vi.clearAllMocks());

describe('«Hacerme socio»', () => {
  const gym = { entityId: GYM, handle: 'topfitness', name: 'Top Fitness' };

  it('asks for the sede and the 3 digits before sending, then sends the strict body', async () => {
    mocks.request.mockResolvedValue({});
    wrap(<JoinGymDialog gym={gym} initialKind="SOCIO" locations={[sede(SEDE, 'Centro'), sede(OTRA, 'Sur')]} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    expect(await screen.findByText('Elige la sede donde entrenas.')).toBeTruthy();
    expect(mocks.request).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: /Centro/u }));
    fireEvent.change(screen.getByLabelText('Últimos 3 dígitos de tu CI'), { target: { value: '12a3' } });
    expect((screen.getByLabelText('Últimos 3 dígitos de tu CI') as HTMLInputElement).value).toBe('123');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith({ gymHandle: 'topfitness', kind: 'SOCIO', locationId: SEDE, ciLast3: '123' }));
  });

  it('asks «Ya eres socio de X» on a gym switch and resends with switchGym', async () => {
    mocks.request
      .mockRejectedValueOnce(new ApiError({ kind: 'conflict', status: 409, message: 'x', code: 'SOCIO_OF_ANOTHER_GYM', details: { affiliationId: AFF, action: 'SWITCH_GYM' } }))
      .mockResolvedValueOnce({});
    mocks.myGym.mockResolvedValue({ status: 'CONFIRMED', location: null, since: null, affiliationId: null, pendingRequest: null, membershipVisible: true, gym: { id: OTRA, name: 'Gym Viejo', handle: 'viejo', logoUrl: null } });
    mocks.ask.mockResolvedValue({ confirmed: true });
    wrap(<JoinGymDialog gym={gym} initialKind="SOCIO" locations={[sede(SEDE, 'Centro')]} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('Últimos 3 dígitos de tu CI'), { target: { value: '456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    await waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(2));
    expect(mocks.ask).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ya eres socio de Gym Viejo' }));
    expect(mocks.request.mock.calls[1]?.[0]).toEqual({ gymHandle: 'topfitness', kind: 'SOCIO', locationId: SEDE, ciLast3: '456', switchGym: true });
  });
});

describe('the gym’s «Solicitudes»', () => {
  const row: GymAffiliation = {
    id: AFF,
    kind: 'SOCIO',
    status: 'REQUESTED',
    subject: { type: 'PERSON', displayName: 'Ana P.', photoUrl: null, ciLast3: '123' },
    location: { id: SEDE, name: 'Centro' },
    requestedAt: '2026-11-17T10:00:00.000Z',
    confirmedAt: null,
  };

  it('shows «CI termina en …» and requires a note with «Otro motivo»', async () => {
    mocks.reject.mockResolvedValue({ ...row, status: 'REJECTED', subject: null });
    wrap(<AffiliationRow row={row} />);
    expect(screen.getByText('CI termina en 123')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    fireEvent.click(screen.getByRole('button', { name: 'Otro motivo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar solicitud' }));
    expect(await screen.findByText('Explica el motivo para que la persona sepa qué pasó.')).toBeTruthy();
    expect(mocks.reject).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'El CI no coincide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar solicitud' }));
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith(AFF, { reasonCode: 'CI_MISMATCH' }));
  });
});
