import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import type { CommentAttachment, CommentOrder, RoutineComment } from '@gymsheet/types';
import { communityService } from '@/api/services';
import { shortName } from '@/lib/format';
import { notify } from '@/notifications';
import { useAuthStore } from '@/state/auth-store';
import { previewOf, type PendingAttachment } from '@/features/routine-community/attachments';
import { countComments } from '@/features/routine-community/use-comments';
import { mapComment, removeComment, shiftTotal, type CommentPages } from '@/features/exercise-comments/comment-cache';

type Pages = CommentPages;

/** Todas las listas de comentarios de un ejercicio (cualquier orden) cuelgan de esta clave. */
export const exerciseCommentsKey = (exerciseId: string) => ['community', 'comments', 'EXERCISE', exerciseId] as const;

/**
 * Comentarios de la ficha de un ejercicio: consejos, técnica y dudas de otras
 * personas. Misma API que los de rutinas (`/comments/EXERCISE/:id`) y el mismo
 * trato optimista: lo enviado aparece al instante, el «me gusta» responde al
 * dedo y borrar quita la fila. Si el servidor falla, todo vuelve a como estaba.
 *
 * `order` elige «Recientes» o «Útiles» (más «me gusta»); cada orden tiene su
 * caché, y cualquier escritura invalida las dos.
 */
export function useExerciseComments(exerciseId: string, order: CommentOrder = 'recientes', enabled = true) {
  const queryClient = useQueryClient();
  const me = useAuthStore((state) => state.principal);
  const root = exerciseCommentsKey(exerciseId);
  const key = [...root, order] as const;

  const query = useInfiniteQuery({
    queryKey: key,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => communityService.comments('EXERCISE', exerciseId, pageParam, order),
    getNextPageParam: (last) => last.siguienteCursor,
    enabled: enabled && Boolean(exerciseId),
  });
  const items = query.data?.pages.flatMap((page) => page.items) ?? [];
  // El total del servidor cuenta lo que aún no se ha cargado; sin él, lo cargado.
  const total = query.data?.pages[0]?.total ?? countComments(items);

  const snapshot = async () => {
    await queryClient.cancelQueries({ queryKey: key });
    return queryClient.getQueryData<Pages>(key);
  };
  const restore = (previous: Pages | undefined) => queryClient.setQueryData(key, previous);
  const refresh = () => queryClient.invalidateQueries({ queryKey: root });

  const send = useMutation({
    mutationFn: async (input: { texto: string; respuestaA: string | null; adjunto: PendingAttachment | null }) => {
      let adjunto: CommentAttachment | null = null;
      if (input.adjunto?.source === 'remote') adjunto = input.adjunto.attachment;
      else if (input.adjunto) {
        const { uri, name, mimeType, width, height } = input.adjunto;
        const uploaded = await communityService.uploadAttachment({ uri, name, mimeType });
        adjunto = { ...uploaded, ancho: width ?? null, alto: height ?? null };
      }
      return communityService.comment('EXERCISE', exerciseId, input.texto, input.respuestaA, adjunto);
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
          return shiftTotal(
            mapComment(pages, input.respuestaA, (parent) => ({ ...parent, respuestas: [...parent.respuestas, draft] })),
            1,
          );
        }
        const [first, ...rest] = pages.pages;
        return first ? shiftTotal({ ...pages, pages: [{ ...first, items: [draft, ...first.items] }, ...rest] }, 1) : pages;
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
    onSettled: refresh,
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
      // El otro orden («Útiles») depende de los «me gusta»: que se rehaga al volver.
      void queryClient.invalidateQueries({ queryKey: root, refetchType: 'none' });
    },
    onError: (error: Error, _comment, context) => {
      restore(context?.previous);
      notify.error(error);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => communityService.deleteComment(id),
    onMutate: async (id) => {
      const previous = await snapshot();
      queryClient.setQueryData<Pages>(key, (pages) => (pages ? removeComment(pages, id) : pages));
      return { previous };
    },
    onSuccess: () => notify.success('Comentario eliminado.'),
    onError: (error: Error, _id, context) => {
      restore(context?.previous);
      notify.error(error);
    },
    onSettled: refresh,
  });

  return { query, items, total, send, like, remove, me };
}
