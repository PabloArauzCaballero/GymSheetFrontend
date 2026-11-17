import { queryKeys } from '@gymsheet/hooks';
import { myVerificationSchema, verificationChallengeSchema, verificationSubmissionSchema } from '@gymsheet/schemas';
import { apiClient } from '@/api/client';
import { appendLocalFile, type LocalFile } from '@/api/local-file-part';

export const verificationQueryKey = queryKeys.verification;

/** Member side of the person verification. Staff review is web-only. */
export const verificationService = {
  mine: () => apiClient.request('/me/verification', myVerificationSchema, { method: 'GET' }),
  challenge: () => apiClient.request('/me/verification/challenge', verificationChallengeSchema, { method: 'POST' }),
  uploadSelfie: async (verificationId: string, file: LocalFile) => {
    const form = new FormData();
    await appendLocalFile(form, 'file', file);
    return apiClient.upload(`/me/verification/${encodeURIComponent(verificationId)}/selfie`, verificationSubmissionSchema, form, {
      timeoutMs: 60_000,
    });
  },
};
