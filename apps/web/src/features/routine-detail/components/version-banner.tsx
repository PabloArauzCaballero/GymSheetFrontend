'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { Routine } from '@gymsheet/types';
import { queryKeys } from '@/shared/api/query-keys';
import { Button } from '@/shared/components/ui/button';
import { notify } from '@/shared/notifications';
import { routineBuilderService } from '@/features/routine-wizard/services';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { sharingService } from '@/features/routines-v2/services';
import { diffRoutines } from '../routine-diff';

/**
 * «Hay una versión nueva de la original» (RF-10, D2): una copia nunca cambia
 * sola. Se pueden ver los cambios, aplicarlos (se conserva el nombre y los
 * ajustes de semana) o ignorar el aviso.
 */
export function VersionBanner({ routine }: Readonly<{ routine: Routine }>) {
  const queryClient = useQueryClient();
  const [showChanges, setShowChanges] = useState(false);
  const [ignored, setIgnored] = useState(false);
  const sourceId = routine.basadaEnRutinaId;
  const source = useQuery({
    queryKey: queryKeys.routine(sourceId ?? ''),
    queryFn: () => routineBuilderService.get(sourceId ?? ''),
    enabled: showChanges && sourceId !== null,
  });
  const apply = useMutation({
    mutationFn: () => sharingService.syncFromSource(routine.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.routine(routine.id) });
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.calendar(routine.id) });
      notify.success('Copia actualizada. Conservamos tu nombre y tus ajustes de semana.');
    },
    onError: (error: Error) => notify.error(error),
  });
  if (!routine.hayVersionNueva || ignored) return null;
  const lines = source.data ? diffRoutines(routine, source.data) : [];
  return (
    <section
      aria-label="Versión nueva disponible"
      className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--info-border)] bg-[var(--info-bg)] p-4 text-[var(--info-text)]"
      data-testid="version-banner"
    >
      <p className="flex items-center gap-2 text-sm font-semibold">
        <RefreshCw aria-hidden className="size-4 shrink-0" />
        Hay una versión nueva de la rutina original.
      </p>
      <p className="text-sm">Tu copia no cambia sola: tú decides si la actualizas.</p>
      {showChanges ? (
        source.isLoading ? (
          <p className="text-sm">Buscando los cambios…</p>
        ) : lines.length === 0 ? (
          <p className="text-sm">Los cambios no tocan ejercicios, series ni días.</p>
        ) : (
          <ul aria-label="Cambios de la versión nueva" className="list-disc pl-5 text-sm">
            {lines.map((line) => (
              <li key={line.texto}>{line.texto}</li>
            ))}
          </ul>
        )
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button aria-expanded={showChanges} onClick={() => setShowChanges((current) => !current)} size="sm" variant="secondary">
          {showChanges ? 'Ocultar cambios' : 'Ver cambios'}
        </Button>
        <Button loading={apply.isPending} onClick={() => apply.mutate()} size="sm" variant="primary">
          Aplicar
        </Button>
        <Button onClick={() => setIgnored(true)} size="sm" variant="ghost">
          Ignorar
        </Button>
      </div>
    </section>
  );
}
