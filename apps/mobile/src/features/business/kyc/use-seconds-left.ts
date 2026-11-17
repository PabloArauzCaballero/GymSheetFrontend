import { secondsLeft } from '@gymsheet/domain';
import { useEffect, useState } from 'react';

/** Seconds until `expiresAt`, ticking once per second; stops at zero. */
export function useSecondsLeft(expiresAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());
  const left = expiresAt ? secondsLeft(expiresAt, now) : 0;
  const done = left === 0;
  useEffect(() => {
    if (!expiresAt || done) return undefined;
    const tick = () => setNow(Date.now());
    // Re-read the clock at once: `now` may predate this deadline.
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [expiresAt, done]);
  return left;
}
