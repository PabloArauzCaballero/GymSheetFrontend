'use client';

import { useQuery } from '@tanstack/react-query';
import { onboardingService } from '@/features/onboarding/services/onboarding-service';
import { queryKeys } from '@/shared/api/query-keys';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { Section } from '@/shared/components/mobile/section';
import { Card, CardContent } from '@/shared/components/ui/card';
import { formatDate } from '@/shared/lib/date';

export function ProfileMeasurements() {
  const measurements = useQuery({
    queryKey: queryKeys.bodyMeasurements,
    queryFn: onboardingService.measurements,
  });

  return (
    // «Registrar peso» lives once, in «Peso corporal» right above. The heading sits outside the card.
    <Section title="Progreso corporal">
    <Card>
      <CardContent className="grid gap-4">
        <p className="t-subhead text-[var(--text-muted)]">Cada registro se conserva; actualizar el peso no borra mediciones anteriores.</p>
        {measurements.isLoading ? (
          <LoadingPanel rows={3} />
        ) : measurements.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-muted)]">
                  <th className="pb-3 font-medium">Fecha</th>
                  <th className="pb-3 font-medium">Peso</th>
                  <th className="pb-3 font-medium">Origen</th>
                </tr>
              </thead>
              <tbody>
                {measurements.data.map((item) => (
                  <tr className="border-t border-[var(--border-subtle)]" key={item.id}>
                    <td className="py-3 tabular-nums">{formatDate(item.measuredOn)}</td>
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
    </Section>
  );
}
