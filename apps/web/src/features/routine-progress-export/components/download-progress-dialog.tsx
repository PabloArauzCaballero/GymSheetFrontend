'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { CircleCheck, Download } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { notify } from '@/shared/notifications';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/shared/components/ui/dialog';
import { FormWizard } from '@/shared/components/ui/form-wizard';
import {
  ALL_DATA,
  routineProgressExportService,
  type ExportFormat,
  type RoutineProgressFilters,
  type SavedExport,
} from '../routine-progress-export-service';
import { buildSteps, filtersFrom } from './progress-wizard-steps';

function SuccessPanel({ saved, format, onDone }: Readonly<{ saved: SavedExport; format: ExportFormat; onDone: () => void }>) {
  // The wizard that held focus is gone: move it to the only next action.
  const done = useRef<HTMLButtonElement>(null);
  useEffect(() => done.current?.focus(), []);
  return (
    <div className="grid justify-items-center gap-4 text-center" role="status">
      <CircleCheck aria-hidden className="size-12 text-[var(--volt)]" />
      <p className="t-headline">Descarga completada</p>
      <p className="t-subhead max-w-md text-[var(--text-muted)]">
        El archivo se generó con los datos que elegiste y tu navegador lo está guardando. Tu descarga quedó
        registrada de forma auditable.
      </p>
      <div className="grid w-full gap-1 rounded-[var(--radius-lg)] bg-[var(--surface-low)] px-4 py-3 text-left">
        <span className="break-all text-sm font-semibold" data-testid="progress-export-filename">
          {saved.fileName}
        </span>
        <span className="text-xs text-[var(--text-muted)]">
          {saved.recordsCount} {saved.recordsCount === 1 ? 'fila exportada' : 'filas exportadas'} · {format.toUpperCase()}
        </span>
      </div>
      <Button className="w-full" onClick={onDone} ref={done} variant="primary">
        Listo
      </Button>
    </div>
  );
}

/**
 * «Descargar progreso» of the routines screen, the web twin of the mobile
 * wizard: five optional-filter steps over one form, a «download everything»
 * shortcut, and a success view that names the file the backend generated.
 */
export function DownloadProgressDialog() {
  const [open, setOpen] = useState(false);
  // Remounting the wizard on every open resets the form to «all data».
  const [session, setSession] = useState(0);
  const options = useQuery({
    queryKey: ['export', 'routine-progress', 'filter-options'],
    queryFn: routineProgressExportService.filterOptions,
    enabled: open,
  });
  const download = useMutation({
    mutationFn: (filters: RoutineProgressFilters) => routineProgressExportService.download(filters),
    onError: (error: Error) => notify.error({ title: 'Error al exportar', message: error.message }),
  });

  const onOpenChange = (next: boolean) => {
    if (download.isPending) return;
    setOpen(next);
    if (next) {
      download.reset();
      setSession((value) => value + 1);
    }
  };

  const steps = buildSteps({
    downloading: download.isPending,
    onDownloadAll: (format) => download.mutate({ format, ...ALL_DATA }),
    routinesState: {
      routines: options.data,
      loading: options.isLoading,
      error: options.isError ? options.error.message : null,
      retry: () => void options.refetch(),
    },
  });

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogTrigger asChild>
        {/* Compact on phones so the routines header does not grow another row. */}
        <Button aria-label="Descargar progreso" className="max-sm:min-h-12 max-sm:px-3.5 max-sm:text-[15px]" variant="secondary">
          <Download aria-hidden className="size-4" />
          <span className="sm:hidden">Progreso</span>
          <span className="hidden sm:inline">Descargar progreso</span>
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-2xl"
        description="Exporta tu historial en Excel, CSV o PDF. Todos los filtros son opcionales."
        title="Descargar progreso"
      >
        {download.isSuccess ? (
          <SuccessPanel format={download.variables.format} onDone={() => onOpenChange(false)} saved={download.data} />
        ) : (
          <div className="grid gap-4" aria-busy={download.isPending}>
            {download.isError ? (
              <p
                className="rounded-[4px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-3 py-2 text-sm text-[var(--danger-text)]"
                role="alert"
              >
                No se pudo generar el archivo. {download.error.message}
              </p>
            ) : null}
            <FormWizard
              key={session}
              onCancel={() => onOpenChange(false)}
              onSubmit={(values) => download.mutate(filtersFrom(values))}
              pending={download.isPending}
              steps={steps}
              submitLabel={download.isPending ? 'Generando archivo…' : 'Descargar progreso'}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
