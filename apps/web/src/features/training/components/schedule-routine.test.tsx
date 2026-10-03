import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { schedule } = vi.hoisted(() => ({ schedule: vi.fn().mockResolvedValue({}) }));
vi.mock('@/features/training/services/training-service', () => ({
  trainingService: { schedule },
}));
vi.mock('@/shared/notifications', () => ({
  notify: { success: vi.fn(), error: vi.fn() },
}));

import { ScheduleRoutine } from './schedule-routine';

describe('ScheduleRoutine', () => {
  it('programa los días elegidos con una fecha local y duración', async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <ScheduleRoutine routineId="rutina-1" />
      </QueryClientProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'lunes' }));
    fireEvent.click(screen.getByRole('button', { name: 'miércoles' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sin límite' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar en mi semana' }));
    await waitFor(() => expect(schedule).toHaveBeenCalledWith('rutina-1', {
      diasSemana: [1, 3],
      repiteDesde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
      repiteHasta: null,
    }));
  });
});
