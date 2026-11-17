import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { EmailVerificationForm } from './email-verification-form';

const { confirmEmailPin, requestEmailPin, refresh } = vi.hoisted(() => ({
  confirmEmailPin: vi.fn(),
  requestEmailPin: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('../services/account-client', () => ({
  accountService: { confirmEmailPin, requestEmailPin },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EmailVerificationForm email="ana@example.com" />
    </QueryClientProvider>,
  );
}

const pinInput = () => screen.getByLabelText('Código de verificación');
const typePin = (value: string) => fireEvent.change(pinInput(), { target: { value } });
const verify = () => fireEvent.click(screen.getByRole('button', { name: 'Verificar' }));
const pinError = (code: string, details?: Record<string, unknown>) =>
  new ApiError({
    message: 'x',
    status: 400,
    kind: 'validation',
    code,
    ...(details ? { details } : {}),
  });

describe('EmailVerificationForm', () => {
  beforeEach(() => {
    confirmEmailPin.mockReset();
    requestEmailPin.mockReset();
    refresh.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('offers a numeric one-time-code input that only keeps six digits', () => {
    renderForm();
    expect(pinInput()).toHaveAttribute('autocomplete', 'one-time-code');
    expect(pinInput()).toHaveAttribute('inputmode', 'numeric');
    typePin('12a34 5678');
    expect(pinInput()).toHaveValue('123456');
  });

  it('says how many tries are left after a wrong PIN', async () => {
    confirmEmailPin.mockRejectedValue(pinError('EMAIL_PIN_INVALID', { attemptsRemaining: 2 }));
    renderForm();
    typePin('111111');
    verify();
    expect(
      await screen.findByText('El código no es correcto. Te quedan 2 intentos.'),
    ).toBeInTheDocument();
    expect(pinInput()).toHaveAttribute('aria-invalid', 'true');
  });

  it('asks for a new PIN when the current one expired and clears the input', async () => {
    confirmEmailPin.mockRejectedValue(pinError('EMAIL_PIN_EXPIRED'));
    renderForm();
    typePin('222222');
    verify();
    expect(await screen.findByText('El código venció. Pide uno nuevo.')).toBeInTheDocument();
    expect(pinInput()).toHaveValue('');
  });

  it('never sends an incomplete PIN', async () => {
    renderForm();
    typePin('123');
    verify();
    expect(await screen.findByText('El código son seis dígitos.')).toBeInTheDocument();
    expect(confirmEmailPin).not.toHaveBeenCalled();
  });

  it('counts down the cooldown the server gives before allowing another resend', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    requestEmailPin.mockRejectedValue(
      new ApiError({
        message: 'x',
        status: 429,
        kind: 'rate-limit',
        code: 'EMAIL_PIN_COOLDOWN',
        details: { retryAfterSeconds: 3 },
      }),
    );
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Reenviar código' }));
    const waiting = await screen.findByRole('button', { name: 'Reenviar en 3 s' });
    expect(waiting).toBeDisabled();
    expect(screen.getByText('Espera un momento antes de pedir otro código.')).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(screen.getByRole('button', { name: 'Reenviar código' })).toBeEnabled();
  });

  it('confirms the PIN, refreshes the session and shows the verified state', async () => {
    confirmEmailPin.mockResolvedValue({ verified: true });
    renderForm();
    typePin('654321');
    verify();
    expect(await screen.findByText('Listo, tu correo está verificado.')).toBeInTheDocument();
    expect(confirmEmailPin).toHaveBeenCalledWith('654321');
    await waitFor(() => expect(refresh).toHaveBeenCalled());
  });
});
