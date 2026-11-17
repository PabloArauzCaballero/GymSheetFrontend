import { createBusinessServices } from '@gymsheet/api-client';
import { currentLegalDocumentsSchema, type PublishedLegalDocument } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';

/** Business account calls (ADR-0020): the same shared services as the web, over the bearer client. */
export const businessService = createBusinessServices(apiClient.request);

/** The business legal set (BUSINESS_TERMS, BUSINESS_DPA, PRIVACY) the signup accepts as a whole. */
export async function fetchBusinessLegal(): Promise<PublishedLegalDocument[]> {
  const result = await apiClient.request('/legal/current?accountKind=BUSINESS', currentLegalDocumentsSchema, { method: 'GET' });
  return result.documents;
}
