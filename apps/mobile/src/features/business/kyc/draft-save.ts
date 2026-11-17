import { kycFailure } from '@gymsheet/domain';
import { withSubmission } from '@gymsheet/hooks';
import type { KycDraftPatch, KycSubmission } from '@gymsheet/schemas';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { kycService, useKycCache } from './kyc-service';

/** Autosave of one «Datos legales» screen; a refusal lands next to its field or above the button. */
export function useDraftSave<T extends FieldValues>(form: UseFormReturn<T>, onSaved: (submission: KycSubmission) => void) {
  const cache = useKycCache();
  return async (patch: KycDraftPatch) => {
    try {
      const saved = await kycService.saveDraft(patch);
      cache((state) => withSubmission(state, saved));
      onSaved(saved);
    } catch (error) {
      const failure = kycFailure(error);
      const known = failure.field && failure.field in form.getValues();
      form.setError((known ? failure.field : 'root') as Path<T>, { message: failure.message });
    }
  };
}
