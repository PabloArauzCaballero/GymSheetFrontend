'use client';

import { useCallback, useState } from 'react';
import type { PresenceUpdate } from '@/features/chat/hooks/use-chat-socket';

/**
 * Presencia en vivo de la otra persona. El snapshot REST es lo primero que se
 * ve; en cuanto llega un evento por el socket (la misma cuenta que abrió o
 * cerró) ese pasa a mandar.
 */
export function useChatPresence(otherUserId: string | undefined) {
  const [livePresence, setLivePresence] = useState<PresenceUpdate | null>(null);
  const onPresence = useCallback(
    (presence: PresenceUpdate) => {
      if (presence.userId !== otherUserId) return;
      setLivePresence(presence);
    },
    [otherUserId],
  );
  const matchingPresence = livePresence?.userId === otherUserId ? livePresence : null;
  return { onPresence, matchingPresence };
}
