'use client';

import { useState } from 'react';
import { ArrowUpRight, FileText } from 'lucide-react';
import type { LegalDocumentVersion } from '@/shared/api/schemas';
import { acceptLegal, fetchPendingLegal } from '@/features/auth/services/auth-client';
import { AuthAlert } from '@/features/auth/components/auth-alert';
import { BrandLockup } from '@/shared/components/brand/brand-mark';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  isTermsVersionOutdated,
  legalDocumentLinks,
  legalGateCopy,
  legalVersionLabel,
} from '@/features/legal/lib/legal-documents';

/**
 * Full-page block shown while the account lacks a current legal document.
 *
 * A page and not a dismissable dialog: every API call answers 428 until the
 * person accepts, so there is nothing behind it to go back to. Logging out is a
 * plain link to the BFF logout (works without JavaScript too).
 */
export function LegalAcceptanceScreen({
  pending,
  onAccepted,
  onPendingChanged,
}: Readonly<{
  pending: readonly LegalDocumentVersion[];
  onAccepted: () => void;
  onPendingChanged: (pending: LegalDocumentVersion[]) => void;
}>) {
  const [accepted, setAccepted] = useState(false);
  const [checkboxError, setCheckboxError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!accepted) {
      setCheckboxError(legalGateCopy.checkboxRequired);
      return;
    }
    setFailure(null);
    setSubmitting(true);
    try {
      const stillPending = await acceptLegal(pending);
      if (stillPending.length === 0) onAccepted();
      else onPendingChanged(stillPending);
    } catch (error: unknown) {
      if (isTermsVersionOutdated(error)) {
        // A new version shipped while this page was open: show it and ask again.
        setAccepted(false);
        setFailure(legalGateCopy.changedAgain);
        onPendingChanged(await fetchPendingLegal().catch(() => [...pending]));
      } else {
        setFailure(legalGateCopy.failed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-10">
      <section
        aria-labelledby="legal-gate-title"
        className="reveal grid w-full max-w-[28rem] gap-6 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-6 shadow-[var(--shadow-md)] sm:p-8"
      >
        <BrandLockup size={26} />
        <div className="grid gap-2">
          <h1 className="title-text" id="legal-gate-title">
            {legalGateCopy.title}
          </h1>
          <p className="text-[15px] leading-6 text-[var(--text-muted)]">{legalGateCopy.description}</p>
        </div>

        <ul className="m-0 grid list-none gap-2 p-0">
          {pending.map((entry) => {
            const link = legalDocumentLinks[entry.document];
            return (
              <li key={entry.document}>
                <a
                  className="flex min-h-14 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors duration-[var(--dur-2)] hover:bg-[var(--surface-high)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] motion-reduce:transition-none"
                  href={link.href}
                  rel="noopener"
                  target="_blank"
                >
                  <FileText aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
                  <span className="grid min-w-0 flex-1">
                    <span className="text-[15px] font-semibold text-[var(--text)]">{link.label}</span>
                    <span className="text-xs text-[var(--text-muted)]">{legalVersionLabel(entry.version)}</span>
                  </span>
                  <ArrowUpRight aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
                  <span className="sr-only">(se abre en una pestaña nueva)</span>
                </a>
              </li>
            );
          })}
        </ul>

        <div>
          <Checkbox
            aria-describedby={checkboxError ? 'legal-gate-checkbox-error' : undefined}
            aria-invalid={checkboxError ? true : undefined}
            checked={accepted}
            label={legalGateCopy.checkbox}
            onChange={(event) => {
              setAccepted(event.target.checked);
              setCheckboxError(null);
            }}
          />
          {checkboxError ? (
            <p className="mt-1 text-xs text-[var(--danger-text)]" id="legal-gate-checkbox-error" role="alert">
              {checkboxError}
            </p>
          ) : null}
        </div>

        {failure ? <AuthAlert message={failure} /> : null}

        <div className="grid gap-2">
          <Button className="w-full" loading={submitting} onClick={submit} size="lg" type="button" variant="primary">
            {legalGateCopy.submit}
          </Button>
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-md)] text-[15px] font-medium text-[var(--text-muted)] transition-colors duration-[var(--dur-2)] hover:text-[var(--text)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] motion-reduce:transition-none"
            href="/api/auth/logout?returnTo=/login"
          >
            {legalGateCopy.logout}
          </a>
        </div>
      </section>
    </main>
  );
}
