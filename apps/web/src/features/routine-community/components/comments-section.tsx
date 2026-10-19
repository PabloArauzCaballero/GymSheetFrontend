'use client';

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { ContentKind, RoutineComment } from '@gymsheet/types';
import { ReportDialog } from '@/features/moderation/components/report-dialog';
import { Button } from '@/shared/components/ui/button';
import { Field } from '@/shared/components/ui/field';
import { Textarea } from '@/shared/components/ui/textarea';
import { confirm, notify } from '@/shared/notifications';
import { routineV2Keys } from '@/features/routines-v2/keys';
import { communityService } from '@/features/routines-v2/services';

const MAX = 1000;

function CommentItem({
  comment,
  onReply,
  onDelete,
  reply = false,
}: Readonly<{
  comment: RoutineComment;
  onReply?: (comment: RoutineComment) => void;
  onDelete: (comment: RoutineComment) => void;
  reply?: boolean;
}>) {
  return (
    <li className={reply ? 'ml-6 border-l border-[var(--border-subtle)] pl-4' : ''} data-testid="comment">
      <div className="grid gap-1 py-3">
        <p className="text-sm font-semibold">
          {comment.autor.nombre || 'Socio'}
          {comment.esMio ? <span className="font-normal text-[var(--text-muted)]"> · tú</span> : null}
        </p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {comment.texto || <em className="text-[var(--text-muted)]">Comentario eliminado.</em>}
        </p>
        <div className="flex flex-wrap items-center gap-1 text-xs text-[var(--text-muted)]">
          <time dateTime={comment.creadoEn}>{new Date(comment.creadoEn).toLocaleDateString('es')}</time>
          {onReply ? (
            <Button onClick={() => onReply(comment)} size="sm" variant="ghost">
              Responder
            </Button>
          ) : null}
          {comment.esMio ? (
            <Button aria-label="Eliminar mi comentario" onClick={() => onDelete(comment)} size="sm" variant="ghost">
              <Trash2 aria-hidden className="size-3.5" />
              Eliminar
            </Button>
          ) : (
            <ReportDialog
              consequence="Alguien del equipo revisará el comentario."
              defaultReason="ACOSO"
              subjectName="este comentario"
              successMessage="Gracias. Lo revisaremos."
              targetId={comment.id}
              targetKind="COMMENT"
            />
          )}
        </div>
      </div>
      {comment.respuestas.length ? (
        <ul className="list-none">
          {comment.respuestas.map((child) => (
            <CommentItem comment={child} key={child.id} onDelete={onDelete} reply />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** Comentarios de una rutina o de un ejercicio privado (RF-12): hilo de un nivel y un campo para escribir. */
export function CommentsSection({ kind, id }: Readonly<{ kind: ContentKind; id: string }>) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<RoutineComment | null>(null);
  const key = routineV2Keys.comments(kind, id);
  const list = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam }) => communityService.comments(kind, id, pageParam || undefined),
    initialPageParam: '',
    getNextPageParam: (page) => page.siguienteCursor ?? undefined,
  });
  const send = useMutation({
    mutationFn: () => communityService.comment(kind, id, { texto: text.trim(), respuestaA: replyTo?.id ?? null }),
    onSuccess: async () => {
      setText('');
      setReplyTo(null);
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (error: Error) => notify.error(error),
  });
  const remove = useMutation({
    mutationFn: (comment: RoutineComment) => communityService.removeComment(comment.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      notify.success('Comentario eliminado.');
    },
    onError: (error: Error) => notify.error(error),
  });
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const confirmDelete = async (comment: RoutineComment) => {
    const result = await confirm({
      title: 'Eliminar el comentario',
      message: 'Se quitará tu comentario.',
      confirmLabel: 'Eliminar',
      severity: 'danger',
    });
    if (result.confirmed) remove.mutate(comment);
  };
  return (
    <section aria-labelledby={`comments-${id}`} className="grid gap-3" data-testid="comments">
      <h3 className="flex items-center gap-2 text-base font-semibold" id={`comments-${id}`}>
        <MessageSquare aria-hidden className="size-4" />
        Comentarios
      </h3>
      {list.isLoading ? (
        <p className="text-sm text-[var(--text-muted)]">Cargando comentarios…</p>
      ) : list.isError ? (
        <p className="text-sm text-[var(--danger-text)]">No se pudieron cargar los comentarios.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Todavía no hay comentarios. Sé la primera persona.</p>
      ) : (
        <ul className="list-none divide-y divide-[var(--border-subtle)]">
          {items.map((comment) => (
            <CommentItem comment={comment} key={comment.id} onDelete={confirmDelete} onReply={setReplyTo} />
          ))}
        </ul>
      )}
      {list.hasNextPage ? (
        <Button loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()} size="sm" variant="secondary">
          Ver más comentarios
        </Button>
      ) : null}
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (text.trim()) send.mutate();
        }}
      >
        {replyTo ? (
          <p className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
            Respondiendo a {replyTo.autor.nombre || 'un socio'}
            <Button onClick={() => setReplyTo(null)} size="sm" type="button" variant="ghost">
              Cancelar
            </Button>
          </p>
        ) : null}
        <Field hint={`${text.length} / ${MAX}`} label="Escribe un comentario">
          <Textarea maxLength={MAX} onChange={(event) => setText(event.target.value)} rows={3} value={text} />
        </Field>
        <Button className="w-fit" disabled={!text.trim()} loading={send.isPending} type="submit" variant="primary">
          Comentar
        </Button>
      </form>
    </section>
  );
}
