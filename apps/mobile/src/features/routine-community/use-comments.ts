import { useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { ApiError } from '@gymsheet/api-client';
import type { CommentAttachment, CommentPage, RoutineComment } from '@gymsheet/types';
import { communityService } from '@/api/services';
import { shortName } from '@/lib/format';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { previewOf, type PendingAttachment } from '@/features/routine-community/attachments';

type Pages = InfiniteData<CommentPage, string | null>;

/** Aplica `change` al comentario `id`, sea de primer nivel o una respuesta. */
function mapComment(pages: Pages, id: string, change: (comment: RoutineComment) => RoutineComment): Pages {
  return {
    ...pages,
    pages: pages.pages.map((page) => ({
      ...page,
      items: page.items.map((item) =>
        item.id === id
          ? change(item)
          : { ...item, respuestas: item.respuestas.map((reply) => (reply.id === id ? change(reply) : reply)) },
      ),
    })),
  };
}

/** Cuántos comentarios hay cargados, contando las respuestas. */
export function countComments(items: readonly RoutineComment[]): number {
  return items.reduce((total, item) => total + 1 + item.respuestas.length, 0);
}

/**
 * Comentarios de una rutina (RF-12) con todo optimista: el comentario aparece
 * al enviarlo, el «me gusta» responde al dedo y borrar quita la fila en el
 * acto. Si el servidor falla, la lista vuelve a lo que había y se dice por qué.
 */
export function useRoutineComments(routineId: string) {
  const queryClient = useQueryClient();
  const me = useAuthStore((state) => state.principal);
  const key = ['community', 'comments', routineId] as const;

  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => communityService.comments('ROUTINE', routineId, pageParam),
    getNextPageParam: (last) => last.siguienteCursor,
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: key });
    return queryClient.getQueryData<Pages>(key);
  };
  const restore = (previous: Pages | undefined) => queryClient.setQueryData(key, previous);

  const send = useMutation({
    mutationFn: async (input: { texto: string; respuestaA: string | null; adjunto: PendingAttachment | null }) => {
      let adjunto: CommentAttachment | null = null;
      if (input.adjunto?.source === 'remote') adjunto = input.adjunto.attachment;
      else if (input.adjunto) {
        const { uri, name, mimeType, width, height } = input.adjunto;
        const uploaded = await communityService.uploadAttachment({ uri, name, mimeType });
        adjunto = { ...uploaded, ancho: width ?? null, alto: height ?? null };
      }
      return communityService.comment('ROUTINE', routineId, input.texto, input.respuestaA, adjunto);
    },
    onMutate: async (input) => {
      const previous = await snapshot();
      const draft: RoutineComment = {
        id: `temp-${Date.now()}`,
        autor: { id: me?.id ?? 'me', nombre: shortName(me?.nombreCompleto, me?.email) },
        texto: input.texto,
        adjunto: input.adjunto ? previewOf(input.adjunto) : null,
        respuestaA: input.respuestaA,
        creadoEn: new Date().toISOString(),
        esMio: true,
        likes: 0,
        meGusta: false,
        respuestas: [],
      };
      queryClient.setQueryData<Pages>(key, (pages) => {
        if (!pages) return pages;
        if (input.respuestaA) {
          return mapComment(pages, input.respuestaA, (parent) => ({
            ...parent,
            respuestas: [...parent.respuestas, draft],
          }));
        }
        const [first, ...rest] = pages.pages;
        return first ? { ...pages, pages: [{ ...first, items: [draft, ...first.items] }, ...rest] } : pages;
      });
      return { previous };
    },
    onSuccess: () => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (error: Error, _input, context) => {
      restore(context?.previous);
      notify.error(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const like = useMutation({
    mutationFn: (comment: RoutineComment) =>
      comment.meGusta ? communityService.unlikeComment(comment.id) : communityService.likeComment(comment.id),
    onMutate: async (comment) => {
      const previous = await snapshot();
      queryClient.setQueryData<Pages>(key, (pages) =>
        pages
          ? mapComment(pages, comment.id, (item) => ({
              ...item,
              meGusta: !comment.meGusta,
              likes: Math.max(0, item.likes + (comment.meGusta ? -1 : 1)),
            }))
          : pages,
      );
      return { previous };
    },
    onSuccess: (state, comment) => {
      queryClient.setQueryData<Pages>(key, (pages) =>
        pages ? mapComment(pages, comment.id, (item) => ({ ...item, ...state })) : pages,
      );
    },
    onError: (error: Error, _comment, context) => {
      restore(context?.previous);
      // El servidor de este entorno aún no guarda los «me gusta»: se dice tal
      // cual en vez de enseñar un error técnico.
      if (error instanceof ApiError && error.kind === 'not-found') {
        notify.info('Los «me gusta» en comentarios aún no están activos aquí.');
        return;
      }
      notify.error(error);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => communityService.deleteComment(id),
    onMutate: async (id) => {
      const previous = await snapshot();
      queryClient.setQueryData<Pages>(key, (pages) =>
        pages
          ? {
              ...pages,
              pages: pages.pages.map((page) => ({
                ...page,
                items: page.items
                  .filter((item) => item.id !== id || item.respuestas.length > 0)
                  .map((item) =>
                    item.id === id
                      ? { ...item, texto: '', adjunto: null }
                      : { ...item, respuestas: item.respuestas.filter((reply) => reply.id !== id) },
                  ),
              })),
            }
          : pages,
      );
      return { previous };
    },
    onError: (error: Error, _id, context) => {
      restore(context?.previous);
      notify.error(error);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return { query, items, send, like, remove, me };
}
