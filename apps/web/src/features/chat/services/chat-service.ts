import { z } from 'zod';
import { apiRequest } from '@/shared/api/api-client';
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

export const chatService = {
  listConversations: () =>
    apiRequest<ConversationSummary[]>('/me/conversations', z.array(conversationSummarySchema)),
  startConversation: (otherUserId: string) =>
    apiRequest<StartConversationResponse>('/me/conversations', startConversationResponseSchema, {
      method: 'POST',
      body: { otherUserId },
    }),
  listMessages: (conversationId: string, params: { limit?: number; before?: string } = {}) =>
    apiRequest<Message[]>(
      `/me/conversations/${conversationId}/messages?${queryString(params)}`,
      z.array(messageSchema),
    ),
  sendMessage: (conversationId: string, body: string) =>
    apiRequest<Message>(`/me/conversations/${conversationId}/messages`, messageSchema, {
      method: 'POST',
      body: { body },
    }),
  // Boleto de un solo uso para el handshake del socket — nunca el JWT real.
  issueSocketTicket: () =>
    apiRequest<SocketTicket>('/auth/socket-ticket', socketTicketSchema, { method: 'POST' }),
};
