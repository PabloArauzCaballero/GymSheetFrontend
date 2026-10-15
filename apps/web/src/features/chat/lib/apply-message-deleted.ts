import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { MessageDeletedEvent } from '@/features/chat/hooks/use-chat-socket';
import { asDeletedMessage } from '@/features/chat/lib/as-deleted-message';
import type { Message } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';

export type MessageDeletedContext = Readonly<{
  conversationId: string;
  queryClient: QueryClient;
  deletedEventsRef: MutableRefObject<Map<string, MessageDeletedEvent>>;
  setDeletedEvents: Dispatch<SetStateAction<Map<string, MessageDeletedEvent>>>;
  setLiveMessages: Dispatch<SetStateAction<Message[]>>;
  setOlderMessages: Dispatch<SetStateAction<Message[]>>;
  setRevealedMedia: Dispatch<SetStateAction<Record<string, string>>>;
}>;

/** Un mensaje borrado «para todos»: lo vacía en cada fuente y evita que se restaure. */
export function applyMessageDeleted(event: MessageDeletedEvent, context: MessageDeletedContext): void {
  const {
    conversationId,
    queryClient,
    deletedEventsRef,
    setDeletedEvents,
    setLiveMessages,
    setOlderMessages,
    setRevealedMedia,
  } = context;
  if (event.conversationId !== conversationId || event.scope !== 'EVERYONE') return;
  deletedEventsRef.current.set(event.messageId, event);
  setDeletedEvents(new Map(deletedEventsRef.current));
  const sanitize = (items: Message[]) =>
    items.map((message) =>
      message.id === event.messageId ? asDeletedMessage(message, event.deletedAt) : message,
    );
  setLiveMessages(sanitize);
  setOlderMessages(sanitize);
  queryClient.setQueryData<Message[] | undefined>(
    queryKeys.messages(conversationId),
    (current) => (current ? sanitize(current) : current),
  );
  setRevealedMedia((current) => {
    if (!(event.messageId in current)) return current;
    const next = { ...current };
    delete next[event.messageId];
    return next;
  });
  void queryClient.invalidateQueries({ queryKey: queryKeys.messages(conversationId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
}
