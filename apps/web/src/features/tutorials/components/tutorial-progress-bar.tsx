'use client';

import { cn } from '@/shared/lib/cn';

/**
 * Compact step indicator: a filled bar plus a numeric label. Communicates
 * progress by width AND text (never by colour alone) for accessibility.
 */
export function TutorialProgressBar({
  current,
  total,
  reducedMotion,
}: Readonly<{ current: number; total: number; reducedMotion: boolean }>) {
  const percent = total > 0 ? Math.round(((current + 1) / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--surface-high)]"
      >
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r from-[var(--volt-dim)] to-[var(--volt)]',
            !reducedMotion && 'transition-[width] duration-300 ease-out',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span
        className="shrink-0 text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]"
        aria-label={`Paso ${current + 1} de ${total}`}
      >
        {current + 1} / {total}
      </span>
    </div>
  );
}
