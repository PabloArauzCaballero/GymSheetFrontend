'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type FormEvent } from 'react';
import type { ReelDTO } from '@gymsheet/schemas';
import { PageHeader } from '@/shared/components/layout/page-header';
import { Button } from '@/shared/components/ui/button';
import { ReportDialog } from '@/features/moderation/components/report-dialog';
import { reelsService } from '../services/reels-service';

const feedKey = ['reels', 'feed'] as const;
const allowedVideoTypes = new Set(['video/mp4', 'video/quicktime']);

function formatDuration(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}

export function ReelsPageClient({ viewerId }: Readonly<{ viewerId?: string }>) {
  const queryClient = useQueryClient();
  const cameraInput = useRef<HTMLInputElement>(null);
  const libraryInput = useRef<HTMLInputElement>(null);
  const activeVideo = useRef<HTMLVideoElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [feedTab, setFeedTab] = useState<'MINE' | 'FOR_YOU' | 'CONNECTIONS'>('MINE');
  const [commentsReel, setCommentsReel] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');

  const feed = useQuery({
    queryKey: [...feedKey, feedTab],
    queryFn: () => reelsService.feed(feedTab),
  });

  const comments = useQuery({
    queryKey: [...feedKey, 'comments', commentsReel],
    queryFn: () => reelsService.comments(commentsReel!),
    enabled: commentsReel !== null,
  });

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

  const upload = useMutation({
    mutationFn: reelsService.upload,
    onSuccess: async (reel: ReelDTO) => {
      queryClient.setQueryData(
        feedKey,
        (current: { items: ReelDTO[]; nextCursor: null } | undefined) => ({
          items: [reel, ...(current?.items ?? []).filter((item) => item.id !== reel.id)],
          nextCursor: null,
        }),
      );
      setSelectedFile(null);
      setSelectionError(null);
      if (cameraInput.current) cameraInput.current.value = '';
      if (libraryInput.current) libraryInput.current.value = '';
      await queryClient.invalidateQueries({ queryKey: feedKey });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (upload.isPending) return;
    if (!selectedFile) {
      setSelectionError('Elige o graba un vídeo para publicar.');
      return;
    }
    if (!allowedVideoTypes.has(selectedFile.type)) {
      setSelectionError('El archivo debe ser MP4 o QuickTime.');
      return;
    }
    setSelectionError(null);
    upload.mutate(selectedFile);
  }

  return (
    <main className="grid gap-8">
      <PageHeader
        eyebrow="Comunidad"
        title="Reels"
        description="Graba un vídeo o elige uno para compartirlo. El servidor valida el vídeo y publica solo reels listos para reproducir."
      />

      <section
        aria-labelledby="reel-upload-title"
        className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-low)] p-5 sm:p-7"
      >
        <div>
          <h2 className="text-lg font-semibold" id="reel-upload-title">
            Publicar un reel
          </h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            MP4 o QuickTime, hasta 90 segundos.
          </p>
        </div>
        <form className="grid justify-items-start gap-4" onSubmit={submit}>
          <label className="grid gap-2 text-sm font-medium" htmlFor="reel-camera">
            Grabar un vídeo
            <input
              accept="video/mp4,video/quicktime"
              capture="environment"
              className="max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--volt)] file:px-3 file:py-2 file:font-semibold file:text-[var(--accent-contrast)]"
              disabled={upload.isPending}
              id="reel-camera"
              onChange={(event) => {
                setSelectedFile(event.currentTarget.files?.[0] ?? null);
                setSelectionError(null);
                upload.reset();
              }}
              ref={cameraInput}
              type="file"
            />
          </label>
          <label className="grid gap-2 text-sm font-medium" htmlFor="reel-library">
            Elegir un vídeo del dispositivo
            <input
              accept="video/mp4,video/quicktime"
              className="max-w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[var(--volt)] file:px-3 file:py-2 file:font-semibold file:text-[var(--accent-contrast)]"
              disabled={upload.isPending}
              id="reel-library"
              onChange={(event) => {
                setSelectedFile(event.currentTarget.files?.[0] ?? null);
                setSelectionError(null);
                upload.reset();
              }}
              ref={libraryInput}
              type="file"
            />
          </label>
          {selectedFile ? (
            <p className="text-sm text-[var(--text-muted)]" aria-live="polite">
              Seleccionado: {selectedFile.name}
            </p>
          ) : null}
          {selectionError ? (
            <p className="text-sm text-[var(--danger-text)]" role="alert">
              {selectionError}
            </p>
          ) : null}
          {upload.isError ? (
            <div className="grid justify-items-start gap-2" role="alert">
              <p className="text-sm text-[var(--danger-text)]">
                No pudimos confirmar la publicación. Actualiza tu lista antes de volver a enviarlo.
              </p>
              <Button onClick={() => void feed.refetch()} type="button">
                Actualizar mis reels
              </Button>
            </div>
          ) : null}
          {upload.isSuccess ? (
            <p className="text-sm text-[var(--success-text)]" role="status">
              Reel publicado.
            </p>
          ) : null}
          <Button
            disabled={upload.isPending || !selectedFile}
            loading={upload.isPending}
            type="submit"
            variant="primary"
          >
            {upload.isPending ? 'Publicando…' : 'Publicar reel'}
          </Button>
        </form>
      </section>

      <section aria-labelledby="my-reels-title" className="grid gap-4">
        <div className="flex flex-wrap gap-2" aria-label="Feeds de reels">
          {(
            [
              ['FOR_YOU', 'Para ti'],
              ['CONNECTIONS', 'Conexiones'],
              ['MINE', 'Mis reels'],
            ] as const
          ).map(([tab, label]) => (
            <Button
              aria-pressed={feedTab === tab}
              key={tab}
              onClick={() => {
                setFeedTab(tab);
                setCommentsReel(null);
              }}
              type="button"
              variant={feedTab === tab ? 'primary' : 'secondary'}
            >
              {label}
            </Button>
          ))}
        </div>
        <h2 className="text-lg font-semibold" id="my-reels-title">
          {feedTab === 'MINE'
            ? 'Mis reels publicados'
            : feedTab === 'FOR_YOU'
              ? 'Para ti'
              : 'Conexiones'}
        </h2>
        {feed.isLoading ? <p role="status">Cargando reels…</p> : null}
        {feed.isError ? (
          <div className="grid justify-items-start gap-2" role="alert">
            <p>No se pudieron cargar tus reels.</p>
            <Button onClick={() => void feed.refetch()} type="button">
              Reintentar
            </Button>
          </div>
        ) : null}
        {feed.isSuccess && feed.data.items.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            {feedTab === 'MINE'
              ? 'Tus reels publicados aparecerán aquí.'
              : 'Todavía no hay reels disponibles en este feed.'}
          </p>
        ) : null}
        {feed.isSuccess && feed.data.items.length > 0 ? (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {feed.data.items.map((reel) => (
              <li
                className="grid content-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-low)] p-3"
                key={reel.id}
              >
                <video
                  aria-label={`Reel publicado, ${formatDuration(reel.durationSeconds)}`}
                  className="aspect-[9/16] w-full rounded-lg bg-black object-contain"
                  controls
                  onPause={(event) => {
                    if (activeVideo.current === event.currentTarget) activeVideo.current = null;
                  }}
                  onPlay={(event) => {
                    if (activeVideo.current && activeVideo.current !== event.currentTarget) {
                      activeVideo.current.pause();
                    }
                    activeVideo.current = event.currentTarget;
                  }}
                  playsInline
                  preload="metadata"
                  src={`/api/backend${reel.mediaUrl}`}
                />
                <p className="text-sm text-[var(--text-muted)]">
                  Duración: {formatDuration(reel.durationSeconds)}
                </p>
                {feedTab !== 'MINE' ? (
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
                        setCommentsReel((current) => (current === reel.id ? null : reel.id))
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
                {commentsReel === reel.id ? (
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
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}
