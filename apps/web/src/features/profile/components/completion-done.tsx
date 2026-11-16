import { completeCardMode, noOrphan, profileCompleteCopy } from '@gymsheet/domain';
import { ChevronRight, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import type { ProfileCompletion } from '@/shared/api/schemas';

const PREVIEW_HREF = '/profile/editar?tab=preview';

/**
 * 100 % (`CompletionDone` of the app): the nudge becomes a quiet reward, said
 * once. The first time, a card — a full check in accent ink, what completing it
 * earned and the way to see the result. On later visits it collapses to one
 * quiet line with the same way to the preview: a finished profile stops asking.
 */
export function CompletionDone({ completion, seenBefore }: Readonly<{ completion: ProfileCompletion; seenBefore: boolean | undefined }>) {
  const copy = profileCompleteCopy(completion);
  const mode = completeCardMode(completion.percent, seenBefore);
  if (!copy || mode === 'none' || mode === 'pending') return null;
  if (mode === 'quiet') {
    return (
      <Link className="tap t-subhead group inline-flex min-h-11 items-center gap-2 justify-self-start text-[var(--text-muted)] hover:text-[var(--text)]" data-testid="profile-complete-quiet" href={PREVIEW_HREF}>
        <CircleCheck aria-hidden className="size-4 shrink-0 text-[var(--accent-ink)]" />
        <span>{noOrphan(`${copy.title} · Ver cómo te ven`)}</span>
        <ChevronRight aria-hidden className="size-4 shrink-0 transition-transform duration-[var(--dur-2)] group-hover:translate-x-0.5" />
      </Link>
    );
  }
  return (
    <Link className="tap panel group flex min-h-16 items-center gap-3 p-5 active:scale-[0.98]" data-testid="profile-complete" href={PREVIEW_HREF}>
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--surface-highest)] text-[var(--accent-ink)]">
        <CircleCheck className="size-7 fill-[var(--accent-ink)] text-[var(--surface-highest)]" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="t-headline">{copy.title}</span>
        <span className="t-footnote text-pretty text-[var(--text-muted)]">{noOrphan(copy.body)}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--text-muted)] transition-transform duration-[var(--dur-2)] group-hover:translate-x-0.5" />
    </Link>
  );
}
