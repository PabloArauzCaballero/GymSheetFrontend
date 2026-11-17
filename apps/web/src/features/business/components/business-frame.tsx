'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { BrandLockup } from '@/shared/components/brand/brand-mark';

/**
 * The frame of the business signup: one centered column, the brand, and one
 * card with the step's progress, title and content. No marketing column: the
 * person came to register a business, the form is the whole page.
 */
export function BusinessFrame({
  progress,
  title,
  description,
  children,
  footer,
}: Readonly<{ progress?: string; title: string; description?: string; children: ReactNode; footer?: ReactNode }>) {
  const heading = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  // A new step (not the first render) moves the focus to its title: keyboard and screen reader users start there.
  useEffect(() => {
    if (mounted.current) heading.current?.focus();
    mounted.current = true;
  }, [title]);
  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center px-4 py-10 sm:px-8">
      <AmbientBackground variant="auth" fixed />
      <div className="reveal grid w-full max-w-[34rem] gap-6">
        <div className="flex justify-center">
          <BrandLockup size={28} />
        </div>
        <section
          aria-labelledby="business-step-title"
          className="grid gap-6 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-6 shadow-[var(--shadow-md)] sm:p-8"
        >
          <header className="grid gap-1">
            {progress ? (
              <p className="data-label" aria-live="polite">
                {progress}
              </p>
            ) : null}
            <h1 className="title-text outline-none" id="business-step-title" ref={heading} tabIndex={-1}>
              {title}
            </h1>
            {description ? <p className="t-subhead text-[var(--text-muted)]">{description}</p> : null}
          </header>
          {children}
        </section>
        {footer ? <div className="flex flex-col items-center gap-3 text-center text-[15px]">{footer}</div> : null}
      </div>
    </main>
  );
}
