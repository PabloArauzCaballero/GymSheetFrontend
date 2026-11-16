import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingGuard } from './onboarding-guard';

const { get, replace, pathname } = vi.hoisted(() => ({
  get: vi.fn(),
  replace: vi.fn(),
  pathname: { current: '/comunidad' },
}));

vi.mock('../services/onboarding-service', () => ({ onboardingService: { get } }));
vi.mock('next/navigation', () => ({
  usePathname: () => pathname.current,
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
}));

function renderGuard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retryDelay: 0 } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OnboardingGuard role="CLIENTE">
        <p>Contenido del portal</p>
      </OnboardingGuard>
    </QueryClientProvider>,
  );
}

describe('OnboardingGuard', () => {
  beforeEach(() => {
    get.mockReset();
    replace.mockReset();
    pathname.current = '/comunidad';
  });

  it('shows a retryable error instead of redirecting when the onboarding state cannot load', async () => {
    get.mockRejectedValue(new Error('network unavailable'));
    renderGuard();

    expect(await screen.findByRole('alert')).toHaveTextContent('No pudimos verificar tu configuración.');
    expect(replace).not.toHaveBeenCalled();
    expect(screen.queryByText('Contenido del portal')).toBeNull();

    get.mockResolvedValue({ status: 'COMPLETED' });
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Contenido del portal')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('does not bounce a member already on /onboarding to Comunidad when the state fails', async () => {
    pathname.current = '/onboarding';
    get.mockRejectedValue(new Error('network unavailable'));
    renderGuard();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });

  it('still sends a member with pending onboarding to /onboarding', async () => {
    get.mockResolvedValue({ status: 'IN_PROGRESS' });
    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'));
  });

  it('sends a completed member with a pending Conocer step from /onboarding to /onboarding/conocer', async () => {
    pathname.current = '/onboarding';
    get.mockResolvedValue({ status: 'COMPLETED', socialStep: 'PENDING' });
    renderGuard();

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding/conocer'));
  });

  it('lets a completed member stay on /onboarding/conocer to resume it', async () => {
    pathname.current = '/onboarding/conocer';
    get.mockResolvedValue({ status: 'COMPLETED', socialStep: 'SKIPPED' });
    renderGuard();

    expect(await screen.findByText('Contenido del portal')).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
  });
});

