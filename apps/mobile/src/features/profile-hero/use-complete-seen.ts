import { completeSeenAfter, profileCompleteSeenKey } from '@gymsheet/domain';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';

/**
 * Whether this member had already seen their profile at 100 % when the screen
 * opened (`completeCardMode`), and the device memory kept in step with the
 * current percent. The answer is read once per mount, so the full card stays
 * full for the whole visit and collapses on the next one.
 */
export function useCompleteSeen(userId: string | undefined, percent: number | undefined): boolean | undefined {
  const [seenBefore, setSeenBefore] = useState<{ userId: string; seen: boolean }>();
  useEffect(() => {
    if (!userId || seenBefore?.userId === userId) return;
    let cancelled = false;
    SecureStore.getItemAsync(profileCompleteSeenKey(userId))
      .then((raw) => !cancelled && setSeenBefore({ userId, seen: raw === '1' }))
      .catch(() => !cancelled && setSeenBefore({ userId, seen: false }));
    return () => {
      cancelled = true;
    };
  }, [seenBefore?.userId, userId]);
  useEffect(() => {
    if (!userId || percent === undefined || seenBefore?.userId !== userId) return;
    const key = profileCompleteSeenKey(userId);
    void (completeSeenAfter(percent) ? SecureStore.setItemAsync(key, '1') : SecureStore.deleteItemAsync(key)).catch(() => undefined);
  }, [percent, seenBefore?.userId, userId]);
  return seenBefore && seenBefore.userId === userId ? seenBefore.seen : undefined;
}
