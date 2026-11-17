import type { Metadata } from 'next';
import { businessDestination, businessTermsCopy, legalDocumentLabels } from '@gymsheet/domain';
import { LegalDocument } from '@/shared/components/layout/legal-document';

export const metadata: Metadata = { title: legalDocumentLabels.BUSINESS_TERMS };

/**
 * The business text is a draft under legal review (backend
 * `BUSINESS_LEGAL_TEXTS_ARE_DRAFTS`): until it is signed, the page says so
 * instead of publishing a text nobody approved. The signup stays closed in
 * production meanwhile (ADR-0020).
 */
export default function BusinessTermsPage() {
  return (
    <LegalDocument
      backHref={businessDestination.web.signup}
      backLabel="← Volver al alta de tu negocio"
      title={legalDocumentLabels.BUSINESS_TERMS}
      updatedAt="16 de noviembre de 2026"
    >
      <p className="text-sm leading-6 text-[var(--text-muted)]">{businessTermsCopy.reviewNotice}</p>
    </LegalDocument>
  );
}
