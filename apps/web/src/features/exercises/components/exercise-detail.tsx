'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Dumbbell, Heart, Pencil, Play, Target, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { confirm, notify } from '@/shared/notifications';
import { exerciseService } from '@/features/exercises/services/exercise-service';
import { ExerciseMediaManager } from '@/features/exercises/components/exercise-media-manager';
import type { UserRole } from '@/shared/api/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { LoadingPanel } from '@/shared/components/feedback/loading-panel';
import { Badge } from '@/shared/components/ui/badge';
import { Button, ButtonLink } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { DomainImage } from '@/shared/components/media/domain-image';

export function ExerciseDetail({
  id,
  currentUserId,
  role,
}: Readonly<{ id: string; currentUserId: string; role: UserRole }>) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const exercise = useQuery({ queryKey: ['exercise', id], queryFn: () => exerciseService.get(id) });
  const favorites = useQuery({
    queryKey: queryKeys.favorites,
    queryFn: exerciseService.listFavorites,
  });
  const favorite = favorites.data?.some((item) => item.ejercicio.id === id) ?? false;
  const toggle = useMutation({
    mutationFn: () =>
      favorite ? exerciseService.removeFavorite(id) : exerciseService.addFavorite(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.favorites });
      notify.success('Frecuentes actualizados.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const inactivate = useMutation({
    mutationFn: () => exerciseService.inactivatePersonal(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['exercises'] });
      notify.success('Ejercicio personal inactivado.');
      router.replace('/exercises');
    },
    onError: (error: Error) => notify.error(error),
  });

  if (exercise.isLoading) return <LoadingPanel rows={6} />;
  if (exercise.isError || !exercise.data) {
    return (
      <ErrorPanel
        message={exercise.error?.message ?? 'Ejercicio no encontrado.'}
        onRetry={() => exercise.refetch()}
      />
    );
  }
  const item = exercise.data;
  const ownsPersonalExercise =
    item.tipoEjercicio === 'PERSONAL' && item.createdByUsuarioId === currentUserId;
  const canManageMedia =
    ownsPersonalExercise || (item.tipoEjercicio === 'GLOBAL' && role === 'ADMIN');
  const media = item.media.find((entry) => entry.isPrimary) ?? item.media[0];
  const instructions =
    item.instructions['es-BO'] ?? item.instructions.es ?? Object.values(item.instructions)[0];
  const steps =
    item.instructionSteps['es-BO'] ??
    item.instructionSteps.es ??
    Object.values(item.instructionSteps)[0] ??
    [];

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ButtonLink href="/exercises" variant="ghost">
          <ArrowLeft className="size-4" />
          Volver
        </ButtonLink>
        <div className="flex flex-wrap gap-2">
          {ownsPersonalExercise ? (
            <ButtonLink href={`/exercises/${id}/edit`}>
              <Pencil className="size-4" />
              Editar
            </ButtonLink>
          ) : null}
          {ownsPersonalExercise ? (
            <Button
              loading={inactivate.isPending}
              onClick={async () => {
                const result = await confirm({
                  title: 'Inactivar ejercicio',
                  message:
                    'El registro se conserva para auditoría y deja de estar disponible para nuevas sesiones.',
                  severity: 'danger',
                  confirmLabel: 'Inactivar',
                });
                if (result.confirmed) inactivate.mutate();
              }}
              variant="danger"
            >
              <Trash2 className="size-4" />
              Inactivar
            </Button>
          ) : null}
          <Button
            loading={toggle.isPending}
            onClick={() => toggle.mutate()}
            variant={favorite ? 'primary' : 'secondary'}
          >
            <Heart className="size-4" fill={favorite ? 'currentColor' : 'none'} />
            {favorite ? 'Frecuente' : 'Agregar a frecuentes'}
          </Button>
        </div>
      </div>
      <section className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="panel overflow-hidden">
          <div className="grid aspect-video place-items-center border-b border-[var(--border-subtle)] bg-[var(--surface-low)]">
            {media && ['IMAGE', 'GIF'].includes(media.mediaType) ? (
              <DomainImage
                key={media.id}
                alt={media.altText}
                className="size-full object-cover"
                fallbackSrc={media.thumbnailUrl}
                src={media.url}
              />
            ) : media?.mediaType === 'VIDEO' ? (
              <video
                aria-label={media.altText}
                className="size-full object-cover"
                controls
                poster={media.thumbnailUrl ?? undefined}
                preload="metadata"
              >
                <source src={media.url} type={media.mimeType ?? undefined} />
              </video>
            ) : (
              <Dumbbell className="size-14 text-[var(--text-disabled)]" />
            )}
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-wrap gap-2">
              <Badge tone="success">{item.estado}</Badge>
              <Badge tone={item.tipoEjercicio === 'PERSONAL' ? 'info' : 'neutral'}>
                {item.tipoEjercicio}
              </Badge>
              <Badge>{item.dataSource}</Badge>
            </div>
            <p className="data-label mt-7 text-[var(--accent-ink)]">{item.grupoMuscular}</p>
            <h1 className="mt-3 break-words text-3xl font-semibold tracking-[-0.02em] sm:text-5xl">
              {item.nombre}
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--text-muted)]">
              {item.descripcion ?? 'Sin descripción adicional.'}
            </p>
          </div>
        </div>
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title="Objetivo técnico" />
            <CardContent className="grid gap-4">
              <div className="flex items-center gap-3">
                <Target className="size-5 text-[var(--accent-ink)]" />
                <div>
                  <p className="text-sm font-semibold">{item.targetMuscle ?? 'No especificado'}</p>
                  <p className="text-xs text-[var(--text-muted)]">Músculo objetivo</p>
                </div>
              </div>
              <div className="border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-muted)]">
                <p>
                  Parte corporal: <span className="text-[var(--text)]">{item.bodyPart ?? '—'}</span>
                </p>
                <p className="mt-2">
                  Sinergista: <span className="text-[var(--text)]">{item.synergistMuscleGroup ?? '—'}</span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Equipamiento" />
            <CardContent>
              {item.equipment.length ? (
                <div className="flex flex-wrap gap-2">
                  {item.equipment.map((entry) => (
                    <Badge key={entry.id}>{entry.nombre}</Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">Sin equipamiento asociado.</p>
              )}
            </CardContent>
          </Card>
          <ButtonLink href={`/workouts/new?exerciseId=${item.id}`} size="lg" variant="primary">
            <Play className="size-4" />
            Usar en una sesión
          </ButtonLink>
        </div>
      </section>
      <section className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Instrucciones" />
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-7 text-[var(--text-muted)]">
              {instructions ?? 'No hay instrucciones registradas.'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader title="Secuencia" />
          <CardContent>
            {steps.length ? (
              <ol className="grid gap-4">
                {steps.map((step, index) => (
                  <li className="flex gap-4 text-sm leading-7" key={`${index}-${step}`}>
                    <span className="data-value grid size-7 shrink-0 place-items-center rounded-[4px] bg-[var(--surface-high)] text-[var(--accent-ink)]">
                      {index + 1}
                    </span>
                    <span className="text-[var(--text-muted)]">{step}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No hay pasos registrados.</p>
            )}
          </CardContent>
        </Card>
      </section>
      {canManageMedia ? <ExerciseMediaManager exerciseId={item.id} media={item.media} /> : null}
    </div>
  );
}
