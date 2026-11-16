import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, downloadFromApi } from '@/shared/api/api-client';
import { saveBlob } from '@/shared/lib/data-transfer';
import { workoutService } from '@/features/workouts/services/workout-service';
import { ALL_DATA, exportFileSchema, routineProgressExportService } from './routine-progress-export-service';

vi.mock('@/shared/api/api-client', () => ({ apiRequest: vi.fn(), downloadFromApi: vi.fn() }));
vi.mock('@/shared/lib/data-transfer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/shared/lib/data-transfer')>()),
  saveBlob: vi.fn(),
}));

const pdfBase64 = btoa('%PDF-1.3\n%fake');
// jsdom's Blob has no `arrayBuffer()`; FileReader is what it does implement.
const bytesOf = (blob: Blob) =>
  new Promise<Uint8Array>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.readAsArrayBuffer(blob);
  });


describe('routineProgressExportService.download', () => {
  beforeEach(() => vi.clearAllMocks());

  it('POSTs the wizard filters and saves the decoded file under the backend filename', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      fileName: 'repp-progreso-rutinas-2026-11-16.pdf',
      mimeType: 'application/pdf',
      recordsCount: 12,
      base64: pdfBase64,
    });
    const filters = { format: 'pdf' as const, ...ALL_DATA, datePreset: 'LAST_90' as const };

    const saved = await routineProgressExportService.download(filters);

    expect(apiRequest).toHaveBeenCalledWith('/export/routine-progress', exportFileSchema, {
      method: 'POST',
      body: filters,
      timeoutMs: 60_000,
    });
    expect(saved).toEqual({ fileName: 'repp-progreso-rutinas-2026-11-16.pdf', recordsCount: 12 });
    const [blob, fileName] = vi.mocked(saveBlob).mock.calls[0]!;
    expect(fileName).toBe('repp-progreso-rutinas-2026-11-16.pdf');
    expect(blob.type).toBe('application/pdf');
    // Binary-safe: the bytes are the decoded base64, never its text.
    expect(new TextDecoder().decode(await bytesOf(blob))).toBe('%PDF-1.3\n%fake');
  });

  it('falls back to a repp-* name with the right extension when the backend sends none', async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      fileName: '',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      recordsCount: 0,
      base64: '',
    });
    await routineProgressExportService.download({ format: 'excel', ...ALL_DATA });
    expect(vi.mocked(saveBlob).mock.calls[0]![1]).toBe('repp-progreso-rutinas.xlsx');
  });

  it('ignores a server filename that is not a plain repp file name', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ fileName: '../evil.exe', mimeType: 'application/pdf', recordsCount: 0, base64: '' });
    await routineProgressExportService.download({ format: 'pdf', ...ALL_DATA });
    expect(vi.mocked(saveBlob).mock.calls[0]![1]).toBe('repp-progreso-rutinas.pdf');
  });

  it('rejects a payload whose base64 is not valid', () => {
    expect(exportFileSchema.safeParse({ fileName: 'a.pdf', mimeType: 'application/pdf', recordsCount: 0, base64: 'no%base64' }).success).toBe(false);
  });

  it('propagates the server error and saves nothing', async () => {
    vi.mocked(apiRequest).mockRejectedValue(new Error('Filtra por rutina o por fechas.'));
    await expect(routineProgressExportService.download({ format: 'csv', ...ALL_DATA })).rejects.toThrow(
      'Filtra por rutina o por fechas.',
    );
    expect(saveBlob).not.toHaveBeenCalled();
  });

  it('reads the routines offered by the filter-options endpoint', async () => {
    vi.mocked(apiRequest).mockResolvedValue({ routines: [{ id: 'r1', nombre: 'Push A' }] });
    await expect(routineProgressExportService.filterOptions()).resolves.toEqual([{ id: 'r1', nombre: 'Push A' }]);
    expect(vi.mocked(apiRequest).mock.calls[0]![0]).toBe('/export/routine-progress/filter-options');
  });
});

describe('workoutService.exportPdf', () => {
  it('downloads the binary PDF as repp-avance.pdf and reports that name', async () => {
    vi.mocked(downloadFromApi).mockResolvedValue(undefined);
    await expect(workoutService.exportPdf()).resolves.toBe('repp-avance.pdf');
    expect(downloadFromApi).toHaveBeenCalledWith('/export/workout-history/pdf', 'repp-avance.pdf');
  });

  it('names the CSV like the mobile app does (repp-avance.csv)', async () => {
    vi.mocked(downloadFromApi).mockResolvedValue(undefined);
    await expect(workoutService.exportCsv()).resolves.toBe('repp-avance.csv');
    expect(downloadFromApi).toHaveBeenCalledWith('/export/workout-history/csv', 'repp-avance.csv');
  });
});
