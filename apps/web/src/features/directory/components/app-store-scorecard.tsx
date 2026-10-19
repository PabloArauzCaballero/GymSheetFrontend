'use client';

import type { RatingHistogram } from '@/shared/api/schemas';

interface AppStoreScorecardProps {
  score: number;
  totalReviews: number;
  histogram: RatingHistogram;
  activeRatingFilter?: number;
  onFilterRating: (rating?: number) => void;
  onOpenComposer: () => void;
  hasUserReview: boolean;
}

export function AppStoreScorecard({
  score,
  totalReviews,
  histogram,
  activeRatingFilter,
  onFilterRating,
  onOpenComposer,
  hasUserReview,
}: AppStoreScorecardProps) {
  const stars = [5, 4, 3, 2, 1] as const;

  const getPercentage = (count: number) => {
    if (!totalReviews || totalReviews === 0) return 0;
    return Math.round((count / totalReviews) * 100);
  };

  return (
    <div className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md p-6 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white tracking-tight">
            Valoraciones y reseñas
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Experiencias de atletas verificados y miembros de la comunidad GymSheet
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenComposer}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-sm hover:shadow hover:scale-[1.02] active:scale-[0.98]"
        >
          <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {hasUserReview ? 'Editar tu reseña' : 'Escribir una reseña'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-6">
        {/* Lado Izquierdo: Gran Puntuación App Store */}
        <div className="md:col-span-4 flex flex-col items-center justify-center text-center sm:border-r border-neutral-100 dark:border-neutral-800/80 sm:pr-6">
          <div className="text-6xl font-black text-neutral-900 dark:text-white tracking-tight tabular-nums">
            {score > 0 ? score.toFixed(1) : '0.0'}
          </div>

          <div className="flex items-center gap-1 mt-2 text-amber-400">
            {[1, 2, 3, 4, 5].map((index) => {
              const filled = score >= index;
              const half = !filled && score >= index - 0.5;

              return (
                <svg key={index} className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                  {half ? (
                    <defs>
                      <linearGradient id={`half-star-${index}`}>
                        <stop offset="50%" stopColor="currentColor" />
                        <stop offset="50%" stopColor="#d1d5db" stopOpacity="0.4" />
                      </linearGradient>
                    </defs>
                  ) : null}
                  <path
                    fill={half ? `url(#half-star-${index})` : filled ? 'currentColor' : '#d1d5db'}
                    className={!filled && !half ? 'dark:opacity-20' : ''}
                    d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  />
                </svg>
              );
            })}
          </div>

          <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mt-2 tabular-nums">
            {totalReviews === 1 ? '1 valoración' : `${totalReviews.toLocaleString()} valoraciones`}
          </span>
        </div>

        {/* Lado Derecho: 5 Barras del Histograma App Store */}
        <div className="md:col-span-8 space-y-2">
          {stars.map((star) => {
            const count = histogram[star] || 0;
            const percentage = getPercentage(count);
            const isSelected = activeRatingFilter === star;

            return (
              <button
                key={star}
                type="button"
                onClick={() => onFilterRating(isSelected ? undefined : star)}
                className={`w-full group flex items-center gap-3 text-xs rounded-xl p-1.5 transition-colors ${
                  isSelected
                    ? 'bg-amber-500/10 ring-1 ring-amber-500/30'
                    : 'hover:bg-neutral-100/70 dark:hover:bg-neutral-800/40'
                }`}
              >
                {/* Estrella y número */}
                <span className="w-7 text-right font-semibold text-neutral-700 dark:text-neutral-300 tabular-nums flex items-center justify-end gap-1">
                  {star}
                  <svg className="w-3.5 h-3.5 fill-amber-400 text-amber-400" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </span>

                {/* Barra de progreso */}
                <div className="flex-1 h-2.5 bg-neutral-200/80 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all duration-500 group-hover:bg-amber-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Porcentaje y conteo */}
                <span className="w-12 text-right font-medium text-neutral-400 tabular-nums">
                  {percentage}%
                </span>
              </button>
            );
          })}

          {activeRatingFilter && (
            <div className="flex items-center justify-between pt-2 px-1 text-xs">
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                Filtrando por {activeRatingFilter} estrellas
              </span>
              <button
                type="button"
                onClick={() => onFilterRating(undefined)}
                className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white underline underline-offset-2"
              >
                Limpiar filtro
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
