import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { RegisterForm } from './register-form';

const { register, fetchCurrentLegal, fetchRegisterTicket, replace } = vi.hoisted(() => ({
  register: vi.fn(),
  fetchCurrentLegal: vi.fn(),
  fetchRegisterTicket: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@/features/auth/services/auth-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/auth/services/auth-client')>()),
  register,
  fetchCurrentLegal,
  fetchRegisterTicket,
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
}));

const current = [
  { document: 'TERMS', version: '2026-08-25' },
  { document: 'PRIVACY', version: '2026-08-25' },
  { document: 'COMMUNITY', version: '2026-08-25' },
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
    fetchRegisterTicket.mockReset();
    fetchRegisterTicket
      .mockResolvedValueOnce({ ticket: 'ticket-1', issuedAt: '2026-11-16T10:00:00.000Z' })
      .mockResolvedValue({ ticket: 'ticket-2', issuedAt: '2026-11-16T10:01:00.000Z' });
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

  it('sends birth date, sex, the current terms version and the form ticket, then goes to onboarding', async () => {
    register.mockResolvedValue({});
    renderForm();
    await waitFor(() => expect(fetchRegisterTicket).toHaveBeenCalledTimes(1));
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
      ticket: 'ticket-1',
    });
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/onboarding'));
  });

  it('on outdated terms, unchecks the box, explains it and sends the new version next time', async () => {
    register.mockRejectedValueOnce(
      new ApiError({
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

  it('accepts the terms, the privacy policy and the community rules in one checkbox', () => {
    renderForm();
    const box = screen.getByRole('checkbox');
    // The accessible-name algorithm pads inline links with spaces; the visible sentence has none.
    expect(box).toHaveAccessibleName(
      /^Acepto los términos y condiciones ?, la política de privacidad y las normas de la comunidad ?\.$/u,
    );
    expect(screen.getByRole('link', { name: 'términos y condiciones' })).toHaveAttribute('href', '/terminos');
    expect(screen.getByRole('link', { name: 'política de privacidad' })).toHaveAttribute('href', '/privacidad');
    expect(screen.getByRole('link', { name: 'normas de la comunidad' })).toHaveAttribute('href', '/normas');
  });

  it('asks again when the community rules changed at signup (409 listing COMMUNITY)', async () => {
    register.mockRejectedValueOnce(
      new ApiError({
        message: 'Cambiaron las normas.',
        status: 409,
        kind: 'conflict',
        code: 'TERMS_VERSION_OUTDATED',
        details: {
          documents: [
            { document: 'TERMS', version: '2026-08-25', contentSha256: null },
            { document: 'PRIVACY', version: '2026-08-25', contentSha256: null },
            { document: 'COMMUNITY', version: '2026-12-01', contentSha256: null },
          ],
        },
      }),
    );
    renderForm();
    // Let the current versions load, so a later refetch can only come from an unreadable 409.
    await waitFor(() => expect(fetchCurrentLegal).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    fillValid();
    submit();
    expect(await screen.findByText('Actualizamos los términos. Revísalos y acéptalos de nuevo.')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).not.toBeChecked();
    // The fresh list came in the 409 itself: no extra round trip for the versions.
    expect(fetchCurrentLegal).toHaveBeenCalledTimes(1);
  });

  it('shows the server field errors next to their fields', async () => {
    register.mockRejectedValue(
      new ApiError({
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

  it('renders the honeypot outside the accessibility tree and the tab order', () => {
    renderForm();
    const honeypot = document.querySelector<HTMLInputElement>('input[name="website"]');
    expect(honeypot).not.toBeNull();
    expect(honeypot).toHaveAttribute('tabindex', '-1');
    expect(honeypot).toHaveAttribute('autocomplete', 'off');
    expect(honeypot?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Sitio web' })).toBeNull();
  });

  it('forwards a filled honeypot so the server can refuse the bot', async () => {
    register.mockResolvedValue({});
    renderForm();
    await waitFor(() => expect(fetchRegisterTicket).toHaveBeenCalled());
    fillValid();
    fireEvent.change(document.querySelector('input[name="website"]')!, { target: { value: 'https://spam.example' } });
    submit();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0]?.[0]).toMatchObject({ website: 'https://spam.example' });
  });

  it('on SIGNUP_REJECTED shows only the generic message and sends a fresh ticket next time', async () => {
    register.mockRejectedValueOnce(
      new ApiError({
        message: 'Motivo interno que no se muestra.',
        status: 400,
        kind: 'validation',
        code: 'SIGNUP_REJECTED',
      }),
    );
    register.mockResolvedValueOnce({});
    renderForm();
    await waitFor(() => expect(fetchRegisterTicket).toHaveBeenCalledTimes(1));
    fillValid();
    submit();

    expect(await screen.findByText('No pudimos crear tu cuenta. Inténtalo de nuevo.')).toBeInTheDocument();
    expect(screen.queryByText('Motivo interno que no se muestra.')).toBeNull();
    await waitFor(() => expect(fetchRegisterTicket).toHaveBeenCalledTimes(2));

    submit();
    await waitFor(() => expect(register).toHaveBeenCalledTimes(2));
    expect(register.mock.calls[0]?.[0]).toMatchObject({ ticket: 'ticket-1' });
    expect(register.mock.calls[1]?.[0]).toMatchObject({ ticket: 'ticket-2' });
  });

  it('asks for a new ticket after a 409 too (tickets are single-use)', async () => {
    register.mockRejectedValueOnce(new ApiError({ message: 'Existe.', status: 409, kind: 'conflict' }));
    renderForm();
    await waitFor(() => expect(fetchRegisterTicket).toHaveBeenCalledTimes(1));
    fillValid();
    submit();
    expect(await screen.findByText('Ya existe una cuenta con ese correo.')).toBeInTheDocument();
    await waitFor(() => expect(fetchRegisterTicket).toHaveBeenCalledTimes(2));
  });
});
