'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

/**
 * Reveals its content the first time it scrolls into view (IntersectionObserver),
 * with an optional stagger via `index`. Falls back to visible when the observer is
 * unavailable and honours `prefers-reduced-motion` through the shared CSS utility.
 */
export function Reveal({
  children,
  index = 0,
  className,
}: Readonly<{ children: ReactNode; index?: number; className?: string }>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    if (typeof IntersectionObserver === 'undefined') {
      element.classList.add('is-visible');
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.06 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn('reveal-scroll', className)}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {children}
    </div>
  );
}
