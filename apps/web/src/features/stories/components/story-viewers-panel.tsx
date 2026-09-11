'use client';

import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { storiesService, storyKeys } from '@/features/stories/services/stories-service';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonList } from '@/shared/components/feedback/skeleton';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { formatRelativeTime } from '@/shared/lib/relative-time';

/**
 * Quién vio esta story. Sólo aparece sobre las propias: el backend responde 404
 * si se pregunta por la de otra persona, y la UI no debe insinuar lo contrario.
 *
 * Vive dentro del visor, encima de la story, porque la pregunta —«¿quién lo
 * vio?»— se hace mirándola; mandar al usuario a otra pantalla para responderla
 * le haría perder el sitio.
 */
export function StoryViewersPanel({
  onClose,
  storyId,
}: Readonly<{ onClose: () => void; storyId: string }>) {
  const viewers = useQuery({
    queryKey: storyKeys.viewers(storyId),
    queryFn: () => storiesService.viewers(storyId),
  });

  return (
    <section
      aria-label="Espectadores de la story"
      className="absolute inset-x-0 bottom-0 max-h-[65%] overflow-y-auto overscroll-contain rounded-t-[var(--radius-xl)] border-t border-[var(--border)] bg-[var(--surface-lowest)] p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold tracking-[-0.02em]">
          {viewers.data ? `Visto por ${viewers.data.total}` : 'Espectadores'}
        </h2>
        <button
          aria-label="Cerrar la lista de espectadores"
          className="tap grid size-10 place-items-center rounded-full border border-[var(--border)] text-[var(--text-muted)]"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className="mt-4">
        {viewers.isLoading ? (
          <SkeletonList rows={3} variant="grouped" />
        ) : viewers.isError ? (
          <ErrorPanel message={viewers.error.message} onRetry={() => viewers.refetch()} />
        ) : viewers.data && viewers.data.viewers.length > 0 ? (
          <ul className="grid gap-1">
            {viewers.data.viewers.map((viewer) => (
              <li className="flex items-center gap-3 py-2" key={viewer.userId}>
                <PersonAvatar name={viewer.fullName} photoUrl={viewer.photoUrl} />
                <span className="min-w-0 flex-1 truncate text-sm font-medium">
                  {viewer.fullName}
                </span>
                <span className="shrink-0 text-xs text-[var(--text-muted)]">
                  {formatRelativeTime(viewer.viewedAt)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-6 text-center text-sm text-[var(--text-muted)]">
            Todavía no la vio nadie. Tus stories sólo las ven tus matches.
          </p>
        )}
      </div>
    </section>
  );
}
