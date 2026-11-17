'use client';

import { kycFailure } from '@gymsheet/domain';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { withSubmission } from '@/shared/api/query-keys';
import type { KycDraftPatch, KycSubmission } from '@/shared/api/schemas';
import { useKycCache } from '../../hooks/use-kyc';
import { businessKycService } from '../../services/business-kyc-client';

/**
 * Autosave of one «Datos legales» screen (`PUT /business/me/kyc/draft`): the
 * answer updates the cache and the wizard moves on; a refusal lands next to
 * its field (422 KYC_FIELD_INVALID) or above the button.
 */
export function useDraftSave<T extends FieldValues>(form: UseFormReturn<T>, onSaved: (submission: KycSubmission) => void) {
  const cache = useKycCache();
  return async (patch: KycDraftPatch) => {
    form.clearErrors('root' as Path<T>);
    try {
      const saved = await businessKycService.saveDraft(patch);
      cache((state) => withSubmission(state, saved));
      onSaved(saved);
    } catch (error: unknown) {
      const failure = kycFailure(error);
      const known = failure.field && failure.field in form.getValues();
      form.setError((known ? failure.field : 'root') as Path<T>, { message: failure.message }, { shouldFocus: true });
    }
  };
}
