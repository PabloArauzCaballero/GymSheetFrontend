'use client';

import { useEffect, useState } from 'react';

/**
 * Animates a whole number from 0 to `value` on mount with an ease-out curve.
 * Server-renders the final-shaped "0" and counts up after hydration; honours
 * `prefers-reduced-motion` by jumping straight to the value.
 */
export function CountUp({
  value,
  durationMs = 900,
  locale = 'es-BO',
}: Readonly<{ value: number; durationMs?: number; locale?: string }>) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    if (prefersReduced || value === 0) {
      // Defer to the next frame so the update is not synchronous within the effect.
      raf = window.requestAnimationFrame(() => setDisplay(value));
      return () => window.cancelAnimationFrame(raf);
    }
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min(1, (timestamp - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) raf = window.requestAnimationFrame(step);
    };
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [value, durationMs]);

  return <>{display.toLocaleString(locale)}</>;
}
