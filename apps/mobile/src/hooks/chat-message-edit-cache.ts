import type { Message } from '@gymsheet/schemas';
import type { QueryClient } from '@tanstack/react-query';
import { applyMessageUpdated } from './chat-message-edit';

type PatchChatMessageCacheOptions = {
  queryClient: QueryClient;
  conversationId: string;
  updated: Message;
  isCurrent: () => boolean;
  getDeletedMessageIds: () => ReadonlySet<string>;
};

/** Cancel stale history before writing an edit into the active conversation cache. */
export async function patchChatMessageCache({
  queryClient,
  conversationId,
  updated,
  isCurrent,
  getDeletedMessageIds,
}: PatchChatMessageCacheOptions): Promise<boolean> {
  const queryKey = ['chat', 'messages', conversationId] as const;
  const hadCachedMessages = queryClient.getQueryData<Message[]>(queryKey) !== undefined;
  await queryClient.cancelQueries({ queryKey, exact: true });
  if (!isCurrent() || updated.type === 'system' || updated.deletedAt || getDeletedMessageIds().has(updated.id)) return false;

  if (!hadCachedMessages) {
    // A socket update may arrive during the first history request. Seed the
    // known message so cancellation cannot strand the screen in its loader,
    // then reload the complete first page from the server.
    queryClient.setQueryData<Message[]>(queryKey, [updated]);
    await queryClient.invalidateQueries({ queryKey, exact: true });
    return true;
  }

  queryClient.setQueryData<Message[]>(queryKey, (current) =>
    current ? applyMessageUpdated(current, updated, conversationId, getDeletedMessageIds()) : current,
  );
  return true;
}
