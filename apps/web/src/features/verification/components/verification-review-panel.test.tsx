import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { VerificationQueueItem } from '@/shared/api/schemas';
import { VerificationReviewPanel } from './verification-review-panel';

const mocks = vi.hoisted(() => ({
  decide: vi.fn(),
  notify: { error: vi.fn(), warning: vi.fn(), info: vi.fn(), success: vi.fn() },
}));
vi.mock('../services/verification-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../services/verification-service')>()),
  verificationService: { decide: mocks.decide },
}));
vi.mock('@/shared/notifications', () => ({ notify: mocks.notify }));

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const photo = (n: number) => ({ id: `0190e2cb-a6d4-7ec3-8f91-a6c73563150${n}`, url: `https://cdn.example.test/${n}.jpg` });
const item = (photos = [photo(2), photo(3)]): VerificationQueueItem => ({
  id,
  status: 'PENDING_REVIEW',
  member: { id: '0190e2cb-a6d4-7ec3-8f91-a6c735631509', name: 'Ana Pérez' },
  tenantId: '0190e2cb-a6d4-7ec3-8f91-a6c73563150a',
  tenantName: 'Gimnasio Centro',
  gesture: { code: 'TOUCH_EAR', instruction: 'Tócate una oreja con la mano' },
  submittedAt: '2026-11-16T10:00:00.000Z',
  selfie: { url: `/api/v1/admin/verifications/${id}/selfie?expires=1763290000000&signature=abcdefghijklmnopqrstuvwxyz`, expiresAt: 'x' },
  profilePhotos: photos,
});

function renderPanel(value: VerificationQueueItem, handlers = { onDone: vi.fn(), onReload: vi.fn() }) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const view = (next: VerificationQueueItem) => (
    <QueryClientProvider client={client}>
      <VerificationReviewPanel item={next} onDone={handlers.onDone} onReload={handlers.onReload} reloading={false} />
    </QueryClientProvider>
  );
  const utils = render(view(value));
  return { ...utils, handlers, rerenderWith: (next: VerificationQueueItem) => utils.rerender(view(next)) };
}

describe('VerificationReviewPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the selfie through the BFF next to the compared photos and the requested gesture', () => {
    renderPanel(item());
    expect(screen.getByRole('heading', { name: 'Ana Pérez' })).toHaveFocus();
    expect(screen.getByText('Tócate una oreja con la mano')).toBeInTheDocument();
    expect(screen.getByAltText('Selfie de Ana Pérez')).toHaveAttribute(
      'src',
      `/api/backend/admin/verifications/${id}/selfie?expires=1763290000000&signature=abcdefghijklmnopqrstuvwxyz`,
    );
    expect(screen.getAllByAltText(/Foto \d del perfil de Ana Pérez/u)).toHaveLength(2);
    // The REPP queue mixes every gym: each review names the member's.
    expect(screen.getByTestId('verification-gym')).toHaveTextContent('Gimnasio Centro');
  });

  it('approves bound to exactly the photos on screen', async () => {
    mocks.decide.mockResolvedValue({ id, status: 'APPROVED', submittedAt: null });
    const { handlers } = renderPanel(item());
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(handlers.onDone).toHaveBeenCalled());
    expect(mocks.decide).toHaveBeenCalledWith(id, { decision: 'APPROVE', comparedPhotoIds: [photo(2).id, photo(3).id] });
    expect(mocks.notify.success).toHaveBeenCalledWith('Verificación aprobada.');
  });

  it('rejects only with a reason', async () => {
    mocks.decide.mockResolvedValue({ id, status: 'REJECTED', submittedAt: null });
    renderPanel(item());
    const reject = screen.getByRole('button', { name: 'Rechazar' });
    expect(reject).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Motivo del rechazo'), { target: { value: 'GESTURE_MISMATCH' } });
    fireEvent.click(reject);
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledWith(id, { decision: 'REJECT', reason: 'GESTURE_MISMATCH' }));
  });

  it('on 409 VERIFICATION_PHOTOS_CHANGED says «las fotos cambiaron», blocks approval until reloaded', async () => {
    mocks.decide.mockRejectedValue(
      new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'VERIFICATION_PHOTOS_CHANGED' }),
    );
    const { handlers, rerenderWith } = renderPanel(item());
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Las fotos cambiaron, vuelve a cargar.');
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Volver a cargar' }));
    expect(handlers.onReload).toHaveBeenCalled();
    expect(handlers.onDone).not.toHaveBeenCalled();
    expect(mocks.notify.error).not.toHaveBeenCalled();

    rerenderWith(item([photo(4)]));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Aprobar' })).toBeEnabled();
  });

  it('when someone else already decided, says so and closes the item', async () => {
    mocks.decide.mockRejectedValue(new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'VERIFICATION_STATE_CONFLICT' }));
    const { handlers } = renderPanel(item());
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(handlers.onDone).toHaveBeenCalled());
    expect(mocks.notify.info).toHaveBeenCalledWith('Otra persona ya decidió esta verificación.');
  });

  it.each([
    [403, 'forbidden', 'MODERATION_SELF_CASE', 'No puedes revisar tu propia verificación.'],
    [403, 'forbidden', 'MODERATION_PEER_CASE', 'La verificación de una cuenta de la plataforma la revisa la administración del sistema.'],
    [409, 'conflict', 'VERIFICATION_CHALLENGE_EXPIRED', 'Esta verificación venció y ya no se puede decidir.'],
  ] as const)('on %i %s %s explains why and closes the item', async (status, kind, code, message) => {
    mocks.decide.mockRejectedValue(new ApiError({ message: 'x', status, kind, code }));
    const { handlers } = renderPanel(item());
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(handlers.onDone).toHaveBeenCalled());
    expect(mocks.notify.info).toHaveBeenCalledWith(message);
    expect(mocks.notify.error).not.toHaveBeenCalled();
  });
});
