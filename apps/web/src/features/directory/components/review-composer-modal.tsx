'use client';

import { useState } from 'react';
import type { CreateReviewInput, ReviewItem } from '@gymsheet/schemas';
import { directoryClient } from '../services/directory-client';

interface ReviewComposerModalProps {
  entityId: string;
  entityName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedReview: ReviewItem) => void;
  existingReview?: ReviewItem | null;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Deficiente',
  2: 'Regular',
  3: 'Bueno',
  4: 'Muy bueno',
  5: 'Excelente',
};

function ReviewComposerForm({
  entityId,
  entityName,
  onClose,
  onSuccess,
  existingReview,
}: ReviewComposerModalProps) {
  const [rating, setRating] = useState<number>(existingReview?.rating ?? 5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState<string>(existingReview?.title ?? '');
  const [body, setBody] = useState<string>(existingReview?.body ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentScore = hoverRating ?? rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (title.trim().length < 3) {
      setError('El título debe tener al menos 3 caracteres.');
      return;
    }

    if (body.trim().length < 10) {
      setError('La reseña debe tener al menos 10 caracteres.');
      return;
    }

    setLoading(true);
    try {
      let savedReview: ReviewItem;
      if (existingReview) {
        savedReview = await directoryClient.updateReview(existingReview.id, {
          rating,
          title: title.trim(),
          body: body.trim(),
        });
      } else {
        const input: CreateReviewInput = {
          rating,
          title: title.trim(),
          body: body.trim(),
        };
        savedReview = await directoryClient.createReview(entityId, input);
      }
      onSuccess(savedReview);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la reseña. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {existingReview ? 'Editar tu reseña' : 'Escribir una reseña'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Para <span className="font-semibold text-neutral-800 dark:text-neutral-200">{entityName}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-full text-neutral-400 hover:text-neutral-700 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selector de Estrellas Interactivo */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                onClick={() => setRating(star)}
                className="p-1 hover:scale-125 transition-transform"
              >
                <svg
                  className={`w-8 h-8 transition-colors ${
                    star <= currentScore
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-neutral-300 dark:text-neutral-700 fill-current'
                  }`}
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            ))}
          </div>
          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-2">
            {RATING_LABELS[currentScore]}
          </span>
        </div>

        {/* Título */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
            Título
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Resume tu experiencia en pocas palabras..."
            maxLength={120}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-neutral-400"
            required
          />
        </div>

        {/* Comentario */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <label className="font-semibold text-neutral-700 dark:text-neutral-300">
              Reseña
            </label>
            <span className="text-neutral-400 tabular-nums">
              {body.length} / 2000
            </span>
          </div>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Cuenta qué tal fue la atención, los productos, la calidad del equipamiento o las instalaciones..."
            maxLength={2000}
            className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-neutral-400 resize-none"
            required
          />
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* Footer Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-full text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? 'Publicando...' : existingReview ? 'Guardar cambios' : 'Publicar reseña'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function ReviewComposerModal(props: ReviewComposerModalProps) {
  if (!props.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <ReviewComposerForm
        key={`${props.entityId}-${props.existingReview?.id ?? 'new'}`}
        {...props}
      />
    </div>
  );
}
