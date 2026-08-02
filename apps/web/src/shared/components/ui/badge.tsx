import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'border-[var(--border)] text-[var(--text-muted)]',
  success: 'border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]',
  warning: 'border-[var(--warning-border)] bg-[var(--warning-bg)] text-[var(--warning-text)]',
  danger: 'border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]',
  info: 'border-[var(--info-border)] bg-[var(--info-bg)] text-[var(--info-text)]',
};

export function Badge({
  children,
  tone = 'neutral',
  className,
}: Readonly<{ children: ReactNode; tone?: Tone; className?: string }>) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em]',
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
