'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pause, Play, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { workoutService } from '@/features/workouts/services/workout-service';
import { programKeys } from '@/features/routines-v2/keys';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Input } from '@/shared/components/ui/input';
import { Select } from '@/shared/components/ui/select';
import { notify } from '@/shared/notifications';
import { formatClock, toCardioSet, validateLog, type CardioLogDraft, type CardioLogErrors } from '../log-model';
import type { WorkoutFinish } from '@/shared/api/schemas';

const empty: CardioLogDraft = { minutos: '', distanciaKm: '', fcMedia: '', rpe: '' };

/**
 * Registra una sesión de cardio (RF-17): cronómetro (o minutos a mano), distancia,
 * pulso medio y esfuerzo 1–10. Crea la sesión, anota una serie `CARDIO` y la
 * termina; el resultado dice cuántos minutos cuentan para la semana.
 */
export function CardioLogger() {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<CardioLogDraft>(empty);
  const [errors, setErrors] = useState<CardioLogErrors>({});
  const [exerciseId, setExerciseId] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<WorkoutFinish | null>(null);
  const started = useRef<number | null>(null);

  const exercises = useQuery({
    queryKey: ['exercises', 'cardio'],
    queryFn: () => exerciseService.list({ bodyPart: 'cardio', pageSize: 40 }),
  });
  const items = exercises.data?.items ?? [];
  const chosen = exerciseId || items[0]?.id || '';

  useEffect(() => {
    if (!running) return;
    const base = Date.now() - seconds * 1000;
    started.current = base;
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - base) / 1000)), 500);
    return () => window.clearInterval(timer);
    // `seconds` solo fija el punto de partida al reanudar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const patch = (next: Partial<CardioLogDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setErrors({});
  };
  const stop = () => {
    setRunning(false);
    if (seconds > 0) patch({ minutos: String(Math.max(1, Math.round((seconds / 60) * 10) / 10)) });
  };

  const save = useMutation({
    mutationFn: async () => {
      const session = await workoutService.start({ observacion: 'Sesión de cardio' });
      const exercise = (await workoutService.addExercise(session.id, { ejercicioId: chosen, orden: 1 })) as { id: string };
      await workoutService.addSet(exercise.id, toCardioSet(draft));
      return workoutService.finish(session.id);
    },
    onSuccess: async (finished) => {
      setResult(finished);
      await queryClient.invalidateQueries({ queryKey: programKeys.all });
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['progression'] });
      notify.success('Sesión de cardio guardada.');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (result) {
    const cardio = result.cardio;
    return (
      <div className="mx-auto grid w-full max-w-2xl gap-6" data-testid="cardio-result">
        <PageHeader eyebrow="Cardio" title="Sesión guardada" />
        <section aria-label="Resultado" className="panel grid gap-3 p-6">
          {cardio ? (
            <>
              <p className="text-lg font-semibold">
                Cuentan {Math.round(cardio.minutosCuentan)} min · {Math.round(cardio.minutosSemana)} / {Math.round(cardio.objetivoMinutosSemana)} min esta semana
              </p>
              {!cardio.sesionCuenta ? <p className="text-sm text-[var(--text-muted)]">Para contar en el plan necesitas al menos 10 minutos.</p> : null}
              {cardio.cumpleObjetivoSesion ? <p className="text-sm">Cumpliste el objetivo de esta sesión.</p> : null}
              {cardio.consejo.reason ? <p className="text-sm text-[var(--text-muted)]">{cardio.consejo.reason}</p> : null}
            </>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No tienes un plan de cardio activo, así que esta sesión no suma a ninguna semana.</p>
          )}
          {result.progression ? <p className="text-sm">+{result.progression.pointsEarned} puntos por esta sesión.</p> : null}
        </section>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/routines" variant="primary">
            Ver mis programas
          </ButtonLink>
          <Button
            onClick={() => {
              setResult(null);
              setDraft(empty);
              setSeconds(0);
            }}
            variant="secondary"
          >
            Registrar otra
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-2xl gap-8">
      <div>
        <ButtonLink href="/routines" variant="ghost">
          <ArrowLeft aria-hidden className="size-4" />
          Volver a rutinas
        </ButtonLink>
      </div>
      <PageHeader description="Cronometra tu sesión o escribe los minutos a mano." eyebrow="Cardio" title="Registrar una sesión" />
      <form
        className="grid gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          const found = validateLog(draft);
          if (Object.keys(found).length > 0 || !chosen) {
            setErrors(found);
            return;
          }
          save.mutate();
        }}
      >
        <Field label="Actividad">
          <Select onChange={(event) => setExerciseId(event.target.value)} value={chosen}>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </Select>
        </Field>

        <section aria-label="Cronómetro" className="panel grid justify-items-center gap-4 p-6">
          <p aria-live="off" className="text-5xl font-semibold tabular-nums tracking-[-0.03em]" data-testid="clock">
            {formatClock(seconds)}
          </p>
          <div className="flex gap-2">
            {running ? (
              <Button onClick={stop} type="button" variant="secondary">
                <Pause aria-hidden className="size-4" />
                Parar
              </Button>
            ) : (
              <Button onClick={() => setRunning(true)} type="button" variant="primary">
                <Play aria-hidden className="size-4" />
                {seconds > 0 ? 'Seguir' : 'Empezar'}
              </Button>
            )}
            <Button
              aria-label="Reiniciar el cronómetro"
              disabled={seconds === 0 && !running}
              onClick={() => {
                setRunning(false);
                setSeconds(0);
              }}
              type="button"
              variant="ghost"
            >
              <RotateCcw aria-hidden className="size-4" />
            </Button>
          </div>
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field error={errors.minutos} label="Minutos">
            <Input inputMode="decimal" onChange={(event) => patch({ minutos: event.target.value })} value={draft.minutos} />
          </Field>
          <Field error={errors.distanciaKm} label="Distancia (km)">
            <Input inputMode="decimal" onChange={(event) => patch({ distanciaKm: event.target.value })} value={draft.distanciaKm} />
          </Field>
          <Field error={errors.fcMedia} hint="Opcional, si tienes pulsómetro." label="Pulso medio (lpm)">
            <Input inputMode="numeric" onChange={(event) => patch({ fcMedia: event.target.value })} value={draft.fcMedia} />
          </Field>
          <Field error={errors.rpe} hint="1 muy suave, 10 máximo. Sin pulsómetro, usa este." label="Esfuerzo (1–10)">
            <Input inputMode="numeric" onChange={(event) => patch({ rpe: event.target.value })} value={draft.rpe} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button disabled={items.length === 0} loading={save.isPending} type="submit" variant="primary">
            Guardar sesión
          </Button>
        </div>
      </form>
    </div>
  );
}
