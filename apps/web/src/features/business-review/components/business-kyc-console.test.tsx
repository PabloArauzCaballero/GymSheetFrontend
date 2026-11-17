import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { KycQueuePanel } from './kyc-queue-panel';

const mocks = vi.hoisted(() => ({
  queue: vi.fn(),
  detail: vi.fn(),
  claim: vi.fn(),
  release: vi.fn(),
  decide: vi.fn(),
  fetchKycDocument: vi.fn(),
  success: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/features/business/services/business-kyc-client', () => ({
  businessKycAdminService: { queue: mocks.queue, detail: mocks.detail, claim: mocks.claim, release: mocks.release, decide: mocks.decide },
  fetchKycDocument: mocks.fetchKycDocument,
}));
vi.mock('@/shared/notifications', () => ({ notify: { success: mocks.success, info: mocks.info, error: mocks.error } }));

const SUB = '00000000-0000-4000-8000-000000000009';
const DOC = '00000000-0000-4000-8000-00000000000d';
const ME = '00000000-0000-4000-8000-0000000000aa';

const item = {
  submissionId: SUB,
  accountId: '00000000-0000-4000-8000-000000000001',
  entityId: '00000000-0000-4000-8000-000000000002',
  entityType: 'GYM',
  tradeName: 'Top Fitness',
  handle: 'topfit',
  version: 1,
  purpose: 'INITIAL',
  status: 'IN_REVIEW',
  submittedAt: '2026-11-16T10:00:00.000Z',
  dueAt: '2026-11-17T10:00:00.000Z',
  overdue: true,
  claimedByUserId: null,
  claimedAt: null,
  failedChecks: ['PHONE_VERIFIED'],
};

function detail(status = 'IN_REVIEW') {
  return {
    submission: {
      id: SUB,
      version: 1,
      purpose: 'INITIAL',
      status,
      legalKind: 'COMPANY',
      fields: {
        tradeName: 'Top Fitness',
        primaryCategoryId: null,
        legalName: 'Top Fitness SRL',
        nitMasked: '•••567',
        repFullName: 'Ana Rojas',
        repCiMasked: '•••321',
        repCiComplement: null,
        repCiExtension: 'SC',
        specialty: null,
        address: 'Av. Busch 123',
        seprecNumber: null,
        phoneMasked: '+591 •••••567',
      },
      documents: [],
      selfieChallenge: null,
      submittedAt: '2026-11-16T10:00:00.000Z',
      decidedAt: null,
      reviewDueAt: '2026-11-17T10:00:00.000Z',
      postReviewDueAt: null,
    },
    identity: { nit: '1029384567', repCiNumber: '7654321', phone: '+59171234567' },
    phoneVerified: false,
    account: { id: item.accountId, email: 'top@negocio.bo', status: 'ONBOARDING', kycStatus: status, entityType: 'GYM' },
    entity: { id: item.entityId, name: 'Top Fitness', status: 'DRAFT', isVerified: false, city: 'Santa Cruz', logoUrl: null },
    handle: { handle: 'topfit', status: 'PENDING' },
    documents: [
      { id: DOC, kind: 'CI_FRONT', readable: true, readabilityCodes: [], width: 1200, height: 800, uploadedAt: '2026-11-16T10:00:00.000Z', deleted: false, deleteReason: null, selfieChallengeCode: null },
    ],
    checks: [{ code: 'PHONE_VERIFIED', outcome: 'FAIL', detail: {}, durationMs: 1, createdAt: '2026-11-16T10:00:00.000Z' }],
    decisions: [],
    history: [],
    claimedByUserId: null,
  };
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <KycQueuePanel viewerId={ME} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.queue.mockResolvedValue({ items: [item], nextCursor: null });
  mocks.fetchKycDocument.mockResolvedValue(new Blob(['x'], { type: 'image/jpeg' }));
  URL.createObjectURL = vi.fn(() => 'blob:kyc-1');
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('REPP KYC console', () => {
  it('opens a case with the identity in clear, the failed check and the private photo by object URL', async () => {
    mocks.detail.mockResolvedValue(detail());
    const { unmount } = renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Top Fitness/u }));
    expect(await screen.findByText('1029384567')).toBeInTheDocument();
    expect(screen.getByText('+59171234567 · sin verificar')).toBeInTheDocument();
    expect(screen.getByText('Falla')).toBeInTheDocument();
    const photo = await screen.findByRole('img', { name: 'Carnet, anverso' });
    expect(photo).toHaveAttribute('src', 'blob:kyc-1');
    expect(mocks.fetchKycDocument).toHaveBeenCalledWith(SUB, DOC, expect.any(AbortSignal));
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:kyc-1');
  });

  it('approves, and closes the post-review of an automatic approval instead', async () => {
    mocks.detail.mockResolvedValue(detail());
    mocks.decide.mockResolvedValue({ status: 'APPROVED', decisionId: 'd' });
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Top Fitness/u }));
    fireEvent.click(await screen.findByRole('button', { name: 'Aprobar' }));
    await waitFor(() => expect(mocks.decide).toHaveBeenCalledWith(SUB, { decision: 'APPROVE', reasonCodes: [] }));
    expect(mocks.success).toHaveBeenCalledWith('Negocio aprobado: ya lleva «Verificado por REPP».');

    mocks.detail.mockResolvedValue(detail('AUTO_APPROVED'));
    mocks.queue.mockResolvedValue({ items: [{ ...item, status: 'AUTO_APPROVED' }], nextCursor: null });
    fireEvent.click(await screen.findByRole('button', { name: /Top Fitness/u }));
    expect(await screen.findByRole('button', { name: 'Confirmar revisión' })).toBeInTheDocument();
  });

  it('rejects only with a reason, and leaves a case another reviewer took', async () => {
    mocks.detail.mockResolvedValue(detail());
    mocks.decide.mockRejectedValue(new ApiError({ message: 'x', status: 409, kind: 'conflict', code: 'KYC_CLAIMED_BY_OTHER' }));
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: /Top Fitness/u }));
    const reject = await screen.findByRole('button', { name: 'Rechazar' });
    expect(reject).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'NIT no válido' }));
    fireEvent.click(reject);
    await waitFor(() =>
      expect(mocks.decide).toHaveBeenCalledWith(SUB, { decision: 'REJECT', reasonCodes: ['NIT_INVALID'], allowResubmit: true }),
    );
    expect(mocks.info).toHaveBeenCalledWith('Otra persona de REPP la tomó. Recargamos la cola.');
    expect(await screen.findByText('Elige una solicitud de la lista.')).toBeInTheDocument();
  });
});
