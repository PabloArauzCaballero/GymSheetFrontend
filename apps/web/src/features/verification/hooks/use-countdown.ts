'use client';

import { secondsLeft } from '@gymsheet/domain';
import { useEffect, useState } from 'react';

/** Seconds left until `expiresAt`, ticking once per second; stops at zero. */
export function useCountdown(expiresAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  const left = expiresAt ? secondsLeft(expiresAt, now) : 0;
  const done = left === 0;
  useEffect(() => {
    if (!expiresAt || done) return undefined;
    const tick = () => setNow(Date.now());
    // Re-read the clock at once: `now` may predate this deadline (idle page, previous gesture).
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [expiresAt, done]);
  return left;
}
