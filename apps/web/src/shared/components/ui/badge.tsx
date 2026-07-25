import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneClasses: Record<Tone, string> = {
  neutral: 'border-[var(--border)] text-[var(--text-muted)]',
  success: 'border-[#526800] bg-[#182000] text-[var(--volt)]',
  warning: 'border-[#5b4820] bg-[#241c0c] text-[#e0b65f]',
  danger: 'border-[#63302c] bg-[#241211] text-[#ffb4ab]',
  info: 'border-[#344654] bg-[#111b21] text-[#a8d4ee]',
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
