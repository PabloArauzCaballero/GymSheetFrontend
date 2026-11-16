import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import type { MyVerification } from '@/shared/api/schemas';
import { VerificationFlow } from './verification-flow';

const mocks = vi.hoisted(() => ({
  mine: vi.fn(),
  challenge: vi.fn(),
  uploadSelfie: vi.fn(),
  consents: vi.fn(),
  setConsent: vi.fn(),
  confirm: vi.fn(),
  notify: { error: vi.fn(), warning: vi.fn(), info: vi.fn(), success: vi.fn() },
}));
vi.mock('../services/verification-service', () => ({
  verificationService: { mine: mocks.mine, challenge: mocks.challenge, uploadSelfie: mocks.uploadSelfie },
}));
vi.mock('@/features/privacy/services/privacy-service', () => ({
  privacyService: { consents: mocks.consents, setConsent: mocks.setConsent },
}));
vi.mock('@/shared/notifications', () => ({ confirm: mocks.confirm, notify: mocks.notify }));
// The real camera needs getUserMedia; the stub hands one frame back like it does.
vi.mock('@/shared/components/media/camera-capture', () => ({
  CameraCapture: ({ onCapture }: { onCapture: (frame: { blob: Blob; dataUrl: string }) => void }) => (
    <button
      data-testid="camera"
      onClick={() => onCapture({ blob: new Blob(['jpeg'], { type: 'image/jpeg' }), dataUrl: 'data:image/jpeg;base64,AA==' })}
      type="button"
    >
      Tomar selfie
    </button>
  ),
}));

const id = '0190e2cb-a6d4-7ec3-8f91-a6c735631501';
const consent = (granted: boolean) => ({
  kind: 'VERIFICATION_SELFIE',
  granted,
  version: granted ? '2026-12-01' : null,
  currentVersion: '2026-12-01',
  upToDate: granted,
  grantedAt: null,
  revokedAt: null,
});
const none: MyVerification = { status: 'NONE', verifiedAt: null, challenge: null, lastDecision: null, canRetryAt: null };
const challengeIn = (ms: number, challengeId = id) => ({
  id: challengeId,
  gesture: { code: 'PEACE_SIGN', instruction: 'Haz el signo de la paz con la mano junto a tu cara' },
  expiresAt: new Date(Date.now() + ms).toISOString(),
});
const apiError = (status: number, code: string, details?: Record<string, unknown>) =>
  new ApiError({ message: code, status, kind: status === 409 ? 'conflict' : 'validation', code, details });

function renderFlow() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <VerificationFlow />
    </QueryClientProvider>,
  );
}

async function startChallenge() {
  fireEvent.click(await screen.findByRole('button', { name: 'Pedir mi gesto' }));
  return screen.findByText('Haz el signo de la paz con la mano junto a tu cara');
}

