import type { ReactNode } from 'react';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: Readonly<{ eyebrow?: string; title: string; description?: string; actions?: ReactNode }>) {
  return (
    <header className="reveal flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-3xl">
        {eyebrow ? (
          <p className="data-label mb-3 inline-flex items-center gap-2 text-[var(--volt)]">
            <span
              aria-hidden
              className="h-3 w-1 rounded-full bg-[var(--volt)] shadow-[0_0_8px_var(--volt)]"
            />
            {eyebrow}
          </p>
        ) : null}
        <h1 className="display-title text-gradient-volt">{title}</h1>
        {description ? (
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-muted)] sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">{actions}</div>
      ) : null}
    </header>
  );
}
