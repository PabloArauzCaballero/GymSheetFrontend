'use client';

import Link from 'next/link';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { authCopy } from '@gymsheet/domain';
import { Checkbox } from '@/shared/components/ui/checkbox';

const linkClass =
  'font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4';

/** Terms and privacy acceptance, with both documents one tap away. */
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
            </Link>{' '}
            {authCopy.terms.connector}{' '}
            <Link className={linkClass} href="/privacidad" target="_blank">
              {authCopy.terms.privacyLabel}
            </Link>
            .
          </span>
        }
        {...registration}
      />
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
