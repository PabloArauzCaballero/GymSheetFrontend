import { z } from 'zod';
import { apiRequest, apiUpload } from '@/shared/api/api-client';
import type {
  ConversationSummary,
  Message,
  SocketTicket,
  StartConversationResponse,
} from '@/shared/api/schemas';
import {
  conversationSummarySchema,
  messageSchema,
  socketTicketSchema,
  startConversationResponseSchema,
} from '@/shared/api/schemas';

function queryString(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString();
}

const updatedSchema = z.object({ updated: z.literal(true) });
const readSchema = z.object({ read: z.literal(true) });

/**
 * Chat entre conexiones aceptadas.
 *
 * Mismo contrato que el móvil, endpoint por endpoint: el backend sirve media,
 * vista única, apodo privado y cursores de lectura desde hace tiempo, y la web
 * sólo consumía el texto. Cada método de aquí tiene su gemelo en
 * `apps/mobile/src/api/services.ts`; si uno cambia, cambian los dos.
 */
export const chatService = {
  listConversations: () =>
    apiRequest<ConversationSummary[]>('/me/conversations', z.array(conversationSummarySchema)),
  startConversation: (otherUserId: string) =>
    apiRequest<StartConversationResponse>('/me/conversations', startConversationResponseSchema, {
      method: 'POST',
      body: { otherUserId },
    }),
  /**
   * Historial hacia atrás. `before` es la marca de tiempo del mensaje más
   * antiguo que ya se tiene: el backend devuelve la página anterior a él.
   */
  listMessages: (conversationId: string, params: { limit?: number; before?: string } = {}) =>
    apiRequest<Message[]>(
      `/me/conversations/${conversationId}/messages?${queryString(params)}`,
      z.array(messageSchema),
    ),
  sendMessage: (conversationId: string, body: string) =>
    apiRequest<Message>(`/me/conversations/${conversationId}/messages`, messageSchema, {
      method: 'POST',
      body: { type: 'text', body },
    }),
  /** Una ubicación es un mensaje más, no un adjunto: viaja por la misma ruta. */
  sendLocationMessage: (conversationId: string, location: { lat: number; lng: number }) =>
    apiRequest<Message>(`/me/conversations/${conversationId}/messages`, messageSchema, {
      method: 'POST',
      body: { type: 'location', locationLat: location.lat, locationLng: location.lng },
    }),
  /**
   * Foto o vídeo. El tipo lo decide quien llama a partir del MIME del archivo
   * —el backend valida que coincidan—, y `viewOnce` hace que la URL real sólo
   * se revele una vez, con `viewMessage`.
   */
  sendMediaMessage: (
    conversationId: string,
    file: File,
    options: { type: 'image' | 'video'; body?: string; viewOnce?: boolean },
  ) => {
    const form = new FormData();
    form.append('file', file);
    form.append('type', options.type);
    if (options.body) form.append('body', options.body);
    form.append('viewOnce', options.viewOnce ? 'true' : 'false');
    return apiUpload<Message>(
      `/me/conversations/${conversationId}/messages/media`,
      messageSchema,
      form,
    );
  },
  /** Revela la URL de un mensaje de vista única. Una sola vez, para quien sea. */
  viewMessage: (conversationId: string, messageId: string) =>
    apiRequest<Message>(
      `/me/conversations/${conversationId}/messages/${messageId}/view`,
      messageSchema,
      { method: 'POST' },
    ),
  /** Apodo privado de esta conversación; `null` lo borra y vuelve al nombre real. */
  setNickname: (conversationId: string, nickname: string | null) =>
    apiRequest(`/me/conversations/${conversationId}/nickname`, updatedSchema, {
      method: 'PATCH',
      body: { nickname },
    }),
  /** Adelanta el cursor de leído al abrir el hilo: es lo que pinta el doble check del otro lado. */
  markRead: (conversationId: string) =>
    apiRequest(`/me/conversations/${conversationId}/read`, readSchema, { method: 'POST' }),
  // Boleto de un solo uso para el handshake del socket — nunca el JWT real.
  issueSocketTicket: () =>
    apiRequest<SocketTicket>('/auth/socket-ticket', socketTicketSchema, { method: 'POST' }),
};
