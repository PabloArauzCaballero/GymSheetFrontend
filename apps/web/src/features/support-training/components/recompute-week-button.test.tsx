import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecomputeWeekButton } from './recompute-week-button';

const { recomputeWeek, confirm } = vi.hoisted(() => ({
  recomputeWeek: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/features/support-training/services/support-training-service', () => ({
  supportTrainingService: { recomputeWeek },
}));
vi.mock('@/shared/notifications', () => ({
  confirm,
  notify: { success: vi.fn(), error: vi.fn() },
}));

function renderButton() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <RecomputeWeekButton canRespond onResult={vi.fn()} programId="p1" userId="u1" week={2} />
    </QueryClientProvider>,
  );
}

describe('RecomputeWeekButton', () => {
  beforeEach(() => {
    recomputeWeek.mockReset();
    confirm.mockResolvedValue({ confirmed: true });
  });

  it('en reposo muestra un solo icono y, al responder el servidor, vuelve a él sin quedarse cargando', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    recomputeWeek.mockReturnValue(new Promise((r) => (resolve = r)));
    const { container } = renderButton();
    expect(container.querySelectorAll('svg')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'Recalcular la semana 2' }));
    // En curso: solo el indicador de carga, nunca dos iconos a la vez.
    await waitFor(() => expect(container.querySelector('.animate-spin')).not.toBeNull());
    expect(container.querySelectorAll('svg')).toHaveLength(1);

    resolve({ multiplicador: 1, bono: 0 });
    await waitFor(() => expect(container.querySelector('.animate-spin')).toBeNull());
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Recalcular la semana 2' }).hasAttribute('disabled')).toBe(false);
  });
});
