import type { ClosureBlockerNotice } from '@gymsheet/domain';
import { ChevronRight, TriangleAlert } from 'lucide-react';
import Link from 'next/link';

/**
 * What stops the closure right now (a business with receipts to decide,
 * ADR-0028), each with the way to solve it. The proof is not offered while
 * one is listed: the backend would answer 409 anyway.
 */
export function ClosureBlockers({ notices }: Readonly<{ notices: readonly ClosureBlockerNotice[] }>) {
  if (notices.length === 0) return null;
  return (
    <ul aria-label="Antes de cerrar" className="m-0 grid list-none gap-2 p-0">
      {notices.map((notice) => (
        <li className="flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--warning-border)] bg-[var(--warning-bg)] p-4 text-[var(--warning-text)]" key={notice.code}>
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0" />
          <div className="grid min-w-0 gap-1">
            <p className="t-subhead font-semibold">{notice.title}</p>
            <p className="t-subhead">{notice.message}</p>
            {notice.action ? (
              <Link
                className="t-subhead inline-flex min-h-11 items-center gap-1 justify-self-start font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
                href={notice.action.web}
              >
                {notice.action.label}
                <ChevronRight aria-hidden className="size-4" />
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** «Qué pasa al cerrar»: the effects of closing a business account, in the words of the backend contract. */
export function BusinessClosureEffects({ title, effects }: Readonly<{ title: string; effects: readonly string[] }>) {
  return (
    <section aria-label={title} className="grid gap-2">
      <h4 className="t-headline">{title}</h4>
      <ul className="t-subhead m-0 grid list-disc gap-1.5 pl-5 text-[var(--text-muted)]">
        {effects.map((effect) => (
          <li key={effect}>{effect}</li>
        ))}
      </ul>
    </section>
  );
}
