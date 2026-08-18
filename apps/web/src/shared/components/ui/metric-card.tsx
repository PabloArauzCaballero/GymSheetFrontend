import type { ReactNode } from 'react';
import { CountUp } from '@/shared/components/motion/count-up';
import { cn } from '@/shared/lib/cn';

export function MetricCard({
  label,
  value,
  suffix,
  icon,
  accent = false,
  className,
}: Readonly<{
  label: string;
  value: string | number;
  suffix?: string;
  icon?: ReactNode;
  accent?: boolean;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'panel hover-lift group relative flex min-h-32 flex-col justify-between overflow-hidden p-5',
        accent && 'border-[color-mix(in_srgb,var(--volt)_28%,transparent)]',
        className,
      )}
    >
      {accent ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-[var(--volt)] opacity-[0.07] blur-2xl transition-opacity duration-300 group-hover:opacity-15"
        />
      ) : null}
      <div className="flex items-center justify-between gap-3">
        <span className="data-label">{label}</span>
        {icon ? (
          <span
            className={cn(
              'grid size-9 place-items-center rounded-[6px] border border-[var(--border-subtle)] bg-[var(--surface-low)] transition-all duration-300 group-hover:scale-110',
              accent
                ? 'text-[var(--accent-ink)] group-hover:border-[var(--volt)]'
                : 'text-[var(--text-muted)] group-hover:text-[var(--text)]',
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          'data-value mt-5 text-3xl font-semibold tracking-[-0.02em] sm:text-4xl',
          accent && 'text-[var(--accent-ink)]',
        )}
      >
        {typeof value === 'number' ? <CountUp value={value} /> : value}
        {suffix ? (
          <span className="ml-2 text-sm font-semibold tracking-normal text-[var(--text-muted)]">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
