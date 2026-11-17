import { apiRequest } from '@/shared/api/api-client';
import {
  acceptedResponseSchema,
  accountExportStatusSchema,
  closeAccountResultSchema,
  closurePreviewSchema,
  consentSchema,
  consentsResponseSchema,
  emailChangeConfirmResponseSchema,
  latestAccountExportResponseSchema,
  userSchema,
  type CloseAccountInput,
  type ConsentKind,
  type EmailChangeRequestInput,
  type SetConsentInput,
} from '@/shared/api/schemas';

/**
 * Consents and account rights, through the generic BFF proxy (`/api/backend`):
 * same CSRF check, session cookie and problem body as every other call.
 */
export const privacyService = {
  consents: async () => (await apiRequest('/me/consents', consentsResponseSchema)).consents,
  setConsent: (kind: ConsentKind, input: SetConsentInput) =>
    apiRequest(`/me/consents/${kind}`, consentSchema, { method: 'PUT', body: input }),
  rename: (nombreCompleto: string) =>
    apiRequest('/me/account', userSchema.pick({ nombreCompleto: true }), {
      method: 'PATCH',
      body: { nombreCompleto },
    }),
  requestEmailChange: (input: EmailChangeRequestInput) =>
    apiRequest('/me/email/change', acceptedResponseSchema, { method: 'POST', body: input }),
  confirmEmailChange: (pin: string) =>
    apiRequest('/me/email/change/confirm', emailChangeConfirmResponseSchema, {
      method: 'POST',
      body: { pin },
    }),
  closurePreview: () => apiRequest('/me/account/closure-preview', closurePreviewSchema),
  requestClosurePin: () =>
    apiRequest('/me/account/closure-pin', acceptedResponseSchema, { method: 'POST' }),
  closeAccount: (input: CloseAccountInput) =>
    apiRequest('/me/account', closeAccountResultSchema, { method: 'DELETE', body: input }),
  requestExport: () => apiRequest('/me/export', accountExportStatusSchema, { method: 'POST' }),
  /** The account's latest export request, or null: what a reload resumes. */
  latestExport: async () => (await apiRequest('/me/export/latest', latestAccountExportResponseSchema)).export,
  exportStatus: (exportId: string) =>
    apiRequest(`/me/export/${encodeURIComponent(exportId)}`, accountExportStatusSchema),
};

/** Same-origin download link: the BFF streams the JSON attachment with its headers. */
export function exportDownloadHref(exportId: string): string {
  return `/api/backend/me/export/${encodeURIComponent(exportId)}/download`;
}

/** Where a closed account ends: the BFF clears the cookie, then the goodbye page. */
export const CLOSED_ACCOUNT_EXIT = '/api/auth/logout?returnTo=/adios';

/** A full navigation, so no screen of the closed account stays mounted. */
export function leaveClosedAccount() {
  window.location.assign(CLOSED_ACCOUNT_EXIT);
}
