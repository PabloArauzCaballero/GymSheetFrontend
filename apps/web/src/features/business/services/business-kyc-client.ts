import { createBusinessKycAdminServices, createBusinessKycServices, kycDocumentPath } from '@gymsheet/api-client';
import { apiRequest, apiUpload, fetchBlobFromApi } from '@/shared/api/api-client';

/** The business's KYC through the generic BFF (`/api/backend`): session cookie, CSRF origin check, same services as the mobile. */
export const businessKycService = createBusinessKycServices(apiRequest, apiUpload);

/** REPP's KYC console through the same BFF. The backend answers 403 to anyone outside MODERATOR / SYSTEM_ADMIN. */
export const businessKycAdminService = createBusinessKycAdminServices(apiRequest);

/**
 * One decrypted KYC photo for the viewer. It is fetched with the session
 * cookie into a Blob (the BFF forces `no-store`) and shown from an object URL
 * the caller revokes: there is never a URL that opens the photo without a session.
 */
export function fetchKycDocument(submissionId: string, documentId: string, signal?: AbortSignal): Promise<Blob> {
  return fetchBlobFromApi(kycDocumentPath(submissionId, documentId), signal);
}
