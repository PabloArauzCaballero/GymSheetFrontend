'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReelDTO } from '@gymsheet/schemas';
import { Button } from '@/shared/components/ui/button';
import { reelsService } from '../services/reels-service';
import { feedKey } from './reels-shared';

/** Comentarios de un reel abierto: lista, alta y borrado. */
export function ReelComments({
  reel,
  viewerId,
}: Readonly<{ reel: ReelDTO; viewerId?: string }>) {
  const queryClient = useQueryClient();
  const [commentDraft, setCommentDraft] = useState('');

  const comments = useQuery({
    queryKey: [...feedKey, 'comments', reel.id],
    queryFn: () => reelsService.comments(reel.id),
  });

  const createComment = useMutation({
    mutationFn: ({ reelId, body }: { reelId: string; body: string }) =>
      reelsService.createComment(reelId, body),
    onSuccess: async (_comment, variables) => {
      setCommentDraft('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...feedKey, 'comments', variables.reelId] }),
        queryClient.invalidateQueries({ queryKey: feedKey }),
      ]);
    },
  });

  const deleteComment = useMutation({
    mutationFn: ({ reelId, commentId }: { reelId: string; commentId: string }) =>
      reelsService.deleteComment(reelId, commentId),
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [...feedKey, 'comments', variables.reelId] }),
        queryClient.invalidateQueries({ queryKey: feedKey }),
      ]);
    },
  });

  return (
    <section aria-label="Comentarios del reel" className="grid gap-3">
      {comments.isLoading ? <p role="status">Cargando comentarios…</p> : null}
      {comments.isError ? (
        <p role="alert">No se pudieron cargar los comentarios.</p>
      ) : null}
      {comments.data?.map((comment) => (
        <div className="flex flex-wrap items-center gap-2 text-sm" key={comment.id}>
          <p>
            <strong>{comment.displayName}</strong>:{' '}
            {comment.body ?? 'Comentario eliminado'}
          </p>
          {comment.body &&
          (comment.userId === viewerId || reel.userId === viewerId) ? (
            <Button
              disabled={deleteComment.isPending}
              onClick={() => {
                if (
                  window.confirm(
                    'El comentario dejará de estar visible para todos. ¿Eliminarlo?',
                  )
                ) {
                  deleteComment.mutate({ reelId: reel.id, commentId: comment.id });
                }
              }}
              type="button"
              variant="ghost"
            >
              Eliminar comentario
            </Button>
          ) : null}
        </div>
      ))}
      {reel.commentsEnabled !== false ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const body = commentDraft.trim();
            if (body) createComment.mutate({ reelId: reel.id, body });
          }}
        >
          <label className="sr-only" htmlFor={`reel-comment-${reel.id}`}>
            Escribe un comentario
          </label>
          <input
            className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            id={`reel-comment-${reel.id}`}
            maxLength={1000}
            onChange={(event) => setCommentDraft(event.currentTarget.value)}
            value={commentDraft}
          />
          <Button
            disabled={createComment.isPending || !commentDraft.trim()}
            type="submit"
            variant="primary"
          >
            Comentar
          </Button>
        </form>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          Los comentarios están cerrados.
        </p>
      )}
    </section>
  );
}
