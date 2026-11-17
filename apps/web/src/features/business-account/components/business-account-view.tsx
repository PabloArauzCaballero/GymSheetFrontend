import { businessAccountCopy, businessClosureCopy, businessDestination, businessLegalDocuments, kycErasureCopy } from '@gymsheet/domain';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { legalDocumentLinks } from '@/features/legal/lib/legal-documents';
import { AccountClosure } from '@/features/privacy/components/account-closure';
import { AccountExportCard } from '@/features/privacy/components/account-export-card';
import { PrivacyDisclosure } from '@/features/privacy/components/privacy-disclosure';
import { PageHeader } from '@/shared/components/layout/page-header';
import { KycErasure } from './kyc-erasure';

const card = 'rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5 sm:p-6';
const rowLink =
  'flex min-h-12 items-center justify-between gap-4 rounded-[var(--radius-md)] text-[15px] font-semibold transition-colors duration-[var(--dur-1)] hover:text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]';

/**
 * «Cuenta» of the business portal (plan §4.2, franja 8f): the legal set it
 * accepted, the copy of its data (the same export as a person, with the
 * business tables and its KYC), and — last and in red — the KYC erasure and
 * the closure. The name is not edited here: `PATCH /me/account` is a 403 for
 * a business, its name changes through a new KYC version.
 */
export function BusinessAccountView() {
  return (
    <div className="grid gap-6">
      <PageHeader description={businessAccountCopy.description} title={businessAccountCopy.title} />

      <section aria-labelledby="business-legal" className={`${card} grid gap-3`}>
        <div className="grid gap-1">
          <h2 className="t-headline" id="business-legal">{businessAccountCopy.legalTitle}</h2>
          <p className="t-subhead text-[var(--text-muted)]">{businessAccountCopy.legalDescription}</p>
        </div>
        <ul className="m-0 grid list-none divide-y divide-[var(--border-subtle)] p-0">
          {businessLegalDocuments.map((document) => (
            <li key={document}>
              <Link className={rowLink} href={legalDocumentLinks[document].href}>
                {legalDocumentLinks[document].label}
                <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
              </Link>
            </li>
          ))}
        </ul>
        <p className="t-footnote text-[var(--text-muted)]">
          {businessAccountCopy.nameNote}{' '}
          <Link className="font-semibold text-[var(--text)] underline underline-offset-4 hover:text-[var(--text-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]" href={businessDestination.web.kyc}>
            {businessAccountCopy.nameAction}
          </Link>
        </p>
      </section>

      <section aria-labelledby="business-export" className={`${card} grid gap-3`}>
        <h2 className="t-headline" id="business-export">{businessAccountCopy.exportTitle}</h2>
        <AccountExportCard description={businessAccountCopy.exportDescription} />
      </section>

      <section aria-label={businessAccountCopy.dangerTitle} className={`${card} divide-y divide-[var(--border-subtle)] py-1 sm:py-1`}>
        <PrivacyDisclosure title={kycErasureCopy.title} tone="danger">
          <KycErasure />
        </PrivacyDisclosure>
        <PrivacyDisclosure title={businessClosureCopy.title} tone="danger">
          <AccountClosure business />
        </PrivacyDisclosure>
      </section>
    </div>
  );
}
