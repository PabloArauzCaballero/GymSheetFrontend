import type { Message, MessageReply } from '@gymsheet/schemas';

/** Lo que se lee de un mensaje en una línea: la barra de respuesta, la cita y la hoja de acciones. */
export function messagePreviewText(message: Message): string {
  if (message.type === 'system') return '';
  if (message.deletedAt) return 'Mensaje eliminado';
  switch (message.type) {
    case 'image':
      return message.viewOnce ? 'Foto de vista única' : message.body || 'Foto';
    case 'video':
      return message.viewOnce ? 'Video de vista única' : message.body || 'Video';
    case 'audio':
      return 'Nota de voz';
    case 'location':
      return message.locationLabel || 'Ubicación';
    default:
      return message.body ?? '';
  }
}

/** La cita que manda el servidor dentro de una respuesta. */
export function replyPreviewText(reply: MessageReply): string {
  if (!reply.available) return 'Este mensaje ya no está disponible';
  switch (reply.type) {
    case 'image':
      return reply.body || 'Foto';
    case 'video':
      return reply.body || 'Video';
    case 'audio':
      return 'Nota de voz';
    case 'location':
      return reply.body || 'Ubicación';
    case 'sticker':
      return 'Sticker';
    default:
      return reply.body ?? '';
  }
}

export type ReplyGlyph = 'image' | 'videocam' | 'mic' | 'location' | null;

/** Un icono pequeño delante del texto de la cita cuando el original no era texto. */
export function replyGlyph(type: string): ReplyGlyph {
  if (type === 'image') return 'image';
  if (type === 'video') return 'videocam';
  if (type === 'audio') return 'mic';
  if (type === 'location') return 'location';
  return null;
}

/** «Tú» o el nombre (o apodo) de la otra persona. */
export function replyAuthorLabel(senderId: string, currentUserId: string | undefined, otherName: string | undefined): string {
  return senderId === currentUserId ? 'Tú' : (otherName ?? 'Contacto');
}

