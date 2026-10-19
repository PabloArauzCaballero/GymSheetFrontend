import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trainingInvitationsService } from '../services/training-invitations-service';
import { CreateTrainingInviteDialog } from './create-training-invite-dialog';

vi.mock('../services/training-invitations-service', () => ({
  trainingInvitationsService: { create: vi.fn() },
}));
vi.mock('@/features/training/services/training-service', () => ({
  trainingService: { list: vi.fn() },
}));

import { trainingService } from '@/features/training/services/training-service';

const invitationId = '11111111-1111-4111-8111-111111111111';

function localInputTomorrow() {
  const value = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}T18:30`;
}

function renderDialog() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  render(
    <CreateTrainingInviteDialog
      recipientId="22222222-2222-4222-8222-222222222222"
      recipientName="Ana"
    />,
    { wrapper: Wrapper },
  );
}

describe('CreateTrainingInviteDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(trainingService.list).mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 100,
      total: 0,
      totalPages: 0,
    });
    vi.stubGlobal('crypto', { randomUUID: () => '33333333-3333-4333-8333-333333333333' });
  });

  it('uses the same accessible form and sends one invitation for the profile/chat entrypoint', async () => {
    vi.mocked(trainingInvitationsService.create).mockResolvedValue({ id: invitationId } as never);
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Entrenemos juntos' }));

    expect(await screen.findByRole('dialog', { name: 'Invitar a entrenar' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Día y hora'), {
      target: { value: localInputTomorrow() },
    });
    fireEvent.change(screen.getByLabelText('Lugar'), { target: { value: 'Parque Central' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() => expect(trainingInvitationsService.create).toHaveBeenCalledTimes(1));
    expect(trainingInvitationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientId: '22222222-2222-4222-8222-222222222222',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        durationMinutes: 60,
        place: { kind: 'PUBLIC_PLACE', label: 'Parque Central' },
        mode: 'OWN_ROUTINES',
        clientRequestId: '33333333-3333-4333-8333-333333333333',
      }),
    );
    expect(await screen.findByText('Invitación enviada a Ana.')).toBeInTheDocument();
  });

  it('reuses the same request id when the unchanged invitation is retried', async () => {
    vi.mocked(trainingInvitationsService.create)
      .mockRejectedValueOnce(new Error('Conexión interrumpida.'))
      .mockResolvedValueOnce({ id: invitationId } as never);
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Entrenemos juntos' }));
    await screen.findByRole('dialog', { name: 'Invitar a entrenar' });
    fireEvent.change(screen.getByLabelText('Día y hora'), {
      target: { value: localInputTomorrow() },
    });
    fireEvent.change(screen.getByLabelText('Lugar'), { target: { value: 'Parque Central' } });
    const send = screen.getByRole('button', { name: 'Enviar invitación' });

    fireEvent.click(send);
    expect(await screen.findByRole('alert')).toHaveTextContent('Conexión interrumpida.');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));
    await screen.findByText('Invitación enviada a Ana.');

    expect(trainingInvitationsService.create).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(trainingInvitationsService.create).mock.calls;
    expect(calls[0]?.[0].clientRequestId).toBe(calls[1]?.[0].clientRequestId);
  });

  it('loads own routines and sends the selected routine only for a shared session', async () => {
    const routineId = '55555555-5555-4555-8555-555555555555';
    vi.mocked(trainingService.list).mockResolvedValue({
      items: [{ id: routineId, nombre: 'Fuerza A' }],
      page: 1,
      pageSize: 100,
      total: 1,
      totalPages: 1,
    } as never);
    vi.mocked(trainingInvitationsService.create).mockResolvedValue({ id: invitationId } as never);
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Entrenemos juntos' }));
    await screen.findByRole('dialog', { name: 'Invitar a entrenar' });
    fireEvent.change(screen.getByLabelText('Modalidad'), {
      target: { value: 'SHARED_SESSION' },
    });
    expect(trainingService.list).toHaveBeenCalledWith('mine');
    await screen.findByRole('option', { name: 'Fuerza A' });
    fireEvent.change(await screen.findByLabelText('Rutina compartida'), {
      target: { value: routineId },
    });
    fireEvent.change(screen.getByLabelText('Día y hora'), {
      target: { value: localInputTomorrow() },
    });
    fireEvent.change(screen.getByLabelText('Lugar'), { target: { value: 'Parque Central' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() =>
      expect(trainingInvitationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ mode: 'SHARED_SESSION', routineSessionId: routineId }),
      ),
    );
  });

  it('locks every payload field while the request is in flight', async () => {
    vi.mocked(trainingInvitationsService.create).mockReturnValue(new Promise(() => {}));
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Entrenemos juntos' }));
    await screen.findByRole('dialog', { name: 'Invitar a entrenar' });
    fireEvent.change(screen.getByLabelText('Día y hora'), {
      target: { value: localInputTomorrow() },
    });
    fireEvent.change(screen.getByLabelText('Lugar'), { target: { value: 'Parque Central' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));

    await waitFor(() => expect(trainingInvitationsService.create).toHaveBeenCalledTimes(1));
    expect(screen.getByLabelText('Día y hora')).toBeDisabled();
    expect(screen.getByLabelText('Duración')).toBeDisabled();
    expect(screen.getByLabelText('Lugar')).toBeDisabled();
    expect(screen.getByLabelText('Nota (opcional)')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.getByRole('dialog', { name: 'Invitar a entrenar' })).toBeInTheDocument();
    expect(trainingInvitationsService.create).toHaveBeenCalledTimes(1);
  });
});
