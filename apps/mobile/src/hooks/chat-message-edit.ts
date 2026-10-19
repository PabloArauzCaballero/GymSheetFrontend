import type { Message } from '@gymsheet/schemas';

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;
/**
 * `createdAt` es la hora del servidor y `now` la del teléfono. Con el reloj del
 * teléfono un poco atrasado, un mensaje recién enviado tenía «edad negativa» y
 * «Editar» no aparecía. El plazo de verdad lo aplica el servidor.
 */
const CLOCK_SKEW_TOLERANCE_MS = 2 * 60 * 1000;

export function canEditMessage(message: Message, currentUserId: string, now = new Date()): boolean {
  if (message.type === 'system' || message.deletedAt || message.senderId !== currentUserId || message.type !== 'text' || !message.body) return false;
  const age = now.getTime() - new Date(message.createdAt).getTime();
  return age >= -CLOCK_SKEW_TOLERANCE_MS && age <= MESSAGE_EDIT_WINDOW_MS;
}

export function applyMessageUpdated(
  messages: Message[],
  updated: Message,
  conversationId: string,
  deletedMessageIds: ReadonlySet<string> = new Set(),
): Message[] {
  if (updated.type === 'system' || updated.conversationId !== conversationId || updated.deletedAt || deletedMessageIds.has(updated.id)) {
    return messages;
  }

  return messages.map((message) =>
    message.id === updated.id &&
    message.conversationId === conversationId &&
    message.type !== 'system' &&
    !message.deletedAt &&
    !deletedMessageIds.has(message.id)
      ? updated
      : message,
  );
}

export function applyKnownMessageUpdates(
  messages: Message[],
  updates: ReadonlyMap<string, Message>,
  conversationId: string,
  deletedMessageIds: ReadonlySet<string> = new Set(),
): Message[] {
  return [...updates.values()].reduce(
    (current, updated) => applyMessageUpdated(current, updated, conversationId, deletedMessageIds),
    messages,
  );
}
