'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import type { ContentKind } from '@gymsheet/types';
import { ApiError } from '@/shared/api/api-error';
import { queryKeys } from '@/shared/api/query-keys';
import { cn } from '@/shared/lib/cn';
import { notify } from '@/shared/notifications';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { ratingLabel } from '@/features/routines-v2/labels';
import { communityService } from '@/features/routines-v2/services';

/**
 * Valoración de 1 a 5 estrellas (RF-12). Un toque valora; tocar la misma estrella
 * otra vez quita la valoración. Quien es autor del contenido no puede valorarlo y
 * se le dice por qué, en vez de dejar el control mudo.
 */
export function RatingStars({
  kind,
  id,
  isOwner,
  routineId,
}: Readonly<{ kind: ContentKind; id: string; isOwner: boolean; routineId?: string }>) {
  const queryClient = useQueryClient();
  const rating = useQuery({
    queryKey: routineV2Keys.rating(kind, id),
    queryFn: () => communityService.rating(kind, id),
  });
  const save = useMutation({
    mutationFn: (stars: number | null) =>
      stars === null ? communityService.removeRating(kind, id) : communityService.rate(kind, id, stars),
    onSuccess: async (result) => {
      queryClient.setQueryData(routineV2Keys.rating(kind, id), result);
      if (routineId) await queryClient.invalidateQueries({ queryKey: queryKeys.routine(routineId) });
      await queryClient.invalidateQueries({ queryKey: routineV2Keys.all });
    },
    onError: (error: Error) =>
      notify.error(
        error instanceof ApiError && error.code === 'CANNOT_RATE_OWN'
          ? new Error('No puedes valorar tu propio contenido.')
          : error,
      ),
  });
  const mine = rating.data?.miValoracion ?? null;
  return (
    <div className="grid gap-2" data-testid="rating">
      <div className="flex flex-wrap items-center gap-3">
        <div aria-label="Tu valoración" className="flex" role="radiogroup">
          {[1, 2, 3, 4, 5].map((stars) => (
            <button
              aria-checked={mine === stars}
              aria-label={`${stars} ${stars === 1 ? 'estrella' : 'estrellas'}`}
              className="grid size-11 place-items-center rounded-[var(--radius-sm)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--volt)] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isOwner || save.isPending}
              key={stars}
              onClick={() => save.mutate(mine === stars ? null : stars)}
              role="radio"
              type="button"
            >
              <Star
                aria-hidden
                className={cn('size-6', mine !== null && stars <= mine ? 'text-[var(--accent-ink)]' : 'text-[var(--text-muted)]')}
                fill={mine !== null && stars <= mine ? 'currentColor' : 'none'}
              />
            </button>
          ))}
        </div>
        <p aria-live="polite" className="text-sm text-[var(--text-muted)]" data-testid="rating-summary">
          {rating.data ? ratingLabel(rating.data.promedio, rating.data.total) : 'Cargando…'}
        </p>
      </div>
      {isOwner ? (
        <p className="text-xs text-[var(--text-muted)]">No puedes valorar tu propia rutina.</p>
      ) : mine ? (
        <p className="text-xs text-[var(--text-muted)]">Tu valoración: {mine} de 5. Toca la misma estrella para quitarla.</p>
      ) : null}
    </div>
  );
}
