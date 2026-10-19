'use client';

import { useQuery } from '@tanstack/react-query';
import { programKeys } from '@/features/routines-v2/keys';
import { cardioService, programService } from '@/features/routines-v2/services';
import { ProgramCard } from './program-card';

/**
 * Las tarjetas de programa activo de Rutinas: fuerza arriba y cardio debajo.
 * Si no hay ninguno (o la consulta falla) no pinta nada: el catálogo no depende de esto.
 */
export function ProgramCards() {
  const active = useQuery({ queryKey: programKeys.active, queryFn: programService.active });
  const cardioId = active.data?.cardio?.cardioPlanId ?? null;
  const plans = useQuery({
    queryKey: programKeys.cardioPlans,
    queryFn: cardioService.listPlans,
    enabled: cardioId !== null,
  });
  const { fuerza, cardio } = active.data ?? { fuerza: null, cardio: null };
  if (!fuerza && !cardio) return null;
  return (
    <section aria-label="Tus programas activos" className="grid gap-4 lg:grid-cols-2">
      {fuerza ? <ProgramCard program={fuerza} /> : null}
      {cardio ? (
        <ProgramCard cardioPlan={plans.data?.find((plan) => plan.id === cardioId) ?? null} program={cardio} />
      ) : null}
    </section>
  );
}
