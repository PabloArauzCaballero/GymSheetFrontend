import type { PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { routineProgressExportService } from '../routine-progress-export-service';
import { DownloadProgressDialog } from './download-progress-dialog';

vi.mock('../routine-progress-export-service', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../routine-progress-export-service')>()),
  routineProgressExportService: { filterOptions: vi.fn(), download: vi.fn() },
}));

const service = vi.mocked(routineProgressExportService);

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  render(<DownloadProgressDialog />, { wrapper: Wrapper });
  fireEvent.click(screen.getByRole('button', { name: 'Descargar progreso' }));
}

const next = () => fireEvent.click(screen.getByRole('button', { name: /Siguiente/u }));

describe('DownloadProgressDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    service.filterOptions.mockResolvedValue([{ id: 'r-1', nombre: 'Push A', objetivo: 'FUERZA', duracionSemanas: 8 }]);
  });

  it('walks the five steps and sends exactly the filters chosen', async () => {
    service.download.mockResolvedValue({ fileName: 'repp-progreso-rutinas-2026-11-16.pdf', recordsCount: 3 });
    renderDialog();

    fireEvent.click(await screen.findByLabelText(/PDF \(\.pdf\)/u));
    next();
    fireEvent.click(await screen.findByLabelText(/Push A/u));
    expect(screen.getByText('Objetivo: Fuerza · 8 sem')).toBeInTheDocument();
    next();
    fireEvent.click(screen.getByLabelText(/Último año/u));
    next();
    fireEvent.click(screen.getByLabelText(/Sobrecarga progresiva/u));
    next();

    expect(screen.getByText('Push A', { selector: 'dd' })).toBeInTheDocument();
    expect(screen.getByText('PDF', { selector: 'dd' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Descargar progreso' }));

    await waitFor(() =>
      expect(service.download).toHaveBeenCalledWith({
        format: 'pdf',
        routineId: 'r-1',
        datePreset: 'LAST_YEAR',
        includeTargets: true,
        includePrograms: false,
        includeHistory: true,
      }),
    );
    expect(await screen.findByTestId('progress-export-filename')).toHaveTextContent('repp-progreso-rutinas-2026-11-16.pdf');
    expect(screen.getByText('3 filas exportadas · PDF')).toBeInTheDocument();
    expect(screen.getByText('Descarga completada')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Listo' })).toHaveFocus();
  });

  it('downloads everything in the chosen format from the shortcut, and locks the controls meanwhile', async () => {
    let finish: (value: { fileName: string; recordsCount: number }) => void = () => undefined;
    service.download.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderDialog();

    fireEvent.click(await screen.findByLabelText(/CSV \(\.csv\)/u));
    fireEvent.click(screen.getAllByRole('button', { name: 'Descargar todo el historial ahora' })[0]!);

    await waitFor(() => expect(service.download).toHaveBeenCalledWith({
      format: 'csv',
      routineId: 'ALL',
      datePreset: 'ALL',
      includeHistory: true,
      includeTargets: true,
      includePrograms: true,
    }));
    expect(screen.getAllByRole('button', { name: 'Descargar todo el historial ahora' })[0]).toBeDisabled();
    finish({ fileName: 'repp-progreso-rutinas-2026-11-16.csv', recordsCount: 1 });
    expect(await screen.findByText('1 fila exportada · CSV')).toBeInTheDocument();
  });

  it('keeps the wizard and shows the server message inline when the export fails', async () => {
    service.download.mockRejectedValue(new Error('Filtra por rutina o por fechas.'));
    renderDialog();
    fireEvent.click((await screen.findAllByRole('button', { name: 'Descargar todo el historial ahora' }))[0]!);
    expect(await screen.findByText(/Filtra por rutina o por fechas\./u)).toHaveAttribute('role', 'alert');
    expect(screen.getByRole('button', { name: /Siguiente/u })).toBeEnabled();
  });

  it('offers a retry when the routines cannot be loaded', async () => {
    service.filterOptions.mockRejectedValue(new Error('Sin conexión'));
    renderDialog();
    next();
    expect(await screen.findByText('Sin conexión')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(service.filterOptions).toHaveBeenCalledTimes(2));
  });
});
