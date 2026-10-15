import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { trainingInvitationsService } from '../services/training-invitations-service';
import { TrainingInvitationsClient } from './training-invitations-client';
vi.mock('../services/training-invitations-service', () => ({
  trainingInvitationsService: {
    list: vi.fn(),
    respond: vi.fn(),
    exportCalendar: vi.fn(),
    sharedSession: vi.fn(),
  },
}));

const me = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const id = '33333333-3333-4333-8333-333333333333';
const invite = {
  id,
  state: 'PENDING' as const,
  currentRevision: 2,
  participants: [other, me],
  revisions: [
    {
      revision: 2,
      proposerId: other,
      startsAt: '2030-06-02T14:00:00.000Z',
      timeZone: 'UTC',
      durationMinutes: 60,
      place: { kind: 'PUBLIC_PLACE' as const, label: 'Parque Central' },
      mode: 'OWN_ROUTINES' as const,
      createdAt: '2030-06-01T14:00:00.000Z',
    },
  ],
  createdAt: '2030-06-01T14:00:00.000Z',
  updatedAt: '2030-06-01T14:00:00.000Z',
  response: null,
  meeting: null,
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TrainingInvitationsClient sessionUserId={me} />
    </QueryClientProvider>,
  );
}

describe('TrainingInvitationsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'confirm',
      vi.fn(() => true),
    );
    vi.stubGlobal('crypto', { randomUUID: () => '44444444-4444-4444-8444-444444444444' });
    vi.mocked(trainingInvitationsService.list).mockResolvedValue([invite]);
  });

  it('accepts only the visible current revision and refreshes the agenda', async () => {
    vi.mocked(trainingInvitationsService.respond).mockResolvedValue({} as never);
    renderPage();
    expect(await screen.findByText('Parque Central')).toBeInTheDocument();
    expect(screen.getByText(/Revisión 2/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Descargar calendario (.ics)' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(
        new Intl.DateTimeFormat('es-BO', {
          dateStyle: 'full',
          timeStyle: 'short',
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }).format(new Date(invite.revisions[0]!.startsAt)),
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar invitación' }));

    await waitFor(() =>
      expect(trainingInvitationsService.respond).toHaveBeenCalledWith(id, {
        expectedRevision: 2,
        decision: 'ACCEPT',
        clientRequestId: '44444444-4444-4444-8444-444444444444',
      }),
    );
    await waitFor(() => expect(trainingInvitationsService.list).toHaveBeenCalledTimes(2));
  });

  it('confirms before declining and sends the visible revision', async () => {
    vi.mocked(trainingInvitationsService.respond).mockResolvedValue({} as never);
    renderPage();
    expect(await screen.findByText('Parque Central')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));

    expect(window.confirm).toHaveBeenCalledWith(
      '¿Rechazar esta invitación? Esta acción no se puede deshacer.',
    );
    await waitFor(() =>
      expect(trainingInvitationsService.respond).toHaveBeenCalledWith(id, {
        expectedRevision: 2,
        decision: 'DECLINE',
        clientRequestId: '44444444-4444-4444-8444-444444444444',
      }),
    );
  });

  it('does not send a decline when the user cancels confirmation', async () => {
    vi.stubGlobal(
      'confirm',
      vi.fn(() => false),
    );
    renderPage();
    expect(await screen.findByText('Parque Central')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Rechazar' }));
    expect(trainingInvitationsService.respond).not.toHaveBeenCalled();
  });

  it('shows a cancelled meeting in the agenda without an accept action', async () => {
    vi.mocked(trainingInvitationsService.list).mockResolvedValue([
      {
        ...invite,
        state: 'CANCELLED',
        revisions: [
          {
            ...invite.revisions[0]!,
            mode: 'SHARED_SESSION',
            routineSessionId: '66666666-6666-4666-8666-666666666666',
          },
        ],
        meeting: {
          id: '55555555-5555-4555-8555-555555555555',
          acceptedRevision: 2,
          startsAt: invite.revisions[0]!.startsAt,
          timeZone: 'UTC',
          placeLabel: 'Parque Central',
          cancelledAt: '2030-06-01T15:00:00.000Z',
        },
      },
    ]);
    vi.mocked(trainingInvitationsService.sharedSession).mockResolvedValue({
      inviteId: id,
      routineId: '66666666-6666-4666-8666-666666666666',
      revision: 2,
      name: 'Fuerza A',
      exercises: [],
    });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceptar invitación' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar calendario (.ics)' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Abrir lugar en mapas' })).toHaveAttribute(
      'href',
      'https://www.google.com/maps/search/?api=1&query=Parque%20Central',
    );
    expect(trainingInvitationsService.sharedSession).not.toHaveBeenCalled();
    expect(screen.queryByText('Rutina compartida: Fuerza A')).not.toBeInTheDocument();
  });

  it('orders upcoming meetings by start time even when the API returns newest updates first', async () => {
    const earlyId = '66666666-6666-4666-8666-666666666666';
    const meeting = {
      id: '55555555-5555-4555-8555-555555555555',
      acceptedRevision: 2,
      startsAt: '2030-06-03T14:00:00.000Z',
      timeZone: 'UTC',
      placeLabel: 'Parque Central',
      cancelledAt: null,
    };
    vi.mocked(trainingInvitationsService.list).mockResolvedValue([
      { ...invite, state: 'ACCEPTED', meeting },
      {
        ...invite,
        id: earlyId,
        state: 'ACCEPTED',
        meeting: {
          ...meeting,
          id: '77777777-7777-4777-8777-777777777777',
          startsAt: '2030-06-02T14:00:00.000Z',
        },
      },
    ]);
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Agenda' })).toBeInTheDocument();
    expect(
      screen
        .getAllByTestId(/^training-invitation-/)
        .map((node) => node.getAttribute('data-testid')),
    ).toEqual([`training-invitation-${earlyId}`, `training-invitation-${id}`]);
  });

  it('downloads an existing meeting ICS and explains how repeat imports behave', async () => {
    vi.mocked(trainingInvitationsService.exportCalendar).mockResolvedValue(undefined);
    vi.mocked(trainingInvitationsService.list).mockResolvedValue([
      {
        ...invite,
        state: 'ACCEPTED',
        meeting: {
          id: '55555555-5555-4555-8555-555555555555',
          acceptedRevision: 2,
          startsAt: invite.revisions[0]!.startsAt,
          timeZone: 'UTC',
          placeLabel: 'Parque Central',
          cancelledAt: null,
        },
      },
    ]);
    renderPage();

    const download = await screen.findByRole('button', { name: 'Descargar calendario (.ics)' });
    expect(screen.getByText(/funciona sin permiso de calendario/)).toBeInTheDocument();
    expect(screen.getByText(/puede ofrecer actualizar el evento existente/)).toBeInTheDocument();
    fireEvent.click(download);
    await waitFor(() => expect(trainingInvitationsService.exportCalendar).toHaveBeenCalledWith(id));
  });

  it('loads and renders only the accepted shared-session snapshot in the agenda', async () => {
    const accepted = {
      ...invite,
      state: 'ACCEPTED' as const,
      revisions: [{ ...invite.revisions[0]!, mode: 'SHARED_SESSION' as const }],
      meeting: {
        id: '55555555-5555-4555-8555-555555555555',
        acceptedRevision: 2,
        startsAt: invite.revisions[0]!.startsAt,
        timeZone: 'UTC',
        placeLabel: 'Parque Central',
        cancelledAt: null,
      },
    };
    vi.mocked(trainingInvitationsService.list).mockResolvedValue([accepted]);
    vi.mocked(trainingInvitationsService.sharedSession).mockResolvedValue({
      inviteId: id,
      routineId: '66666666-6666-4666-8666-666666666666',
      revision: 2,
      name: 'Fuerza A',
      exercises: [
        {
          exerciseId: '77777777-7777-4777-8777-777777777777',
          exerciseName: 'Press banca',
          order: 1,
          targetSets: 3,
          repsMin: 8,
          repsMax: 12,
          restSeconds: 90,
        },
      ],
    });
    renderPage();

    expect(await screen.findByText('Rutina compartida: Fuerza A')).toBeInTheDocument();
    expect(screen.getByText('1. Press banca')).toBeInTheDocument();
    expect(screen.getByText('3 series · 8–12 repeticiones · 90 s de descanso')).toBeInTheDocument();
    expect(
      screen.getByText(/progreso y los pesos de cada persona son privados/),
    ).toBeInTheDocument();
    expect(trainingInvitationsService.sharedSession).toHaveBeenCalledWith(id);
  });

  it('does not let the current proposer accept their own revision', async () => {
    vi.mocked(trainingInvitationsService.list).mockResolvedValue([
      {
        ...invite,
        revisions: [{ ...invite.revisions[0]!, proposerId: me }],
      },
    ]);
    renderPage();
    expect(await screen.findByText('Parque Central')).toBeInTheDocument();
    expect(screen.getByText('Esperando respuesta de la otra persona.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aceptar invitación' })).not.toBeInTheDocument();
  });

  it('fetches a separate invitation list when the session changes in the same client', async () => {
    vi.mocked(trainingInvitationsService.list)
      .mockResolvedValueOnce([invite])
      .mockResolvedValueOnce([]);
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <TrainingInvitationsClient sessionUserId={me} />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('Parque Central')).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <TrainingInvitationsClient sessionUserId={other} />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Todavía no tienes invitaciones')).toBeInTheDocument();
    expect(screen.queryByText('Parque Central')).not.toBeInTheDocument();
    expect(trainingInvitationsService.list).toHaveBeenCalledTimes(2);
  });
});
