import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { workoutService } from '@/features/workouts/services/workout-service';
import { WorkoutList } from './workout-list';

vi.mock('@/features/workouts/services/workout-service', () => ({
  workoutService: { list: vi.fn(), exportPdf: vi.fn(), exportCsv: vi.fn(), exportJson: vi.fn() },
}));

const service = vi.mocked(workoutService);

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  render(<WorkoutList />, { wrapper: Wrapper });
}

describe('WorkoutList exports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.list.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0, totalPages: 0 });
  });

  it('downloads the progress PDF and locks every export while it is generated', async () => {
    let finish: (name: string) => void = () => undefined;
    service.exportPdf.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderList();

    fireEvent.click(screen.getByRole('button', { name: 'Avance en PDF' }));

    expect(service.exportPdf).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Generando…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Datos en CSV' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Datos en JSON' })).toBeDisabled();
    finish('repp-avance.pdf');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Avance en PDF' })).toBeEnabled());
  });

  it('shows the failure inline, not only as a toast', async () => {
    service.exportPdf.mockRejectedValue(new Error('La exportación agotó el tiempo de espera.'));
    renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Avance en PDF' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/^La exportación agotó el tiempo de espera\.$/u);
  });
});
