import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/api/api-error';
import { EmailChangeForm } from './email-change-form';

const mocks = vi.hoisted(() => ({
  requestEmailChange: vi.fn(),
  confirmEmailChange: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock('../services/privacy-service', () => ({
  privacyService: {
    requestEmailChange: mocks.requestEmailChange,
    confirmEmailChange: mocks.confirmEmailChange,
  },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EmailChangeForm />
    </QueryClientProvider>,
  );
}

function requestCode(email = 'Nueva@Example.com', password = 'mi-clave-123') {
  fireEvent.change(screen.getByLabelText('Correo nuevo'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Tu contraseña'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }));
}

describe('EmailChangeForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends the PIN to the new address and confirms it', async () => {
    mocks.requestEmailChange.mockResolvedValue({ accepted: true });
    mocks.confirmEmailChange.mockResolvedValue({ email: 'nueva@example.com', emailVerified: true });
    renderForm();

    requestCode();
    await waitFor(() =>
      expect(mocks.requestEmailChange).toHaveBeenCalledWith({
        newEmail: 'nueva@example.com',
        password: 'mi-clave-123',
      }),
    );
    expect(await screen.findByText('Te enviamos un código a nueva@example.com.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Código del correo nuevo'), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correo' }));
    expect(await screen.findByText('Listo. Ahora entras con nueva@example.com.')).toBeInTheDocument();
    expect(mocks.confirmEmailChange).toHaveBeenCalledWith('654321');
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it('refuses while a moderation sanction is active (409)', async () => {
    mocks.requestEmailChange.mockRejectedValue(
      new ApiError({
        message: 'Bloqueado.',
        status: 409,
        kind: 'conflict',
        code: 'EMAIL_CHANGE_BLOCKED_BY_SANCTION',
      }),
    );
    renderForm();
    requestCode();
    expect(
      await screen.findByText('No puedes cambiar el correo mientras tengas sanciones de moderación vigentes.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Código del correo nuevo')).toBeNull();
  });

  it('says the password is wrong, and that the address is taken when confirming', async () => {
    mocks.requestEmailChange
      .mockRejectedValueOnce(
        new ApiError({ message: 'Mal', status: 400, kind: 'validation', code: 'CURRENT_PASSWORD_INVALID' }),
      )
      .mockResolvedValue({ accepted: true });
    mocks.confirmEmailChange.mockRejectedValue(
      new ApiError({ message: 'Ese correo ya está registrado en otra cuenta.', status: 409, kind: 'conflict' }),
    );
    renderForm();

    requestCode('nueva@example.com', 'equivocada');
    expect(await screen.findByText('La contraseña no es correcta.')).toBeInTheDocument();

    requestCode('nueva@example.com', 'mi-clave-123');
    fireEvent.change(await screen.findByLabelText('Código del correo nuevo'), { target: { value: '111111' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correo' }));
    expect(await screen.findByText('Ese correo ya está registrado en otra cuenta.')).toBeInTheDocument();
  });
});
