import { apiRequest, apiUpload } from '@/shared/api/api-client';
import {
  myVerificationSchema,
  verificationChallengeSchema,
  verificationQueueSchema,
  verificationSubmissionSchema,
  type DecideVerificationInput,
} from '@/shared/api/schemas';

/**
 * Person verification through the generic BFF (`/api/backend`): session
 * cookie, CSRF origin check and problem bodies like every other call. The
 * selfie goes as `multipart/form-data` through `apiUpload` (long timeout).
 */
export const verificationService = {
  mine: () => apiRequest('/me/verification', myVerificationSchema),
  challenge: () => apiRequest('/me/verification/challenge', verificationChallengeSchema, { method: 'POST' }),
  uploadSelfie: (verificationId: string, selfie: Blob, fileName = 'selfie.jpg') => {
    const form = new FormData();
    form.append('file', selfie, fileName);
    return apiUpload(`/me/verification/${encodeURIComponent(verificationId)}/selfie`, verificationSubmissionSchema, form);
  },
  queue: () => apiRequest('/admin/verifications?status=PENDING_REVIEW&limit=50', verificationQueueSchema),
  decide: (verificationId: string, input: DecideVerificationInput) =>
    apiRequest(`/admin/verifications/${encodeURIComponent(verificationId)}/decide`, verificationSubmissionSchema, {
      method: 'POST',
      body: input,
    }),
};

const SIGNED_SELFIE_PATH = /\/(admin\/verifications\/[0-9a-f-]{36}\/selfie)(\?[\w=&%.-]*)?$/iu;

/**
 * Same-origin source of the moderator's signed selfie link. The backend hands
 * `/<prefix>/admin/verifications/:id/selfie?expires=…&signature=…`; the browser
 * reaches it only through the BFF. Anything else is refused (null).
 */
export function selfieProxySrc(url: string): string | null {
  const match = SIGNED_SELFIE_PATH.exec(url);
  return match ? `/api/backend/${match[1]}${match[2] ?? ''}` : null;
}
