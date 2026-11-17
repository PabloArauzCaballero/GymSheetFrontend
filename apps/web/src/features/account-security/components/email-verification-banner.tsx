import { emailVerificationCopy } from '@gymsheet/domain';
import { ChevronRight, MailCheck } from 'lucide-react';
import Link from 'next/link';

/**
 * Persistent nudge while the account email is unverified. Quiet on purpose: one
 * line under the top bar, no dismiss (social features stay closed until then).
 */
export function EmailVerificationBanner() {
  return (
    <aside
      aria-label={emailVerificationCopy.title}
      className="border-t border-[var(--border-subtle)] bg-[var(--surface-low)]"
    >
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 sm:px-6 lg:px-10">
        <MailCheck aria-hidden className="size-4 shrink-0 text-[var(--accent-ink)]" />
        <p className="t-subhead min-w-0 flex-1 text-[var(--text-muted)]">
          {emailVerificationCopy.banner}
        </p>
        <Link
          className="inline-flex min-h-11 items-center gap-1 rounded-[var(--radius-sm)] text-[15px] font-semibold text-[var(--text)] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)]"
          href="/verificar-correo"
        >
          {emailVerificationCopy.bannerAction}
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      </div>
    </aside>
  );
}
