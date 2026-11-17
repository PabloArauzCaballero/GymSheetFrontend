'use client';

import Link from 'next/link';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { businessTermsCopy } from '@gymsheet/domain';
import { legalDocumentLinks } from '@/features/legal/lib/legal-documents';
import { Checkbox } from '@/shared/components/ui/checkbox';

const linkClass = 'font-semibold text-[var(--text)] underline decoration-[var(--volt)] underline-offset-4';

/**
 * One checkbox for the business legal set (`textos-app-negocios.md` §1): the
 * signup records the acceptance of every current document. Never pre-checked.
 */
export function BusinessTermsField({
  registration,
  error,
}: Readonly<{ registration: UseFormRegisterReturn<'acceptedTerms'>; error?: string }>) {
  return (
    <div>
      <Checkbox
        aria-describedby="business-terms-helper"
        label={
          <span>
            {businessTermsCopy.prefix}{' '}
            <Link className={linkClass} href={legalDocumentLinks.BUSINESS_TERMS.href} target="_blank">
              {businessTermsCopy.businessTermsLabel}
            </Link>{' '}
            {businessTermsCopy.connector}{' '}
            <Link className={linkClass} href={legalDocumentLinks.BUSINESS_DPA.href} target="_blank">
              {businessTermsCopy.businessDpaLabel}
            </Link>
          </span>
        }
        {...registration}
      />
      <p className="mt-1 pl-[30px] text-xs leading-5 text-[var(--text-muted)]" id="business-terms-helper">
        {businessTermsCopy.helper}
      </p>
      {error ? (
        <p className="mt-1 text-xs text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
