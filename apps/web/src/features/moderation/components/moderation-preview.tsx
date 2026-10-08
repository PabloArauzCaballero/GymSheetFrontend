'use client';

import { useQuery } from '@tanstack/react-query';
import { Dumbbell, MessageSquareQuote, Users } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';
import {
  moderationPreviewService,
  type ExercisePreview,
  type RoutinePreview,
  type RoutineReach,
} from '@/features/moderation/services/moderation-preview-service';
import type { ModerationTargetKind } from '@/features/moderation/services/moderation-service';

const WEEKDAY = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

function PreviewSkeleton() {
  return <div aria-busy="true" className="h-28 animate-pulse rounded-[8px] bg-[var(--surface-low)]" />;
}

function Unavailable({ children }: Readonly<{ children: string }>) {
  return <p className="text-sm text-[var(--text-muted)]">{children}</p>;
}

function repsText(min: number | null, max: number | null) {
  if (min === null && max === null) return null;
  return min === max || max === null || min === null ? `${max ?? min} reps` : `${min}–${max} reps`;
}

function RoutineBody({
  routine,
  reach,
}: Readonly<{ routine: RoutinePreview; reach: RoutineReach | null }>) {
  const exerciseCount = routine.dias.reduce((sum, day) => sum + day.ejercicios.length, 0);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-base font-semibold">{routine.nombre}</p>
        {routine.descripcion ? (
          <p className="mt-1 text-sm text-[var(--text-muted)]">{routine.descripcion}</p>
        ) : null}
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          {routine.dias.length === 1 ? '1 día' : `${routine.dias.length} días`} ·{' '}
          {exerciseCount === 1 ? '1 ejercicio' : `${exerciseCount} ejercicios`}
        </p>
      </div>

      {reach ? (
        <p
          className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[4px] border border-[var(--border-subtle)] p-3 text-sm"
          data-testid="alcance"
        >
          <Users aria-hidden className="size-4 text-[var(--text-muted)]" />
          <span>
            <strong>Alcance</strong>
          </span>
          <span>{reach.copiasVivas} con una copia activa</span>
          <span>{reach.copias} copias en total</span>
          <span>{reach.activaciones} activaciones</span>
        </p>
      ) : (
        <Unavailable>El alcance no está disponible con tus permisos.</Unavailable>
      )}

      <ul className="flex flex-col gap-2">
        {routine.dias.map((day, index) => (
          <li
            className="rounded-[4px] border border-[var(--border-subtle)] p-3"
            key={`${day.nombre ?? 'dia'}-${index}`}
          >
            <p className="text-sm font-medium">
              {day.nombre ?? `Día ${index + 1}`}
              {day.diaSemana ? (
                <span className="font-normal text-[var(--text-muted)]">
                  {' '}
                  · {WEEKDAY[day.diaSemana - 1]}
                </span>
              ) : null}
            </p>
            <ul className="mt-1 text-sm text-[var(--text-muted)]">
              {day.ejercicios.map((exercise, position) => (
                <li key={`${exercise.ejercicio.nombre}-${position}`}>
                  {[
                    exercise.ejercicio.nombre,
                    `${exercise.seriesObjetivo} series`,
                    repsText(exercise.repsMin, exercise.repsMax),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RoutinePreviewView({ id }: Readonly<{ id: string }>) {
  const routine = useQuery({
    queryKey: ['admin', 'moderation', 'preview', 'ROUTINE', id],
    queryFn: () => moderationPreviewService.routine(id),
  });
  const reach = useQuery({
    queryKey: ['admin', 'moderation', 'reach', id],
    queryFn: () => moderationPreviewService.routineReach(id),
    retry: false,
  });
  if (routine.isPending) return <PreviewSkeleton />;
  if (routine.isError) return <Unavailable>No pudimos cargar la rutina denunciada.</Unavailable>;
  return <RoutineBody reach={reach.data ?? null} routine={routine.data} />;
}

function ExerciseBody({ exercise }: Readonly<{ exercise: ExercisePreview }>) {
  const steps = Object.values(exercise.instructions);
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-base font-semibold">
        <Dumbbell aria-hidden className="size-4 text-[var(--text-muted)]" />
        {exercise.nombre}
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        {exercise.grupoMuscular ?? 'Sin grupo muscular'} ·{' '}
        {exercise.media.length === 1 ? '1 archivo' : `${exercise.media.length} archivos`} de
        medios
      </p>
      {exercise.descripcion ? <p className="text-sm">{exercise.descripcion}</p> : null}
      {steps.length > 0 ? (
        <ol className="list-decimal pl-5 text-sm text-[var(--text-muted)]">
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function ExercisePreviewView({ id }: Readonly<{ id: string }>) {
  const exercise = useQuery({
    queryKey: ['admin', 'moderation', 'preview', 'EXERCISE', id],
    queryFn: () => moderationPreviewService.exercise(id),
  });
  if (exercise.isPending) return <PreviewSkeleton />;
  if (exercise.isError) return <Unavailable>No pudimos cargar el ejercicio denunciado.</Unavailable>;
  return <ExerciseBody exercise={exercise.data} />;
}

/**
 * El texto de un comentario no se puede pedir por su id: el backend sólo lo
 * sirve colgando de su rutina o ejercicio. Lo que sí hay es lo que dijeron
 * quienes lo denunciaron, que es lo que se enseña.
 */
function CommentPreview({ details }: Readonly<{ details: readonly string[] }>) {
  return (
    <div className="flex flex-col gap-2">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <MessageSquareQuote aria-hidden className="size-4 text-[var(--text-muted)]" />
        Comentario denunciado
      </p>
      <p className="text-sm text-[var(--text-muted)]">
        {details.length > 0
          ? 'El texto original no está disponible en la cola; esto es lo que dijeron quienes lo denunciaron:'
          : 'El texto original no está disponible en la cola y quienes lo denunciaron no añadieron detalles.'}
      </p>
      {details.map((detail) => (
        <blockquote
          className="border-l-2 border-[var(--border)] pl-3 text-sm"
          key={detail}
        >
          {detail}
        </blockquote>
      ))}
    </div>
  );
}

/** Vista previa del contenido, según el tipo. Los tipos antiguos no la tienen. */
export function ContentPreview({
  targetKind,
  targetId,
  reportDetails,
}: Readonly<{
  targetKind: ModerationTargetKind;
  targetId: string;
  reportDetails: readonly string[];
}>) {
  if (targetKind !== 'ROUTINE' && targetKind !== 'EXERCISE' && targetKind !== 'COMMENT') {
    return null;
  }
  return (
    <Card>
      <CardContent className="p-4" data-testid="vista-previa">
        {targetKind === 'ROUTINE' ? <RoutinePreviewView id={targetId} /> : null}
        {targetKind === 'EXERCISE' ? <ExercisePreviewView id={targetId} /> : null}
        {targetKind === 'COMMENT' ? <CommentPreview details={reportDetails} /> : null}
      </CardContent>
    </Card>
  );
}
