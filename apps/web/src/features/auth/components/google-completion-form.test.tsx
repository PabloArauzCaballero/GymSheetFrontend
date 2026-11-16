import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { GoogleCompletionForm } from './google-completion-form';

const { completeGoogleSignup, fetchCurrentLegal, replace } = vi.hoisted(() => ({
  completeGoogleSignup: vi.fn(),
  fetchCurrentLegal: vi.fn(),
  replace: vi.fn(),
}));
vi.mock('@/features/auth/services/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/services/auth-client')>()),
  completeGoogleSignup,
  fetchCurrentLegal,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <GoogleCompletionForm />
    </QueryClientProvider>,
  );
}

function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), {
    target: { value: '1996-03-15' },
  });
  fireEvent.click(screen.getByRole('radio', { name: 'Mujer' }));
  fireEvent.click(screen.getByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
}

describe('GoogleCompletionForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchCurrentLegal.mockResolvedValue([{ document: 'TERMS', version: '2026-08-25' }]);
  });

  it('reuses the signup fields and sends the profile with the current terms, then goes to onboarding', async () => {
    completeGoogleSignup.mockResolvedValue({ status: 'AUTHENTICATED' });
    renderForm();
    fillAndSubmit();
    await waitFor(() =>
      expect(completeGoogleSignup).toHaveBeenCalledWith({
        nombreCompleto: 'Ana Pérez',
        fechaNacimiento: '1996-03-15',
        genero: 'FEMALE',
        termsVersion: '2026-08-25',
        acceptedTerms: true,
      }),
    );
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'));
  });

  it('asks to start over when the signup token expired', async () => {
    completeGoogleSignup.mockRejectedValue(
      new ApiError({
        message: 'x',
        status: 401,
        kind: 'unauthorized',
        code: 'SIGNUP_TOKEN_INVALID',
      }),
    );
    renderForm();
    fillAndSubmit();
    expect(
      await screen.findByText('Pasó demasiado tiempo. Vuelve a continuar con Google.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Usar otro método' })).toHaveAttribute(
      'href',
      '/register',
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('validates the fields before sending anything', async () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));
    expect(await screen.findByText('Elige tu sexo.')).toBeInTheDocument();
    expect(completeGoogleSignup).not.toHaveBeenCalled();
  });
});
