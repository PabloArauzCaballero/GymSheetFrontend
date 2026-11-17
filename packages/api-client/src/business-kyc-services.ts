import { z } from 'zod';
import {
  businessAccountActionResultSchema,
  businessAdminAccountsPageSchema,
  businessMediaResultSchema,
  kycAdminDetailSchema,
  kycClaimResultSchema,
  kycConsentResultSchema,
  kycDecideInputSchema,
  kycDecisionResultSchema,
  kycDocumentSchema,
  kycNewVersionSchema,
  kycQueuePageSchema,
  kycReleaseResultSchema,
  kycSelfieChallengeSchema,
  kycStateSchema,
  kycSubmissionSchema,
  kycSubmitResultSchema,
  phoneRequestResultSchema,
  phoneStateSchema,
  type BusinessSuspensionReasonCode,
  type KycDecideInput,
  type KycDocumentKind,
  type KycDraftPatch,
  type KycQueue,
} from '@gymsheet/schemas';
import type { RequestFn } from './routine-services';

/**
 * Multipart upload with the same shape on both apps: `apiUpload` (web BFF)
 * and `apiClient.upload` (mobile bearer client). The caller appends the file
 * (`file`); the service adds the form fields the route needs.
 */
export type UploadFn = <T>(
  path: string,
  schema: z.ZodType<T>,
  form: FormData,
  options?: { timeoutMs?: number; signal?: AbortSignal | null },
) => Promise<T>;

const noContentSchema = z.null();
const UPLOAD_TIMEOUT_MS = 60_000;

/** The business's own KYC (ADR-0021): wizard steps 4–7, the result and the follow-up versions. */
export function createBusinessKycServices(request: RequestFn, upload: UploadFn) {
  return {
    state: () => request('/business/me/kyc', kycStateSchema, { method: 'GET' }),
    requestPhoneCode: (phone: string) =>
      request('/business/me/phone/verify/request', phoneRequestResultSchema, { method: 'POST', body: { phone } }),
    confirmPhoneCode: (code: string) =>
      request('/business/me/phone/verify/confirm', phoneStateSchema, { method: 'POST', body: { code } }),
    saveDraft: (patch: KycDraftPatch) =>
      request('/business/me/kyc/draft', kycSubmissionSchema, { method: 'PUT', body: patch }),
    grantSelfieConsent: (version: string) =>
      request('/business/me/kyc/consent', kycConsentResultSchema, { method: 'PUT', body: { granted: true, version } }),
    selfieChallenge: () => request('/business/me/kyc/selfie-challenge', kycSelfieChallengeSchema, { method: 'POST' }),
    /** `form` carries the photo as `file`; the kind is added here. */
    uploadDocument: (kind: KycDocumentKind, form: FormData) => {
      form.append('kind', kind);
      return upload('/business/me/kyc/documents', kycDocumentSchema, form, { timeoutMs: UPLOAD_TIMEOUT_MS });
    },
    deleteDocument: (id: string) =>
      request(`/business/me/kyc/documents/${encodeURIComponent(id)}`, noContentSchema, { method: 'DELETE' }),
    /** The company logo is the listing's PUBLIC logo, not a private KYC document. */
    uploadLogo: (form: FormData) => {
      form.append('slot', 'LOGO');
      return upload('/business/me/media', businessMediaResultSchema, form, { timeoutMs: UPLOAD_TIMEOUT_MS });
    },
    submit: () => request('/business/me/kyc/submit', kycSubmitResultSchema, { method: 'POST' }),
    resubmit: () => request('/business/me/kyc/resubmit', kycNewVersionSchema, { method: 'POST' }),
    startChange: () => request('/business/me/kyc/changes', kycNewVersionSchema, { method: 'POST' }),
  };
}

export type BusinessKycServices = ReturnType<typeof createBusinessKycServices>;

export type KycQueueFilter = { queue: KycQueue; overdue?: boolean; entityType?: string; cursor?: string | null; limit?: number };

function query(params: Record<string, string | number | boolean | null | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
}

/** REPP's KYC console (`MODERATOR`, `SYSTEM_ADMIN`). Document bytes are read by the web viewer, not here. */
export function createBusinessKycAdminServices(request: RequestFn) {
  const base = (id: string) => `/admin/business/kyc/${encodeURIComponent(id)}`;
  return {
    queue: (filter: KycQueueFilter) =>
      request(
        `/admin/business/kyc/queue${query({ queue: filter.queue, overdue: filter.overdue, entityType: filter.entityType, cursor: filter.cursor, limit: filter.limit ?? 50 })}`,
        kycQueuePageSchema,
        { method: 'GET' },
      ),
    detail: (id: string) => request(base(id), kycAdminDetailSchema, { method: 'GET' }),
    claim: (id: string) => request(`${base(id)}/claim`, kycClaimResultSchema, { method: 'POST' }),
    release: (id: string) => request(`${base(id)}/release`, kycReleaseResultSchema, { method: 'POST' }),
    decide: (id: string, input: KycDecideInput) =>
      request(`${base(id)}/decide`, kycDecisionResultSchema, { method: 'POST', body: kycDecideInputSchema.parse(input) }),
    accounts: (filter: { search?: string; status?: string; cursor?: string | null } = {}) =>
      request(`/admin/business/accounts${query({ ...filter, limit: 50 })}`, businessAdminAccountsPageSchema, { method: 'GET' }),
    suspend: (accountId: string, reasonCode: BusinessSuspensionReasonCode, note?: string) =>
      request(`/admin/business/accounts/${encodeURIComponent(accountId)}/suspend`, businessAccountActionResultSchema, {
        method: 'POST',
        body: { reasonCode, ...(note ? { note } : {}) },
      }),
    reinstate: (accountId: string, reasonCode: BusinessSuspensionReasonCode, note?: string) =>
      request(`/admin/business/accounts/${encodeURIComponent(accountId)}/reinstate`, businessAccountActionResultSchema, {
        method: 'POST',
        body: { reasonCode, ...(note ? { note } : {}) },
      }),
  };
}

export type BusinessKycAdminServices = ReturnType<typeof createBusinessKycAdminServices>;

/** BFF path of one document's decrypted bytes (the web viewer fetches it into an object URL). */
export function kycDocumentPath(submissionId: string, documentId: string): string {
  return `/admin/business/kyc/${encodeURIComponent(submissionId)}/documents/${encodeURIComponent(documentId)}`;
}
