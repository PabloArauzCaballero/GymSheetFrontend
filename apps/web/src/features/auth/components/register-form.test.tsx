import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthRequestError } from '@/features/auth/services/auth-client';
import { RegisterForm } from './register-form';

const { register, fetchCurrentLegal, replace } = vi.hoisted(() => ({
  register: vi.fn(),
  fetchCurrentLegal: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/features/auth/services/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/services/auth-client')>()),
  register,
  fetchCurrentLegal,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

const current = [
  { document: 'TERMS', version: '2026-08-25' },
  { document: 'PRIVACY', version: '2026-08-25' },
] as const;

function yearsAgo(years: number, extraDays = 0) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  date.setDate(date.getDate() + extraDays);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function renderForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RegisterForm />
    </QueryClientProvider>,
  );
}

function fillValid({ birthDate = '1996-03-15', sex = 'Mujer' } = {}) {
  fireEvent.change(screen.getByLabelText('Nombre completo'), { target: { value: 'Ana Pérez' } });
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'ana@example.com' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'segura-123' } });
  fireEvent.change(screen.getByLabelText('Confirmar contraseña'), { target: { value: 'segura-123' } });
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), { target: { value: birthDate } });
  fireEvent.click(screen.getByRole('radio', { name: sex }));
  fireEvent.click(screen.getByRole('checkbox'));
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

describe('RegisterForm', () => {
  beforeEach(() => {
    register.mockReset();
    replace.mockReset();
    fetchCurrentLegal.mockReset();
    fetchCurrentLegal.mockResolvedValue(current);
  });

  it('asks for the sex and the birth date before sending anything', async () => {
    renderForm();
    expect(screen.getByRole('radio', { name: 'Hombre' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Mujer' })).not.toBeChecked();
    expect(screen.queryByRole('radio', { name: /Prefiero no decirlo/u })).toBeNull();
    submit();
    expect(await screen.findByText('Elige tu sexo.')).toBeInTheDocument();
    expect(screen.getByText('Indica tu fecha de nacimiento.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('rejects someone who turns 18 tomorrow', async () => {
    renderForm();
    fillValid({ birthDate: yearsAgo(18, 1) });
    submit();
    expect(await screen.findByText('Debes tener al menos 18 años.')).toBeInTheDocument();
    expect(register).not.toHaveBeenCalled();
  });

  it('sends birth date, sex and the current terms version, then goes to onboarding', async () => {
    register.mockResolvedValue({});
    renderForm();
    fillValid({ birthDate: yearsAgo(18) });
    submit();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0]?.[0]).toEqual({
      nombreCompleto: 'Ana Pérez',
      email: 'ana@example.com',
      password: 'segura-123',
      fechaNacimiento: yearsAgo(18),
      genero: 'FEMALE',
      termsVersion: '2026-08-25',
      acceptedTerms: true,
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'));
  });

  it('on outdated terms, unchecks the box, explains it and sends the new version next time', async () => {
    register.mockRejectedValueOnce(
      new AuthRequestError({
        message: 'Los términos cambiaron.',
        status: 409,
        kind: 'conflict',
        code: 'TERMS_VERSION_OUTDATED',
        details: { documents: [{ document: 'TERMS', version: '2026-11-16' }, { document: 'PRIVACY', version: '2026-08-25' }] },
      }),
    );
    register.mockResolvedValueOnce({});
    renderForm();
    fillValid();
    submit();
    expect(await screen.findByText('Actualizamos los términos. Revísalos y acéptalos de nuevo.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    expect(screen.queryByText('Ya existe una cuenta con ese correo.')).toBeNull();

    fireEvent.click(screen.getByRole('checkbox'));
    submit();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
    expect(register.mock.calls[1]?.[0]).toMatchObject({ termsVersion: '2026-11-16' });
  });

  it('shows the server field errors next to their fields', async () => {
    register.mockRejectedValue(
      new AuthRequestError({
        message: 'Datos inválidos.',
        status: 400,
        kind: 'validation',
        fieldErrors: { genero: 'Elige tu sexo.', fechaNacimiento: 'Debes tener al menos 18 años.' },
      }),
    );
    renderForm();
    fillValid();
    submit();
    expect(await screen.findByText('Elige tu sexo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de nacimiento')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Debes tener al menos 18 años.')).toBeInTheDocument();
    expect(screen.queryByText('Datos inválidos.')).toBeNull();
  });
});
