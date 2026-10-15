import type { Message } from '@/shared/api/schemas';

const MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

export function canEditMessage(message: Message, currentUserId: string, now = new Date()): boolean {
  if (message.type === 'system' || message.deletedAt || message.senderId !== currentUserId || message.type !== 'text' || !message.body) return false;
  const age = now.getTime() - new Date(message.createdAt).getTime();
  return age >= 0 && age <= MESSAGE_EDIT_WINDOW_MS;
}

export function applyMessageUpdated(
  messages: Message[],
  updated: Message,
  conversationId: string,
): Message[] {
  if (updated.type === 'system' || updated.conversationId !== conversationId) return messages;
  return messages.map((message) =>
    message.type !== 'system' && message.id === updated.id && message.conversationId === conversationId
      ? updated
      : message,
  );
}
