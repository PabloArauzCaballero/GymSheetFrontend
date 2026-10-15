'use client';

import { useMutation, type QueryClient } from '@tanstack/react-query';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { MessageDeletedEvent } from '@/features/chat/hooks/use-chat-socket';
import { chatService } from '@/features/chat/services/chat-service';
import type { Message } from '@/shared/api/schemas';
import { queryKeys } from '@/shared/api/query-keys';
import { notify } from '@/shared/notifications';

/** Apodo de la otra persona, edición de mensajes propios y vista única. */
export function useChatMessageMutations({
  conversationId,
  deletedEventsRef,
  onMessageUpdated,
  queryClient,
  setRevealedMedia,
}: Readonly<{
  conversationId: string;
  deletedEventsRef: MutableRefObject<Map<string, MessageDeletedEvent>>;
  onMessageUpdated: (updated: Message) => Promise<void>;
  queryClient: QueryClient;
  setRevealedMedia: Dispatch<SetStateAction<Record<string, string>>>;
}>) {
  const setNickname = useMutation({
    mutationFn: (nickname: string | null) => chatService.setNickname(conversationId, nickname),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.conversations });
      notify.success('Apodo guardado.');
    },
    onError: (error: Error) => notify.error(error),
  });

  const editMessage = useMutation({
    mutationFn: ({ messageId, body }: { messageId: string; body: string }) =>
      chatService.editMessage(conversationId, messageId, body),
    onSuccess: onMessageUpdated,
    onError: (error: Error) => notify.error(error),
  });


  const revealViewOnce = useMutation({
    mutationFn: (messageId: string) => chatService.viewMessage(conversationId, messageId),
    onSuccess: (revealed) => {
      if (!revealed.mediaUrl || deletedEventsRef.current.has(revealed.id)) return;
      const url = revealed.mediaUrl;
      setRevealedMedia((current) => ({ ...current, [revealed.id]: url }));
    },
    onError: (error: Error) => notify.error(error),
  });

  return { setNickname, editMessage, revealViewOnce };
}
