'use client';

import { useQuery } from '@tanstack/react-query';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { RecordWeightButton } from '@/features/profile/components/record-weight-dialog';
import { queryKeys } from '@/shared/api/query-keys';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';

export function ProfileMeasurements() {
  const measurements = useQuery({
    queryKey: queryKeys.bodyMeasurements,
    queryFn: onboardingService.measurements,
  });

  return (
    <Card>
      <CardHeader
        // La acción vive junto a la evolución que alimenta, igual que en el
        // móvil: anotar un pesaje es lo que se hace cada semana, y hasta ahora
        // el histórico sólo se llenaba de rebote al guardar el perfil entero.
        action={<RecordWeightButton size="sm" />}
        description="Cada registro se conserva; actualizar el peso no borra mediciones anteriores."
        title="Progreso corporal"
      />
      <CardContent>
        {measurements.isLoading ? (
          <LoadingPanel rows={3} />
        ) : measurements.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.1em] text-[var(--text-muted)]">
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Peso</th>
                  <th className="pb-3 font-medium">Origen</th>
                </tr>
              </thead>
              <tbody>
                {measurements.data.map((item) => (
                  <tr className="border-t border-[var(--border-subtle)]" key={item.id}>
                    <td className="py-3">{item.measuredOn}</td>
                    <td className="tabular-nums">
                      {item.weight} {item.unit}
                    </td>
                    <td>{item.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Aún no hay mediciones guardadas.</p>
        )}
      </CardContent>
    </Card>
  );
}
