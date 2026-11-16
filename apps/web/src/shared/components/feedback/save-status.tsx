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
 */
export function SaveStatusLine({ status, saved, className, testId }: Readonly<{ status: SaveStatus; saved: string; className?: string; testId?: string }>) {
  const label = saveStatusLabel(status, saved);
  const tone = status === 'saved' ? 'text-[var(--accent-ink)]' : status === 'failed' ? 'text-[var(--danger-text)]' : 'text-[var(--text-muted)]';
  return (
    <p aria-live="polite" className={cn('t-footnote flex min-h-5 min-w-0 flex-1 items-center gap-1.5', tone, className)} data-testid={testId}>
      {label ? (
        <span className="animate-fade-in inline-flex items-center gap-1.5" key={status}>
          {status === 'saved' ? <CircleCheck aria-hidden className="size-4 shrink-0" /> : null}
          {status === 'failed' ? <CircleAlert aria-hidden className="size-4 shrink-0" /> : null}
          {status === 'dirty' ? <span aria-hidden className="size-2 shrink-0 rounded-full bg-current" /> : null}
          {label}
        </span>
      ) : null}
    </p>
  );
}
