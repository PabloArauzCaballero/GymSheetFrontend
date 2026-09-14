'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { RecordWeightButton } from '@/features/profile/components/record-weight-dialog';
import type { BodyMeasurement } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { formatDate } from '@/shared/lib/date';

/**
 * El último pesaje, y la puerta para anotar el siguiente.
 *
 * Vive en el panel porque pesarse es un hábito semanal y un hábito que hay que
 * ir a buscar tres pantallas más adentro no se mantiene. Enseña el último dato
 * —no la tabla— para justificar la acción sin convertir el panel en el perfil:
 * la evolución completa sigue estando en «Progreso corporal».
 */

/**
 * El backend ya ordena, pero el orden es el eje de esta tarjeta: si algún día
 * devolviera el histórico al revés, «último pesaje» pasaría a ser el primero y
 * la diferencia saldría con el signo cambiado. Se ordena aquí para que la
 * lectura no dependa de eso.
 */
function sortedByDay(measurements: readonly BodyMeasurement[]): BodyMeasurement[] {
  return [...measurements].sort((a, b) => b.measuredOn.localeCompare(a.measuredOn));
}

/**
 * La diferencia sólo se enseña cuando compara lo comparable: dos pesajes en la
 * misma unidad. Convertir kilos a libras aquí sería inventar un dato que nadie
 * registró, y el signo importa demasiado para adivinarlo.
 */
function deltaLabel(latest: BodyMeasurement, previous: BodyMeasurement | undefined) {
  if (!previous || previous.unit !== latest.unit) return null;
  const delta = latest.weight - previous.weight;
  if (Math.abs(delta) < 0.05) return `Igual que el ${formatDate(previous.measuredOn)}`;
  const rounded = Math.abs(delta).toLocaleString('es-BO', { maximumFractionDigits: 1 });
  return `${delta > 0 ? '+' : '−'}${rounded} ${latest.unit} desde el ${formatDate(previous.measuredOn)}`;
}

export function BodyWeightCard() {
  const measurements = useQuery({
    queryKey: queryKeys.bodyMeasurements,
    queryFn: onboardingService.measurements,
    retry: false,
  });

  const ordered = useMemo(() => sortedByDay(measurements.data ?? []), [measurements.data]);
  const latest = ordered[0];
  const delta = latest ? deltaLabel(latest, ordered[1]) : null;

  return (
    <Card>
      <CardHeader title="Peso corporal" />
      <CardContent className="grid gap-4">
        {latest ? (
          <div className="grid gap-1">
            <p className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
              {latest.weight.toLocaleString('es-BO', { maximumFractionDigits: 1 })}{' '}
              <span className="text-base font-medium text-[var(--text-muted)]">{latest.unit}</span>
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {formatDate(latest.measuredOn)}
              {delta ? ` · ${delta}` : ''}
            </p>
          </div>
        ) : (
          <p className="text-sm leading-6 text-[var(--text-muted)]">
            Todavía no hay pesajes. Anota el primero y la evolución empieza a contar.
          </p>
        )}
        <RecordWeightButton size="sm" variant={latest ? 'secondary' : 'primary'} />
      </CardContent>
    </Card>
  );
}
