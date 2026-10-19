'use client';

import { useState } from 'react';
import type { EntityReviewsResponse } from '@/shared/api/schemas';
import { directoryClient } from '../services/directory-client';
import { AppStoreScorecard } from './app-store-scorecard';
import { ReviewCard } from './review-card';
import { ReviewComposerModal } from './review-composer-modal';

interface DirectoryReviewsSectionProps {
  initialData: EntityReviewsResponse;
  entityName: string;
  currentUserId?: string;
}

export function DirectoryReviewsSection({
  initialData,
  entityName,
  currentUserId,
}: DirectoryReviewsSectionProps) {
  const [reviewsData, setReviewsData] = useState<EntityReviewsResponse>(initialData);
  const [activeRatingFilter, setActiveRatingFilter] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<'helpful' | 'recent' | 'highest' | 'lowest'>('helpful');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchReviews = async (newSort = sortBy, newRating = activeRatingFilter) => {
    setLoading(true);
    try {
      const data = await directoryClient.listReviews(reviewsData.entityId, {
        sortBy: newSort,
        rating: newRating,
      });
      setReviewsData(data);
    } catch {
      // Manejar error silenciosamente
    } finally {
      setLoading(false);
    }
  };

  const handleFilterRating = (rating?: number) => {
    setActiveRatingFilter(rating);
    fetchReviews(sortBy, rating);
  };

  const handleSortChange = (newSort: 'helpful' | 'recent' | 'highest' | 'lowest') => {
    setSortBy(newSort);
    fetchReviews(newSort, activeRatingFilter);
  };

  const handleReviewSuccess = () => {
    fetchReviews(sortBy, activeRatingFilter);
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await directoryClient.deleteReview(reviewId);
      fetchReviews(sortBy, activeRatingFilter);
    } catch {
      // Manejar error
    }
  };

  return (
    <section className="space-y-8" id="resenas">
      {/* Scorecard Central App Store */}
      <AppStoreScorecard
        score={reviewsData.score}
        totalReviews={reviewsData.totalReviews}
        histogram={reviewsData.histogram}
        activeRatingFilter={activeRatingFilter}
        onFilterRating={handleFilterRating}
        onOpenComposer={() => setIsComposerOpen(true)}
        hasUserReview={Boolean(reviewsData.userReview)}
      />

      {/* Barra de Filtros y Ordenamiento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="text-sm font-semibold text-neutral-900 dark:text-white">
          {reviewsData.totalReviews === 0
            ? 'Aún no hay reseñas'
            : `${reviewsData.reviews.length} reseñas mostradas`}
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-neutral-500 dark:text-neutral-400">Ordenar por:</label>
          <select
            value={sortBy}
            onChange={(e) =>
              handleSortChange(e.target.value as 'helpful' | 'recent' | 'highest' | 'lowest')
            }
            className="px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
          >
            <option value="helpful">Más útiles</option>
            <option value="recent">Más recientes</option>
            <option value="highest">Mejor calificación</option>
            <option value="lowest">Menor calificación</option>
          </select>
        </div>
      </div>

      {/* Lista de Reseñas */}
      {loading ? (
        <div className="py-12 text-center text-sm text-neutral-400 animate-pulse">
          Actualizando reseñas...
        </div>
      ) : reviewsData.reviews.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviewsData.reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              currentUserId={currentUserId}
              onEdit={() => setIsComposerOpen(true)}
              onDelete={handleDeleteReview}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </div>
          <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
            Sé el primero en calificar
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
            Comparte tu opinión con la comunidad de GymSheet para que otros atletas conozcan este oferente.
          </p>
          <button
            type="button"
            onClick={() => setIsComposerOpen(true)}
            className="mt-2 inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-sm"
          >
            Escribir primera reseña
          </button>
        </div>
      )}

      {/* Modal de Creación / Edición */}
      <ReviewComposerModal
        entityId={reviewsData.entityId}
        entityName={entityName}
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onSuccess={handleReviewSuccess}
        existingReview={reviewsData.userReview}
      />
    </section>
  );
}
