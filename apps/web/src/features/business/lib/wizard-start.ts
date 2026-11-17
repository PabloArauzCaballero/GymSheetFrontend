import { businessResumeStep, kycPlace } from '@gymsheet/domain';
import type { BusinessMe, KycState } from '@/shared/api/schemas';
import type { BusinessWizardStart } from '../components/business-signup-wizard';

/** What the account steps and the KYC steps need prefilled, from `GET /business/me`. */
function prefill(me: BusinessMe): Omit<BusinessWizardStart, 'step'> {
  return {
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

/** Where a signed-in business resumes the account part of the signup (`nextSteps`); null once steps 0–3 are done. */
export function wizardStartFor(me: BusinessMe): BusinessWizardStart | null {
  const step = businessResumeStep(me.nextSteps);
  return step === null ? null : { step, ...prefill(me) };
}

/**
 * Where it resumes the KYC (steps 4–7), from `GET /business/me/kyc`: the exact
 * step and legal part of a DRAFT. Null when there is nothing to edit (sent,
 * decided): the status screen `/negocio/verificacion` takes over.
 */
export function kycWizardStartFor(me: BusinessMe, kyc: KycState): BusinessWizardStart | null {
  const place = kycPlace(kyc);
  if (place.kind === 'result') return null;
  return { step: place.step, ...prefill(me), kyc, ...(place.part ? { part: place.part } : {}) };
}
