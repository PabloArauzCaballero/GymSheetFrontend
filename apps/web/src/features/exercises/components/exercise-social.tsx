'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart, Star } from 'lucide-react';
import type { ReactNode } from 'react';
import { exerciseCommunityService } from '@/features/routine-wizard/services';
import type { Exercise } from '@/shared/api/contracts';
import { cn } from '@/shared/lib/cn';
import { notify } from '@/shared/notifications';

type Patch = Partial<Pick<Exercise, 'meGusta' | 'meGustaTotal' | 'esFavorito'>>;

function ToggleButton({
  active,
  label,
  accessibilityLabel,
  disabled,
  onClick,
  testId,
  children,
}: Readonly<{
  active: boolean;
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onClick: () => void;
  testId: string;
  children: ReactNode;
}>) {
  return (
    <button
      aria-label={accessibilityLabel}
      aria-pressed={active}
      className={cn(
        'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-md)] border px-4 text-sm font-semibold transition-[background-color,border-color,transform] active:scale-[0.97] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]',
        active
          ? 'border-[var(--volt)] bg-[rgb(var(--accent-channels)/0.1)] text-[var(--accent-ink)]'
          : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text)] hover:bg-[var(--surface)]',
      )}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
      {label}
    </button>
  );
}

/**
 * ♥ «me gusta» (público, con contador) y ☆ favorito (privado) de un ejercicio
 * (RF-07, D7). Ambos son optimistas: la ficha cambia al pulsar y, si el servidor
 * rechaza, vuelve a como estaba y avisa. El contador se repinta con lo que
 * devuelve el servidor, no con una cuenta propia.
 */
export function ExerciseSocial({ exercise }: Readonly<{ exercise: Exercise }>) {
  const queryClient = useQueryClient();
  const key = ['exercise', exercise.id] as const;
  const patch = (change: Patch) =>
    queryClient.setQueryData<Exercise>(key, (current) =>
      current ? { ...current, ...change } : current,
    );

  const like = useMutation({
    mutationFn: (next: boolean) =>
      next
        ? exerciseCommunityService.like(exercise.id)
        : exerciseCommunityService.unlike(exercise.id),
    onMutate: (next) => {
      const previous = { meGusta: exercise.meGusta ?? false, meGustaTotal: exercise.meGustaTotal };
      patch({ meGusta: next, meGustaTotal: Math.max(0, exercise.meGustaTotal + (next ? 1 : -1)) });
      return previous;
    },
    onSuccess: (result) => patch({ meGusta: result.meGusta, meGustaTotal: result.meGustaTotal }),
    onError: (error, _next, previous) => {
      if (previous) patch(previous);
      notify.error(error);
    },
  });

  const favorite = useMutation({
    mutationFn: (next: boolean) => exerciseCommunityService.setFavorite(exercise.id, next),
    onMutate: (next) => {
      const previous = { esFavorito: exercise.esFavorito ?? false };
      patch({ esFavorito: next });
      return previous;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['exercises'] }),
    onError: (error, _next, previous) => {
      if (previous) patch(previous);
      notify.error(error);
    },
  });

  const liked = exercise.meGusta ?? false;
  const isFavorite = exercise.esFavorito ?? false;
  const total = exercise.meGustaTotal;
  const people = `${total} ${total === 1 ? 'persona' : 'personas'}`;

  return (
    <div className="flex flex-wrap gap-3" role="group" aria-label="Me gusta y favorito">
      <ToggleButton
        accessibilityLabel={liked ? `Me gusta, activado. ${people}` : `Dar me gusta. ${people}`}
        active={liked}
        disabled={like.isPending}
        label={`Me gusta · ${total}`}
        onClick={() => like.mutate(!liked)}
        testId="exercise-like"
      >
        <Heart aria-hidden className="size-4" fill={liked ? 'currentColor' : 'none'} />
      </ToggleButton>
      <ToggleButton
        accessibilityLabel={
          isFavorite ? 'Favorito, activado. Solo tú lo ves' : 'Marcar como favorito. Solo tú lo ves'
        }
        active={isFavorite}
        disabled={favorite.isPending}
        label="Favorito"
        onClick={() => favorite.mutate(!isFavorite)}
        testId="exercise-favorite"
      >
        <Star aria-hidden className="size-4" fill={isFavorite ? 'currentColor' : 'none'} />
      </ToggleButton>
    </div>
  );
}
