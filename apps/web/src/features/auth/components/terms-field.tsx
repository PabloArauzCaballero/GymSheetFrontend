'use client';

import Link from 'next/link';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { authCopy } from '@gymsheet/domain';
import { Checkbox } from '@/shared/components/ui/checkbox';

const linkClass =
  'font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4';

/**
 * One checkbox for the three legal documents (terms, privacy, community
 * rules), each one tap away. Signup records the acceptance of all three.
 */
export function TermsField({
  registration,
  error,
}: Readonly<{ registration: UseFormRegisterReturn<'acceptedTerms'>; error?: string }>) {
  return (
    <div>
      <Checkbox
        label={
          <span>
            {authCopy.terms.prefix}{' '}
            <Link className={linkClass} href="/terminos" target="_blank">
              {authCopy.terms.termsLabel}
            </Link>
            {authCopy.terms.listSeparator}{' '}
            <Link className={linkClass} href="/privacidad" target="_blank">
              {authCopy.terms.privacyLabel}
            </Link>{' '}
            {authCopy.terms.retentionNote} {authCopy.terms.rulesConnector}{' '}
            <Link className={linkClass} href="/normas" target="_blank">
              {authCopy.terms.rulesLabel}
            </Link>
            .
          </span>
        }
        aria-describedby="terms-separate-consents"
        {...registration}
      />
      <p className="mt-1 pl-[30px] text-xs leading-5 text-[var(--text-muted)]" id="terms-separate-consents">
        {authCopy.terms.separateConsentsNote}
      </p>
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
