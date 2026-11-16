import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * One account action that opens in place. A native `<details>`: keyboard,
 * screen-reader state and the closed default come from the browser.
 */
export function PrivacyDisclosure({
  title,
  tone = 'default',
  children,
}: Readonly<{ title: string; tone?: 'default' | 'danger'; children: ReactNode }>) {
  return (
    <details className="group py-1">
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
