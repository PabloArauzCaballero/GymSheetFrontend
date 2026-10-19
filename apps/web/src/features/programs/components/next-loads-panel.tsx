'use client';

import { useQuery } from '@tanstack/react-query';
import { programKeys } from '@/features/routines-v2/keys';
import { programService } from '@/features/routines-v2/services';

/** «Sugerido: 62,5 kg × 8–12»: la carga para la próxima sesión de cada levantamiento (RF-15). */
export function NextLoadsPanel({ programId }: Readonly<{ programId: string }>) {
  const loads = useQuery({ queryKey: programKeys.nextLoads(programId), queryFn: () => programService.nextLoads(programId) });
  if (loads.isLoading || loads.isError || !loads.data || loads.data.items.length === 0) return null;
  return (
    <section aria-labelledby="loads-title" className="panel grid gap-4 p-5" data-testid="next-loads">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-[-0.02em]" id="loads-title">
          Cargas sugeridas
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Semana {loads.data.semana ?? '–'}
          {loads.data.esDescarga ? ' · descarga' : ''}
        </p>
      </div>
      <ul className="grid list-none gap-3">
        {loads.data.items.map((item) => (
          <li className="flex flex-wrap items-baseline justify-between gap-2" key={item.ejercicioId}>
            <span className="font-semibold">{item.ejercicioNombre ?? 'Ejercicio'}</span>
            <span className="text-sm">
              Sugerido: <strong>{item.pesoSugeridoKg.toLocaleString('es')} kg</strong> × {item.repsMin}–{item.repsMax}
              {item.mensaje ? <span className="block text-xs text-[var(--text-muted)]">{item.mensaje}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
