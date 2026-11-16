import { businessResumeStep } from '@gymsheet/domain';
import type { BusinessMe } from '@/shared/api/schemas';
import type { BusinessWizardStart } from '../components/business-signup-wizard';

/**
 * Where a signed-in business resumes the signup (`nextSteps`), with what the
 * steps need prefilled. Null once steps 0–3 are done: the portal takes over.
 */
export function wizardStartFor(me: BusinessMe): BusinessWizardStart | null {
  const step = businessResumeStep(me.nextSteps);
  if (step === null) return null;
  return {
    step,
    email: me.account.email,
    entityType: me.entity.entityType,
    profile: {
      name: me.entity.name,
      ...(me.handle ? { handle: me.handle.handle } : {}),
      ...(me.entity.primaryCategoryId ? { primaryCategoryId: me.entity.primaryCategoryId } : {}),
      ...(me.entity.city ? { city: me.entity.city } : {}),
    },
  };
}
