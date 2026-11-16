import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetVerificationCtaDismissal } from '../lib/cta-dismissal';
import { VerificationCta } from './verification-cta';

const mocks = vi.hoisted(() => ({ mine: vi.fn() }));
vi.mock('../services/verification-service', () => ({ verificationService: { mine: mocks.mine } }));

const state = (status: string) => ({ status, verifiedAt: null, challenge: null, lastDecision: null, canRetryAt: null });

function renderCta(enabled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <VerificationCta enabled={enabled} />
    </QueryClientProvider>,
  );
}

describe('VerificationCta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVerificationCtaDismissal();
  });

  it.each(['NONE', 'REJECTED', 'EXPIRED', 'REVOKED', 'PENDING_UPLOAD'])('shows the CTA when the status is %s', async (status) => {
    mocks.mine.mockResolvedValue(state(status));
    renderCta();
    expect(await screen.findByRole('heading', { name: 'Verifícate para aparecer antes' })).toBeInTheDocument();
    expect(screen.getByText('Los perfiles verificados salen antes en Conocer.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Verificarme' })).toHaveAttribute('href', '/verificacion');
  });

  it.each(['APPROVED', 'PENDING_REVIEW'])('stays hidden when the status is %s', async (status) => {
    mocks.mine.mockResolvedValue(state(status));
    renderCta();
    await waitFor(() => expect(mocks.mine).toHaveBeenCalled());
    expect(screen.queryByTestId('verification-cta')).toBeNull();
  });

  it('does not even ask for the status when it is not for this person (staff)', () => {
    renderCta(false);
    expect(mocks.mine).not.toHaveBeenCalled();
    expect(screen.queryByTestId('verification-cta')).toBeNull();
  });

  it('«Ahora no» hides it for the rest of the session, also on the next screen', async () => {
    mocks.mine.mockResolvedValue(state('NONE'));
    const first = renderCta();
    fireEvent.click(await screen.findByRole('button', { name: 'Ahora no' }));
    expect(screen.queryByTestId('verification-cta')).toBeNull();
    first.unmount();
    renderCta();
    expect(screen.queryByTestId('verification-cta')).toBeNull();
  });
});
