import type { Message } from '@gymsheet/schemas';

export type MessageDeletedEvent = {
  conversationId: string;
  messageId: string;
  scope: 'EVERYONE';
  deletedAt: string;
};

export function asDeletedMessage(message: Message): Message {
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
  };
}

export function applyMessageDeleted(messages: Message[], event: MessageDeletedEvent): Message[] {
  return messages.map((message) =>
    message.type !== 'system' && message.id === event.messageId && message.conversationId === event.conversationId
      ? asDeletedMessage(message)
      : message,
  );
}

export function sanitizeDeletedMessages(messages: Message[], deletedMessageIds: ReadonlySet<string>): Message[] {
  return messages.map((message) =>
    message.type !== 'system' && deletedMessageIds.has(message.id) ? asDeletedMessage(message) : message,
  );
}

export function mergeIncomingMessage(
  messages: Message[],
  incoming: Message,
  deletedMessageIds: ReadonlySet<string>,
): Message[] {
  const existingIndex = messages.findIndex((message) => message.id === incoming.id);
  if (deletedMessageIds.has(incoming.id)) {
    const tombstone = asDeletedMessage(incoming);
    if (existingIndex < 0) return [...messages, tombstone];
    return messages.map((message, index) => index === existingIndex ? asDeletedMessage(message) : message);
  }
  if (existingIndex >= 0) return messages;
  return [...messages, incoming];
}
