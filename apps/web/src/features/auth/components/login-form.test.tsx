import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { LoginForm } from './login-form';

const mocks = vi.hoisted(() => ({ login: vi.fn(), replace: vi.fn(), search: '' }));
vi.mock('@/features/auth/services/auth-client', () => ({ login: mocks.login }));
vi.mock('@/features/auth/components/google-sign-in', () => ({ GoogleSignIn: () => null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(mocks.search),
}));

function fill() {
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña', { selector: 'input' }), { target: { value: 'segura-123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));
}

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search = '';
  });

  it('says the pending-review suspension by its code, whatever the server sentence', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        message: 'Forbidden',
        status: 403,
        kind: 'forbidden',
        code: 'ACCOUNT_SUSPENDED',
        details: { pendingReview: true },
      }),
    );
    render(<LoginForm />);
    fill();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta está suspendida mientras revisamos un reporte. Te avisaremos cuando terminemos.',
    );
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('says a dated suspension with its end date', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        message: 'Forbidden',
        status: 403,
        kind: 'forbidden',
        code: 'ACCOUNT_SUSPENDED',
        details: { pendingReview: false, until: '2026-12-01T12:00:00.000Z' },
      }),
    );
    render(<LoginForm />);
    fill();
    expect(await screen.findByRole('alert')).toHaveTextContent(/suspendida hasta el 1 de diciembre de 2026/u);
  });

  it('explains the suspension when a refused session lands here (?suspended=review)', () => {
    mocks.search = 'suspended=review';
    render(<LoginForm />);
    expect(screen.getByRole('alert')).toHaveTextContent(/mientras revisamos un reporte/u);
    expect(screen.queryByText(/sesión ha expirado/u)).toBeNull();
  });

  it('still says the credentials are wrong on a 401', async () => {
    mocks.login.mockRejectedValue(new ApiError({ message: 'Unauthorized', status: 401, kind: 'unauthorized' }));
    render(<LoginForm />);
    fill();
    await waitFor(() => expect(screen.getByText('Correo o contraseña incorrectos.')).toBeInTheDocument());
  });
});
