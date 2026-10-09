'use client';

import { useQuery } from '@tanstack/react-query';
import { publicEnv } from '@/shared/config/public-env';
import { programKeys } from '@/features/routines-v2/keys';
import { programService } from '@/features/routines-v2/services';

/**
 * «Sugerido: 62,5 kg × 8–12» bajo el nombre del ejercicio cuando hay un programa
 * de pesas con modo y el ejercicio es uno de sus levantamientos (RF-15, RF-16).
 * Sin programa, sin modo o sin ese ejercicio no pinta nada.
 */
export function SuggestedLoad({ exerciseId }: Readonly<{ exerciseId: string | undefined }>) {
  const enabled = publicEnv.routinesV2 && exerciseId !== undefined;
  const active = useQuery({ queryKey: programKeys.active, queryFn: programService.active, enabled });
  const programId = active.data?.fuerza && active.data.fuerza.modo !== 'NONE' ? active.data.fuerza.id : null;
  const loads = useQuery({
    queryKey: programKeys.nextLoads(programId ?? ''),
    queryFn: () => programService.nextLoads(programId ?? ''),
    enabled: programId !== null,
  });
  const item = loads.data?.items.find((candidate) => candidate.ejercicioId === exerciseId);
  if (!item) return null;
  return (
    <p className="text-sm font-semibold text-[var(--accent-ink)]" data-testid="suggested-load">
      Sugerido: {item.pesoSugeridoKg.toLocaleString('es')} kg × {item.repsMin}–{item.repsMax}
      {item.mensaje ? <span className="block text-xs font-normal text-[var(--text-muted)]">{item.mensaje}</span> : null}
    </p>
  );
}
