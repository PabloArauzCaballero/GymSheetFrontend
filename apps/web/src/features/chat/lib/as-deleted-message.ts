import type { Message } from '@/shared/api/schemas';

/** El mensaje con el contenido borrado, conservando su identidad en el hilo. */
export function asDeletedMessage(message: Message, deletedAt = message.deletedAt ?? null): Message {
  if (message.type === 'system') return message;
  return {
    ...message,
    body: 'Mensaje eliminado',
    type: 'text',
    mediaUrl: null,
    mediaMimeType: null,
    viewOnce: false,
    viewed: false,
    locationLat: null,
    locationLng: null,
    deletedAt,
  };
}
