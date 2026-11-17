import { businessTermsCopy, legalDocumentLabels } from '@gymsheet/domain';
import { LegalDocument } from '@/components/legal-document';

/**
 * Same as the web page: the business text is a draft under legal review
 * (ADR-0020), so the screen says so instead of publishing an unsigned text.
 */
export default function BusinessTermsScreen() {
  return (
    <LegalDocument
      clauses={[{ title: 'En revisión', icon: 'time-outline', body: businessTermsCopy.reviewNotice }]}
      essentials={[{ icon: 'time-outline', label: 'En revisión legal' }]}
      icon="briefcase-outline"
      title={legalDocumentLabels.BUSINESS_TERMS}
      updated="Borrador del 16 de noviembre de 2026"
    />
  );
}
