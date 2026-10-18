import type { InfiniteData } from '@tanstack/react-query';
import type { CommentPage, RoutineComment } from '@gymsheet/types';

export type CommentPages = InfiniteData<CommentPage, string | null>;

/** Aplica `change` al comentario `id`, sea de primer nivel o una respuesta. */
export function mapComment(
  pages: CommentPages,
  id: string,
  change: (comment: RoutineComment) => RoutineComment,
): CommentPages {
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

/** Suma `delta` al total del servidor que trae la primera página (el contador de la ficha). */
export function shiftTotal(pages: CommentPages, delta: number): CommentPages {
  const [first, ...rest] = pages.pages;
  if (!first || first.total === undefined) return pages;
  return { ...pages, pages: [{ ...first, total: Math.max(0, first.total + delta) }, ...rest] };
}

/**
 * Quita un comentario recién borrado: una respuesta sale del hilo; un comentario
 * con respuestas se queda vacío (para no perder el hilo) y uno sin ellas se va.
 */
export function removeComment(pages: CommentPages, id: string): CommentPages {
  return shiftTotal(
    {
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
    },
    -1,
  );
}

/** «1 comentario», «3 comentarios». */
export function commentCountLabel(total: number): string {
  return `${total} ${total === 1 ? 'comentario' : 'comentarios'}`;
}
