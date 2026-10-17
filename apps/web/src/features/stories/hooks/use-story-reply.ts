'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import type { FormEvent } from 'react';
import { useRef, useState } from 'react';
import type { StoryFeedEntry } from '@/shared/api/schemas';
import { notify } from '@/shared/notifications';
import { storiesService } from '@/features/stories/services/stories-service';

/**
 * Respuesta a una story: el texto, la mutación y la protección contra envíos
 * duplicados. Reintentar el mismo texto sobre la misma story reutiliza el
 * `requestId`, así que el servidor puede deduplicar.
 */
export function useStoryReply({
  story,
  isOwn,
  onClose,
}: Readonly<{
  story: StoryFeedEntry['stories'][number] | undefined;
  isOwn: boolean;
  onClose: () => void;
}>) {
  const router = useRouter();
  const [replyText, setReplyText] = useState('');
  const replyRequestRef = useRef<{ storyId: string; text: string; requestId: string } | null>(null);
  const replySubmittingRef = useRef(false);

  const replyToStory = useMutation({
    mutationFn: ({ storyId, text, requestId }: { storyId: string; text: string; requestId: string }) =>
      storiesService.reply(storyId, text, requestId),
    onSuccess: (message) => {
      replySubmittingRef.current = false;
      replyRequestRef.current = null;
      onClose();
      router.push(`/chat/${message.conversationId}?storyReplyMessageId=${message.id}`);
    },
    onError: (error: Error) => {
      replySubmittingRef.current = false;
      notify.error(error);
    },
  });

  function submitStoryReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!story || isOwn || replyToStory.isPending || replySubmittingRef.current) return;
    const text = replyText.trim();
    if (!text) return;
    let request = replyRequestRef.current;
    if (!request || request.storyId !== story.id || request.text !== text) {
      request = { storyId: story.id, text, requestId: crypto.randomUUID() };
      replyRequestRef.current = request;
    }
    replySubmittingRef.current = true;
    replyToStory.mutate(request);
  }

  return { replyText, setReplyText, replyToStory, submitStoryReply };
}
