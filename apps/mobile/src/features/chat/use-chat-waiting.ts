import { useQuery } from '@tanstack/react-query';
import { chatShouldPulse, chatWaitingLabel } from '@gymsheet/domain';
import { useEffect, useRef, useState } from 'react';
import { chatService } from '@/api/services';
import { pendingRepliesKey } from '@/features/nudge/keys';

/**
 * Matches waiting for my reply: the source of every Chat dot (tab, profile
 * row). Same key as Repi's widget, so both read one cache. `pulseKey` grows
 * only when the count rises after the first read: that is the one moment the
 * dot may pulse.
 */
export function useChatWaiting() {
  const pending = useQuery({ queryKey: pendingRepliesKey, queryFn: chatService.pendingReplies, staleTime: 60_000, refetchInterval: 60_000 });
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
