'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReelDTO } from '@gymsheet/schemas';
import { Button } from '@/shared/components/ui/button';
import { ReportDialog } from '@/features/moderation/components/report-dialog';
import { reelsService } from '../services/reels-service';
import { ReelComments } from './reel-comments';
import { feedKey, formatDuration } from './reels-shared';

/** Un reel del feed: vídeo, interacciones y, si está abierto, sus comentarios. */
export function ReelCard({
  commentsOpen,
  onToggleComments,
  onVideoPause,
  onVideoPlay,
  reel,
  showInteractions,
  viewerId,
}: Readonly<{
  commentsOpen: boolean;
  onToggleComments: () => void;
  onVideoPause: (video: HTMLVideoElement) => void;
  onVideoPlay: (video: HTMLVideoElement) => void;
  reel: ReelDTO;
  showInteractions: boolean;
  viewerId?: string;
}>) {
  const queryClient = useQueryClient();
  const interact = useMutation({
    mutationFn: async ({
      reelId,
      action,
      value,
    }: {
      reelId: string;
      action: 'like' | 'save' | 'repost';
      value: boolean;
    }) => {
      if (action === 'like') return reelsService.like(reelId, value);
      if (action === 'save') return reelsService.save(reelId, value);
      return reelsService.repost(reelId, value);
    },
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: feedKey }),
  });

  return (
    <li
      className="grid content-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-low)] p-3"
    >
      <video
        aria-label={`Reel publicado, ${formatDuration(reel.durationSeconds)}`}
        className="aspect-[9/16] w-full rounded-lg bg-black object-contain"
        controls
        onPause={(event) => onVideoPause(event.currentTarget)}
        onPlay={(event) => onVideoPlay(event.currentTarget)}
        playsInline
        preload="metadata"
        src={`/api/backend${reel.mediaUrl}`}
      />
      <p className="text-sm text-[var(--text-muted)]">
        Duración: {formatDuration(reel.durationSeconds)}
      </p>
      {showInteractions ? (
        <div className="flex flex-wrap gap-2" aria-label="Interacciones del reel">
          <Button
            disabled={interact.isPending}
            onClick={() =>
              interact.mutate({ reelId: reel.id, action: 'like', value: !reel.likedByMe })
            }
            type="button"
            variant="secondary"
          >
            {reel.likedByMe ? 'Quitar me gusta' : 'Me gusta'}
            {reel.likesCount ? ` (${reel.likesCount})` : ''}
          </Button>
          <Button
            disabled={interact.isPending}
            onClick={() =>
              interact.mutate({ reelId: reel.id, action: 'save', value: !reel.savedByMe })
            }
            type="button"
            variant="secondary"
          >
            {reel.savedByMe ? 'Quitar de guardados' : 'Guardar'}
          </Button>
          <Button
            disabled={interact.isPending}
            onClick={() =>
              interact.mutate({
                reelId: reel.id,
                action: 'repost',
                value: !reel.repostedByMe,
              })
            }
            type="button"
            variant="secondary"
          >
            {reel.repostedByMe ? 'Deshacer repost' : 'Repostear'}
          </Button>
          <Button
            onClick={() =>
              onToggleComments()
            }
            type="button"
            variant="secondary"
          >
            Comentarios ({reel.commentsCount ?? 0})
          </Button>
          <ReportDialog
            subjectName="este reel"
            targetId={reel.id}
            targetKind="REEL"
            trigger={
              <Button type="button" variant="ghost">
                Reportar
              </Button>
            }
          />
        </div>
      ) : null}
      {commentsOpen ? <ReelComments reel={reel} viewerId={viewerId} /> : null}
    </li>
  );
}
