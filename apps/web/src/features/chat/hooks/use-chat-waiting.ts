'use client';

import { useQuery } from '@tanstack/react-query';
import { chatShouldPulse, chatWaitingLabel } from '@gymsheet/domain';
import { useEffect, useRef, useState } from 'react';
import { chatService } from '@/features/chat/services/chat-service';

export const chatWaitingKey = ['chat', 'pending-replies'] as const;

/**
 * Matches waiting for my reply (`apps/mobile/src/features/chat/use-chat-waiting.ts`):
 * the source of every Chat dot. A failed read is swallowed on purpose — it is
 * an indicator, not content (same rule as `useInteractionAlerts`). `pulseKey`
 * grows only when the count rises after the first read.
 */
export function useChatWaiting() {
  const pending = useQuery({
    queryKey: chatWaitingKey,
    queryFn: () => chatService.pendingReplies().catch(() => null),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const count = pending.data?.count ?? 0;
  const previous = useRef<number | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (!pending.isSuccess) return;
    if (chatShouldPulse(previous.current, count)) setPulseKey((key) => key + 1);
    previous.current = count;
  }, [count, pending.isSuccess]);
  return { count, label: chatWaitingLabel(count), pulseKey };
}
