import type { Message } from '@/shared/api/schemas';

/** Añade un mensaje sólo si su id no estaba ya: el socket reemite lo propio. */
export function mergeMessages(existing: Message[], incoming: Message): Message[] {
  if (existing.some((message) => message.id === incoming.id)) return existing;
  return [...existing, incoming];
}

/**
 * Une los tres orígenes de un hilo —páginas antiguas, historial y socket— sin
 * repetir ids y en orden cronológico.
 *
 * El orden se toma de `createdAt` y no del orden de llegada: un mensaje que
 * entra por el socket mientras se está paginando hacia atrás llegaría al final
 * del arreglo aunque sea más antiguo que otros ya cargados.
 */
export function dedupeById(groups: Message[][]): Message[] {
  const seen = new Set<string>();
  const merged: Message[] = [];
  for (const group of groups) {
    for (const message of group) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      merged.push(message);
    }
  }
  return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
