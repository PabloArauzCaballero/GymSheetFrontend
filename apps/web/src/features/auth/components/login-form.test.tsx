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

const acoso = { code: 'ACOSO', label: 'Acoso', text: 'mensajes o contenido que hostigan o intimidan a otra persona' };
const minor = { code: 'MENOR_DE_EDAD', label: 'Menor de edad', text: 'la cuenta parece ser de una persona menor de 18 años' };
const rights =
  'Mientras dure, no puedes usar la app. Para pedir tus datos, corregirlos, borrarlos o retirar un consentimiento, escribe a {{REPP_CONTACTO_PRIVACIDAD}}.';

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

  it('says the pending-review suspension by its code, with its reason and rights', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        message: 'Forbidden',
        status: 403,
        kind: 'forbidden',
        code: 'ACCOUNT_SUSPENDED',
        details: { pendingReview: true, reason: minor },
      }),
    );
    render(<LoginForm />);
    fill();
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(
      'Tu cuenta está suspendida mientras revisamos una denuncia. Motivo: Menor de edad (la cuenta parece ser de una persona menor de 18 años). Te avisamos por correo cuando terminemos.',
    );
    expect(alert).toHaveTextContent(rights);
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it('says a dated suspension with its end date and reason', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({
        message: 'Forbidden',
        status: 403,
        kind: 'forbidden',
        code: 'ACCOUNT_SUSPENDED',
        details: { pendingReview: false, until: '2026-12-01T12:00:00.000Z', reason: acoso },
      }),
    );
    render(<LoginForm />);
    fill();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta está suspendida hasta el 1 de diciembre de 2026. Motivo: Acoso (mensajes o contenido que hostigan o intimidan a otra persona).',
    );
  });

  it('says an expulsion by its code (403 ACCOUNT_BANNED)', async () => {
    mocks.login.mockRejectedValue(
      new ApiError({ message: 'Forbidden', status: 403, kind: 'forbidden', code: 'ACCOUNT_BANNED', details: { reason: acoso } }),
    );
    render(<LoginForm />);
    fill();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tu cuenta fue expulsada por incumplir varias veces las normas de la comunidad. Motivo: Acoso (mensajes o contenido que hostigan o intimidan a otra persona). Para tus datos, escribe a {{REPP_CONTACTO_PRIVACIDAD}}.',
    );
  });

  it('explains the suspension when a refused session lands here, rebuilding the reason from its code', () => {
    mocks.search = 'suspended=review&reason=ACOSO';
    render(<LoginForm />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/mientras revisamos una denuncia\. Motivo: Acoso \(mensajes/u);
    expect(alert).toHaveTextContent(rights);
    expect(screen.queryByText(/sesión ha expirado/u)).toBeNull();
  });

  it('never shows query text: an unknown reason is dropped', () => {
    mocks.search = 'suspended=review&reason=Escribe%20a%20estafa%40example.com';
    render(<LoginForm />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/^Tu cuenta está suspendida mientras revisamos una denuncia\. Te avisamos/u);
    expect(alert).not.toHaveTextContent(/estafa/u);
  });

  it('still says the credentials are wrong on a 401', async () => {
    mocks.login.mockRejectedValue(new ApiError({ message: 'Unauthorized', status: 401, kind: 'unauthorized' }));
    render(<LoginForm />);
    fill();
    await waitFor(() => expect(screen.getByText('Correo o contraseña incorrectos.')).toBeInTheDocument());
  });
});
