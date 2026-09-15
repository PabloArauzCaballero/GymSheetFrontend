import type { ReactNode } from 'react';
import { CountUp } from '@/shared/components/motion/count-up';
import { cn } from '@/shared/lib/cn';

export function MetricCard({
  label,
  value,
  suffix,
  icon,
  accent = false,
  rate,
  className,
}: Readonly<{
  label: string;
  value: string | number;
  suffix?: string;
  icon?: ReactNode;
  accent?: boolean;
  /** Cuánto aporta esta cifra a los puntos, ya redactado («+50 c/u»). */
  rate?: string;
  className?: string;
}>) {
  return (
    <div
      className={cn(
        'panel relative flex min-h-32 flex-col justify-between p-5',
        accent && 'border-[color-mix(in_srgb,var(--volt)_22%,transparent)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="grid gap-1.5">
          <span className="data-label">{label}</span>
          {rate ? (
            <span className="justify-self-start rounded-full bg-[var(--surface-high)] px-2 py-0.5 text-xs font-semibold text-[var(--accent-ink)]">
              {rate}
            </span>
          ) : null}
        </span>
        {icon ? (
          <span
            className={cn(
              'grid size-9 place-items-center rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--surface-low)]',
              accent ? 'text-[var(--accent-ink)]' : 'text-[var(--text-muted)]',
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
