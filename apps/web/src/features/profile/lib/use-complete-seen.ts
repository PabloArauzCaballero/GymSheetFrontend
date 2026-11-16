'use client';

import { completeSeenAfter, profileCompleteSeenKey } from '@gymsheet/domain';
import { useEffect, useState } from 'react';

function read(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    // Private window or blocked storage: treat as never seen (the card shows in full, nothing breaks).
    return false;
  }
}

/**
 * Whether this member had already seen their profile at 100 % when the page
 * opened (`completeCardMode`), and the browser's memory kept in step with the
 * current percent. Read once per mount, in the browser only (the server has no
 * storage), so the full card stays for the whole visit and collapses next time.
 * Same contract as the app's `useCompleteSeen` (SecureStore there).
 */
export function useCompleteSeen(userId: string | undefined, percent: number | undefined): boolean | undefined {
  const [seenBefore, setSeenBefore] = useState<{ userId: string; seen: boolean }>();
  // Read once per member, during render (React's «adjust state when a prop changes» pattern), only in the
  // browser: it is synchronous, so the card never renders a wrong variant first.
  if (userId && seenBefore?.userId !== userId && typeof window !== 'undefined') {
    setSeenBefore({ userId, seen: read(profileCompleteSeenKey(userId)) });
  }
  useEffect(() => {
    if (!userId || percent === undefined || seenBefore?.userId !== userId) return;
    const key = profileCompleteSeenKey(userId);
    try {
      if (completeSeenAfter(percent)) window.localStorage.setItem(key, '1');
      else window.localStorage.removeItem(key);
    } catch {
      // Not remembered: the full card simply shows again next time.
    }
  }, [percent, seenBefore?.userId, userId]);
  return seenBefore && seenBefore.userId === userId ? seenBefore.seen : undefined;
}

/**
 * Logout forgets the «already saw 100 %» flags kept in this browser (every member's: the logout control
 * does not know the id, and the flag is per device anyway), as the app does with SecureStore.
 */
export function forgetCompleteSeen(): void {
  try {
    const prefix = profileCompleteSeenKey('');
    for (const key of Object.keys(window.localStorage)) if (key.startsWith(prefix)) window.localStorage.removeItem(key);
  } catch {
    // Storage blocked: nothing was remembered either.
  }
}
