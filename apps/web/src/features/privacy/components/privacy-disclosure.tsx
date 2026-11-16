'use client';

import { ChevronDown } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

/**
 * One account action that opens in place. A native `<details>`: keyboard,
 * screen-reader state and the closed default come from the browser. With an
 * `id`, a link to `#id` (a notice that points here) opens it and scrolls to it.
 */
export function PrivacyDisclosure({
  id,
  title,
  tone = 'default',
  children,
}: Readonly<{ id?: string; title: string; tone?: 'default' | 'danger'; children: ReactNode }>) {
  const details = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (!id) return;
    const openWhenTargeted = () => {
      const element = details.current;
      if (!element || window.location.hash !== `#${id}`) return;
      element.open = true;
      element.scrollIntoView({ block: 'start' });
    };
    openWhenTargeted();
    window.addEventListener('hashchange', openWhenTargeted);
    return () => window.removeEventListener('hashchange', openWhenTargeted);
  }, [id]);

  return (
    <details className="group scroll-mt-24 py-1" id={id} ref={details}>
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] [&::-webkit-details-marker]:hidden">
        <span className={`t-headline ${tone === 'danger' ? 'text-[var(--danger-text)]' : ''}`}>{title}</span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-[var(--text-muted)] transition-transform duration-[var(--dur-2)] ease-[var(--ease-out)] group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <div className="pb-4 pt-2">{children}</div>
    </details>
  );
}
