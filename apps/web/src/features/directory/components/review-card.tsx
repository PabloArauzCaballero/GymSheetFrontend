'use client';

import { useState } from 'react';
import type { ReviewItem } from '@/shared/api/schemas';
import { directoryClient } from '../services/directory-client';

interface ReviewCardProps {
  review: ReviewItem;
  currentUserId?: string;
  onEdit?: (review: ReviewItem) => void;
  onDelete?: (reviewId: string) => void;
}

export function ReviewCard({
  review,
  currentUserId,
  onEdit,
  onDelete,
}: ReviewCardProps) {
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [hasVoted, setHasVoted] = useState(review.hasVotedHelpful);
  const [isVoting, setIsVoting] = useState(false);

  const isAuthor = currentUserId && review.author.id === currentUserId;

  const handleToggleHelpful = async () => {
    if (isAuthor || isVoting) return;
    setIsVoting(true);
    try {
      const res = await directoryClient.toggleHelpful(review.id);
      setHasVoted(res.hasVoted);
      setHelpfulCount(res.newCount);
    } catch {
      // Revertir optimismo si hay error
    } finally {
      setIsVoting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <article className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 p-5 md:p-6 transition-all space-y-4">
      {/* Header: Autor, Estrellas y Fecha */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden flex items-center justify-center font-bold text-neutral-600 dark:text-neutral-300 text-sm">
            {review.author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={review.author.avatarUrl}
                alt={review.author.displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              review.author.displayName.slice(0, 2).toUpperCase()
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-sm text-neutral-900 dark:text-white">
                {review.author.displayName}
              </span>

              {review.isVerifiedAthlete && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Atleta Verificado
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((s) => (
                  <svg
                    key={s}
                    className={`w-3.5 h-3.5 ${
                      s <= review.rating ? 'fill-current' : 'text-neutral-300 dark:text-neutral-700 fill-current'
                    }`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <span className="text-xs text-neutral-400">
                {formatDate(review.createdAt)}
                {review.editedAt && ' · Editado'}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones del autor */}
        {isAuthor && (
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => onEdit(review)}
                className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              >
                Editar
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(review.id)}
                className="text-xs font-medium text-rose-500 hover:text-rose-600"
              >
                Eliminar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Título y Contenido */}
      <div className="space-y-1">
        <h4 className="font-bold text-neutral-900 dark:text-white text-base">
          {review.title}
        </h4>
        <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
          {review.body}
        </p>
      </div>

      {/* Botón de Voto Útil App Store */}
      <div className="flex items-center justify-between pt-2 text-xs">
        <button
          type="button"
          onClick={handleToggleHelpful}
          disabled={Boolean(isAuthor)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
            hasVoted
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold'
              : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
          } ${isAuthor ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <svg className="w-3.5 h-3.5 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
          </svg>
          <span>¿Útil?</span>
          {helpfulCount > 0 && <span className="tabular-nums font-medium">({helpfulCount})</span>}
        </button>
      </div>

      {/* Respuesta Oficial del Desarrollador / Propietario (App Store Style) */}
      {review.reply && (
        <div className="mt-4 rounded-xl bg-neutral-100/80 dark:bg-neutral-800/60 p-4 border-l-4 border-amber-500 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
              <span>{review.reply.authorName}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                Respuesta Oficial
              </span>
            </div>
            <span className="text-neutral-400">{formatDate(review.reply.createdAt)}</span>
          </div>
          <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
            {review.reply.replyText}
          </p>
        </div>
      )}
    </article>
  );
}
