import { formatCountdown, gestureGlyph, verificationCopy } from '@gymsheet/domain';
import type { VerificationGesture } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';

/**
 * The gesture to perform and the time left. The glyph is a large, quiet
 * illustration; the instruction is the content. The clock only changes
 * colour near the end and always says it in words too.
 */
export function ChallengeCard({ gesture, seconds }: Readonly<{ gesture: VerificationGesture; seconds: number }>) {
  const urgent = seconds <= 60;
  return (
    <section aria-labelledby="verification-gesture" className="panel grid justify-items-center gap-4 px-6 py-8 text-center">
      <span aria-hidden className="grid size-24 place-items-center rounded-full bg-[var(--surface-high)] text-5xl leading-none">
        {gestureGlyph(gesture)}
      </span>
      <div className="grid gap-1.5">
        <h2 className="data-label text-[var(--text-muted)]" id="verification-gesture">
          {verificationCopy.gestureTitle}
        </h2>
        <p className="title-text max-w-sm text-balance">{gesture.instruction}</p>
      </div>
      <p
        aria-atomic="true"
        className={cn(
          't-subhead rounded-full px-3 py-1 tabular-nums',
          urgent ? 'bg-[var(--warning-bg)] text-[var(--warning-text)]' : 'bg-[var(--surface-high)] text-[var(--text-muted)]',
        )}
        data-testid="verification-countdown"
        role="timer"
      >
        {verificationCopy.countdown(formatCountdown(seconds))}
      </p>
    </section>
  );
}
