'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { WEEKDAYS, WEEKDAY_INITIALS, WEEKDAY_NAMES } from '@gymsheet/hooks';
import { cardioModalities, type CardioModality } from '@gymsheet/types';
import { ApiError } from '@/shared/api/api-error';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { confirm, notify } from '@/shared/notifications';
import { queryKeys } from '@/shared/api/query-keys';
import { routineBuilderService } from '@/features/routine-wizard/services';
import { programKeys } from '@/features/routines-v2/keys';
import { programService, cardioService } from '@/features/routines-v2/services';
import { profileService } from '@/features/profile/services/profile-service';
import {
  MODALITY_LABEL,
  ZONE_NAME,
  buildCardioPlan,
  defaultCardioDraft,
  hasCardioErrors,
  maxHeartRate,
  sessionMinutesForWeek,
  validateCardio,
  weightsAdvice,
  zoneBounds,
  zoneOfRpe,
  type CardioDraft,
  type CardioErrors,
} from '../cardio-model';

const num = (value: string) => (value.trim() === '' ? null : Number(value.replace(',', '.')));

function Zones({ draft, hrMax }: Readonly<{ draft: CardioDraft; hrMax: number | null }>) {
  if (draft.tipo === 'RPE') {
    const zone = zoneOfRpe(draft.rpe);
    return (
      <p className="text-sm text-[var(--text-muted)]" data-testid="rpe-hint">
        Esfuerzo {draft.rpe} de 10: equivale a la zona {zone} ({ZONE_NAME[zone - 1]}). No necesitas pulsómetro.
      </p>
    );
  }
  const rest = num(draft.fcReposo);
  const max = num(draft.fcMax) ?? hrMax;
  if (max === null) {
    return <p className="text-sm text-[var(--text-muted)]">Escribe tu FC máxima para ver tus zonas en pulsaciones.</p>;
  }
  return (
    <table aria-label="Tus zonas de pulso" className="w-full text-sm" data-testid="zones">
      <thead>
        <tr className="text-left text-xs text-[var(--text-muted)]">
          <th className="pb-1 font-semibold" scope="col">Zona</th>
          <th className="pb-1 font-semibold" scope="col">Pulsaciones</th>
        </tr>
      </thead>
      <tbody>
        {[1, 2, 3, 4, 5].map((zone) => {
          const bounds = zoneBounds(zone, max, rest);
          return (
            <tr className={zone === draft.zona ? 'font-semibold' : ''} key={zone}>
              <th className="py-1 text-left font-normal" scope="row">
                {zone === draft.zona ? '▸ ' : ''}Z{zone} · {ZONE_NAME[zone - 1]}
              </th>
              <td>
                {bounds.min}–{bounds.max} lpm
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/**
 * Asistente corto de cardio (RF-17): modalidad, días, minutos, intensidad
 * (zonas de pulso o esfuerzo 1–10), intervalos opcionales y progresión. Al final
 * crea el plan y lo activa como programa de cardio, en paralelo al de pesas.
 */
export function CardioWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CardioDraft>(defaultCardioDraft);
  const [errors, setErrors] = useState<CardioErrors>({});
  const profile = useQuery({ queryKey: ['profile'], queryFn: profileService.getProfile, retry: false });
  const active = useQuery({ queryKey: programKeys.active, queryFn: programService.active });
  // Los días de pesas salen de la rutina del programa activo, para avisar «primero las pesas».
  const strengthRoutineId = active.data?.fuerza?.rutinaId ?? null;
  const strengthRoutine = useQuery({
    queryKey: queryKeys.routine(strengthRoutineId ?? ''),
    queryFn: () => routineBuilderService.get(strengthRoutineId ?? ''),
    enabled: strengthRoutineId !== null,
  });
  const weightDays = (strengthRoutine.data?.dias ?? []).map((day) => day.diaSemana).filter((day): day is number => day !== null);
  const age = profile.data?.edad ?? null;
  const hrMax = age ? maxHeartRate(age) : null;
  const patch = (next: Partial<CardioDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setErrors({});
  };
  const activate = useMutation({
    mutationFn: async (replace: boolean) =>
      cardioService.activate({
        cardioPlan: buildCardioPlan(draft, `${MODALITY_LABEL[draft.modalidad]} ${draft.minutos} min`),
        duracionSemanas: Number(draft.semanas),
        replace,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: programKeys.all });
      notify.success('Plan de cardio activado.');
      router.push('/routines');
    },
    onError: async (error: Error) => {
      if (error instanceof ApiError && error.code === 'PROGRAM_ACTIVE_CONFLICT') {
        const result = await confirm({
          title: 'Ya tienes un plan de cardio',
          message: '¿Lo apagamos y activamos este? Tu programa de pesas no se toca.',
          confirmLabel: 'Apagar y activar',
        });
        if (result.confirmed) activate.mutate(true);
        return;
      }
      notify.error(error);
    },
  });
  const toggleDay = (day: number) =>
    patch({ dias: draft.dias.includes(day) ? draft.dias.filter((value) => value !== day) : [...draft.dias, day].sort((a, b) => a - b) });
  const advice = weightsAdvice(draft.dias, weightDays);
  const week2 = sessionMinutesForWeek(Number(draft.minutos) || 0, Number(draft.progresion) || 0, 2);

  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8">
      <div>
        <ButtonLink href="/routines" variant="ghost">
          <ArrowLeft aria-hidden className="size-4" />
          Volver a rutinas
        </ButtonLink>
      </div>
      <PageHeader
        description="Registro manual: tú anotas minutos, distancia y esfuerzo. Convive con tu programa de pesas."
        eyebrow="Plan de cardio"
        title="Crea tu plan de cardio"
      />
      <form
        className="grid gap-8"
        onSubmit={(event) => {
          event.preventDefault();
          const found = validateCardio(draft);
          if (hasCardioErrors(found)) {
            setErrors(found);
            return;
          }
          activate.mutate(false);
        }}
      >
        <fieldset className="grid gap-3">
          <legend className="data-label mb-1">Modalidad</legend>
          <div className="flex flex-wrap gap-2">
            {cardioModalities.map((modality: CardioModality) => (
              <ChoiceChip key={modality} onClick={() => patch({ modalidad: modality })} selected={draft.modalidad === modality}>
                {MODALITY_LABEL[modality]}
              </ChoiceChip>
            ))}
          </div>
        </fieldset>

        <fieldset className="grid gap-3">
          <legend className="data-label mb-1">Días</legend>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day) => (
              <ChoiceChip aria-label={WEEKDAY_NAMES[day]} key={day} onClick={() => toggleDay(day)} selected={draft.dias.includes(day)}>
                {WEEKDAY_INITIALS[day]}
              </ChoiceChip>
            ))}
          </div>
          {errors.dias ? <p className="text-sm text-[var(--danger-text)]" role="alert">{errors.dias}</p> : null}
          {advice ? <p className="text-sm text-[var(--text-muted)]" data-testid="weights-first">{advice}</p> : null}
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={errors.minutos} label="Minutos por sesión">
            <Input inputMode="numeric" onChange={(event) => patch({ minutos: event.target.value })} value={draft.minutos} />
          </Field>
          <Field error={errors.semanas} label="Duración en semanas">
            <Input inputMode="numeric" onChange={(event) => patch({ semanas: event.target.value })} value={draft.semanas} />
          </Field>
        </div>

        <fieldset className="grid gap-4">
          <legend className="data-label mb-1">Intensidad</legend>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Cómo medir la intensidad">
            <ChoiceChip onClick={() => patch({ tipo: 'ZONA_FC' })} selected={draft.tipo === 'ZONA_FC'}>
              Por zonas de pulso
            </ChoiceChip>
            <ChoiceChip onClick={() => patch({ tipo: 'RPE' })} selected={draft.tipo === 'RPE'}>
              Por sensación (1–10)
            </ChoiceChip>
          </div>
          {draft.tipo === 'ZONA_FC' ? (
            <div className="grid gap-4">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={errors.fcReposo} hint="Opcional: con él usamos Karvonen." label="Pulso en reposo (lpm)">
                  <Input inputMode="numeric" onChange={(event) => patch({ fcReposo: event.target.value })} value={draft.fcReposo} />
                </Field>
                <Field
                  error={errors.fcMax}
                  hint={hrMax ? `Estimada con tu edad: ${hrMax} lpm (208 − 0,7 × edad).` : 'Sin tu edad no podemos estimarla.'}
                  label="FC máxima (lpm)"
                >
                  <Input
                    inputMode="numeric"
                    onChange={(event) => patch({ fcMax: event.target.value })}
                    placeholder={hrMax ? String(hrMax) : ''}
                    value={draft.fcMax}
                  />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2" role="group" aria-label="Zona objetivo">
                {[1, 2, 3, 4, 5].map((zone) => (
                  <ChoiceChip aria-label={`Zona ${zone}`} key={zone} onClick={() => patch({ zona: zone })} selected={draft.zona === zone}>
                    Z{zone}
                  </ChoiceChip>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2" role="group" aria-label="Esfuerzo objetivo">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <ChoiceChip aria-label={`Esfuerzo ${value}`} key={value} onClick={() => patch({ rpe: value })} selected={draft.rpe === value}>
                  {value}
                </ChoiceChip>
              ))}
            </div>
          )}
          <Zones draft={draft} hrMax={hrMax} />
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="data-label mb-1">Intervalos (opcional)</legend>
          <Checkbox checked={draft.intervalos} label="Entrenar por intervalos" onChange={(event) => patch({ intervalos: event.target.checked })} />
          {draft.intervalos ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Trabajo (s)">
                <Input inputMode="numeric" onChange={(event) => patch({ trabajoSeg: event.target.value })} value={draft.trabajoSeg} />
              </Field>
              <Field label="Descanso (s)">
                <Input inputMode="numeric" onChange={(event) => patch({ descansoSeg: event.target.value })} value={draft.descansoSeg} />
              </Field>
              <Field label="Rondas">
                <Input inputMode="numeric" onChange={(event) => patch({ rondas: event.target.value })} value={draft.rondas} />
              </Field>
            </div>
          ) : null}
          {errors.intervalos ? <p className="text-sm text-[var(--danger-text)]" role="alert">{errors.intervalos}</p> : null}
        </fieldset>

        <Field error={errors.progresion} hint={`La semana 2 pedirá ${week2} min por sesión. Nunca más de 10 % por semana.`} label="Progresión por semana (%)">
          <Input className="max-w-40" inputMode="numeric" onChange={(event) => patch({ progresion: event.target.value })} value={draft.progresion} />
        </Field>

        <div className="flex justify-end gap-2">
          <Button loading={activate.isPending} type="submit" variant="primary">
            Activar plan de cardio
          </Button>
        </div>
      </form>
    </div>
  );
}