describe('VerificationFlow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mine.mockResolvedValue(none);
    mocks.consents.mockResolvedValue([consent(false)]);
    mocks.setConsent.mockResolvedValue(consent(true));
    mocks.confirm.mockResolvedValue({ confirmed: true, action: 'confirm' });
  });

  it('asks for the selfie consent with its purpose before any challenge or camera', async () => {
    mocks.confirm.mockResolvedValue({ confirmed: false, action: 'cancel' });
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Pedir mi gesto' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0]?.[0]).toMatchObject({ message: 'Usaremos una selfie para comprobar que tu perfil es real.' });
    expect(mocks.challenge).not.toHaveBeenCalled();
    expect(mocks.setConsent).not.toHaveBeenCalled();
    expect(screen.queryByTestId('camera')).toBeNull();
    expect(mocks.notify.info).toHaveBeenCalledWith('Sin tu consentimiento no podemos usar una selfie para verificarte.');
  });

  it('grants the consent, then shows the gesture with its countdown and the camera', async () => {
    mocks.challenge.mockResolvedValue(challengeIn(65_000));
    renderFlow();
    await startChallenge();

    expect(mocks.setConsent).toHaveBeenCalledWith('VERIFICATION_SELFIE', { granted: true, version: '2026-12-01' });
    expect(mocks.setConsent.mock.invocationCallOrder[0]).toBeLessThan(mocks.challenge.mock.invocationCallOrder[0] ?? 0);
    expect(screen.getByTestId('verification-countdown')).toHaveTextContent(/Te quedan 1:0[45]/u);
    expect(screen.getByTestId('camera')).toBeInTheDocument();
  });

  it('turns an expired gesture into «Pedir otro gesto», which asks the server for a new one', async () => {
    mocks.consents.mockResolvedValue([consent(true)]);
    mocks.challenge.mockResolvedValueOnce(challengeIn(1_200)).mockResolvedValueOnce(challengeIn(600_000, `${id.slice(0, -1)}9`));
    renderFlow();
    await startChallenge();

    const again = await screen.findByRole('button', { name: 'Pedir otro gesto' }, { timeout: 4_000 });
    expect(screen.queryByTestId('camera')).toBeNull();
    fireEvent.click(again);
    await screen.findByTestId('camera');
    expect(mocks.challenge).toHaveBeenCalledTimes(2);
  });

  it('uploads the previewed selfie and lands on «en revisión»', async () => {
    mocks.consents.mockResolvedValue([consent(true)]);
    mocks.challenge.mockResolvedValue(challengeIn(600_000));
    mocks.uploadSelfie.mockResolvedValue({ id, status: 'PENDING_REVIEW', submittedAt: new Date().toISOString() });
    renderFlow();
    await startChallenge();

    fireEvent.click(screen.getByTestId('camera'));
    expect(screen.getByAltText('Tu selfie antes de enviarla')).toBeInTheDocument();
    mocks.mine.mockResolvedValue({ ...none, status: 'PENDING_REVIEW' });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar selfie' }));

    expect(await screen.findByText('Tu selfie está en revisión')).toBeInTheDocument();
    expect(mocks.uploadSelfie).toHaveBeenCalledWith(id, expect.any(Blob), 'selfie.jpg');
  });

  it('on a 400 CONSENT_REQUIRED at upload asks again and retries once', async () => {
    mocks.consents.mockResolvedValue([consent(true)]);
    mocks.challenge.mockResolvedValue(challengeIn(600_000));
    mocks.uploadSelfie
      .mockRejectedValueOnce(apiError(400, 'CONSENT_REQUIRED', { kind: 'VERIFICATION_SELFIE' }))
      .mockResolvedValue({ id, status: 'PENDING_REVIEW', submittedAt: null });
    renderFlow();
    await startChallenge();
    fireEvent.click(screen.getByTestId('camera'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar selfie' }));

    await waitFor(() => expect(mocks.uploadSelfie).toHaveBeenCalledTimes(2));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });

  it('shows the calm unavailable state on a 503 VERIFICATION_UNAVAILABLE', async () => {
    mocks.consents.mockResolvedValue([consent(true)]);
    mocks.challenge.mockRejectedValue(apiError(503, 'VERIFICATION_UNAVAILABLE'));
    renderFlow();
    fireEvent.click(await screen.findByRole('button', { name: 'Pedir mi gesto' }));

    expect(await screen.findByText('Verificación en pausa')).toBeInTheDocument();
    expect(mocks.notify.error).not.toHaveBeenCalled();
  });

  it('on a 409 VERIFICATION_CHALLENGE_EXPIRED at upload offers a new gesture', async () => {
    mocks.consents.mockResolvedValue([consent(true)]);
    mocks.challenge.mockResolvedValue(challengeIn(600_000));
    mocks.uploadSelfie.mockRejectedValue(apiError(409, 'VERIFICATION_CHALLENGE_EXPIRED'));
    renderFlow();
    await startChallenge();
    fireEvent.click(screen.getByTestId('camera'));
    fireEvent.click(screen.getByRole('button', { name: 'Enviar selfie' }));

    expect(await screen.findByRole('button', { name: 'Pedir otro gesto' })).toBeInTheDocument();
    expect(screen.getByText('El gesto caducó')).toBeInTheDocument();
  });

  it('resumes an open challenge after a reload', async () => {
    mocks.mine.mockResolvedValue({ ...none, status: 'PENDING_UPLOAD', challenge: challengeIn(300_000) });
    renderFlow();
    expect(await screen.findByText('Haz el signo de la paz con la mano junto a tu cara')).toBeInTheDocument();
    expect(mocks.challenge).not.toHaveBeenCalled();
  });
});
