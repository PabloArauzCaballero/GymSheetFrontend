'use client';

import { useMutationState, type MutationKey } from '@tanstack/react-query';
import { saveStatusLabel, sectionSaveStatus, type SaveStatus } from '@gymsheet/domain';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

/**
 * The last save of a section, read from the mutation cache by key, so it
 * survives the remount a new server value causes (`key={bio}`).
 */
export function useSectionSave(mutationKey: MutationKey, dirty: boolean): SaveStatus {
  const statuses = useMutationState({ filters: { mutationKey }, select: (mutation) => mutation.state.status });
  return sectionSaveStatus({ dirty, mutation: statuses[statuses.length - 1] });
}

/**
 * The edit page's single save language (`apps/mobile/src/components/save-status.tsx`):
 * beside each section's save, one polite line says unsaved / saving / saved /
 * failed, in place. Each change fades in once; nothing moves on its own.
 *
 * In a save row (`SAVE_ROW`) the line is as wide as the longest of
 * its own messages (invisible sizers in the same grid cell) and never squeezed (`basis-auto`): when that
 * width and the button do not fit side by side, the row stacks — the status on one line above a
 * full-width button — and it decides once, so the button never jumps when the message changes.
 */
export function SaveStatusLine({ status, saved, className, testId }: Readonly<{ status: SaveStatus; saved: string; className?: string; testId?: string }>) {
  const label = saveStatusLabel(status, saved);
  const tone = status === 'saved' ? 'text-[var(--accent-ink)]' : status === 'failed' ? 'text-[var(--danger-text)]' : 'text-[var(--text-muted)]';
  const cell = 'col-start-1 row-start-1 inline-flex items-center gap-1.5';
  return (
    <p aria-live="polite" className={cn('t-footnote grid min-h-5 min-w-0 grow-[999] basis-auto items-center', tone, className)} data-testid={testId}>
      {[saveStatusLabel('dirty', saved), saved].map((sizer) => (
        <span aria-hidden className={cn(cell, 'invisible')} key={sizer}>
          <span className="size-4 shrink-0" />
          {sizer}
        </span>
      ))}
      {label ? (
        <span className={cn(cell, 'animate-fade-in')} key={status}>
          {status === 'saved' ? <CircleCheck aria-hidden className="size-4 shrink-0" /> : null}
          {status === 'failed' ? <CircleAlert aria-hidden className="size-4 shrink-0" /> : null}
          {status === 'dirty' ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" /> : null}
          {label}
        </span>
      ) : null}
    </p>
  );
}

/** A save row: the status, then the section's button, which grows only once the row has stacked it. */
export const SAVE_ROW = 'flex flex-wrap items-center gap-3 [&>button]:grow';
