import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { AdminListingsPanel } from './admin-listings-panel';

const mocks = vi.hoisted(() => ({ list: vi.fn(), release: vi.fn(), reject: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock('@/features/business-listings/services/listings-client', () => ({
  adminListingsService: { list: mocks.list, release: mocks.release, reject: mocks.reject },
}));
vi.mock('@/shared/notifications', () => ({ notify: { error: mocks.error, success: mocks.success } }));

const STAMP = '2026-11-17T01:01:00.738123Z';
const item = {
  id: '8b1f6a52-3d5e-4d0b-9a63-0c8b4a5f1d11',
  entityId: '4e0b2a6c-1f3d-4b8a-9c2e-7d6f5a4b3c21',
  sellerName: 'Top Fitness',
  sellerHandle: 'topfit',
  offerKind: 'MEMBERSHIP',
  name: 'Mensual libre',
  description: 'Acceso a toda la sala.',
  benefits: ['Toalla'],
  mediaUrls: [],
  price: '90000.00',
  currency: 'BOB',
  validityDays: 30,
  sessionsCount: null,
  stockQuantity: null,
  productCategoryId: null,
  moderationStatus: 'HELD',
  moderationReasonCode: 'PRICE_OUT_OF_BAND',
  autoCheckCodes: ['PRICE_OUT_OF_BAND'],
  updatedAt: STAMP,
};

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AdminListingsPanel />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ items: [item], nextCursor: null });
});

describe('AdminListingsPanel', () => {
  it('shows what the moderator decides on and releases with the exact stamp it saw', async () => {
    mocks.release.mockResolvedValue({ id: item.id, moderationStatus: 'LIVE' });
    renderPanel();
    expect(await screen.findByText('Mensual libre')).toBeTruthy();
    expect(screen.getByText('Acceso a toda la sala.')).toBeTruthy();
    expect(screen.getByText('Incluye: Toalla')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(mocks.release).toHaveBeenCalledWith(item.id, { seenUpdatedAt: STAMP }));
  });

  it('on LISTING_CHANGED_SINCE_REVIEW it says so and reloads the queue', async () => {
    mocks.release.mockRejectedValue(
      new ApiError({ message: 'changed', status: 409, kind: 'conflict', code: 'LISTING_CHANGED_SINCE_REVIEW', details: { currentUpdatedAt: '2026-11-17T01:02:00.000001Z' } }),
    );
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: 'Publicar' }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('La publicación cambió desde que la abriste. Revísala de nuevo.'));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
  });
});
