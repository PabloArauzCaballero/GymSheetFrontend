import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authDestination, businessDestination } from '@gymsheet/domain';
import { BusinessSignupWizard } from '@/features/business/components/business-signup-wizard';
import { kycWizardStartFor, wizardStartFor } from '@/features/business/lib/wizard-start';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { getBusinessKyc, getBusinessMe, isBusinessSession } from '@/shared/server/business-session';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Registra tu negocio' };

/**
 * `/negocio/registro`: public for steps 0–1. A signed-in business resumes at
 * the step its `nextSteps` say (account, 2–3) or its KYC says (4–7); with
 * nothing left to edit it goes to the KYC status. A person never sees it.
 */
export default async function BusinessSignupPage() {
  if (!(await cookies()).has(SESSION_COOKIE)) return <BusinessSignupWizard start={{ step: 0 }} />;
  const session = await requireSession();
  if (!isBusinessSession(session)) redirect(authDestination.web.afterLogin);
  const me = await getBusinessMe();
  // Without an answer the portal home shows the error and its retry.
  if (!me) redirect(businessDestination.web.home);
  const account = wizardStartFor(me);
  if (account) return <BusinessSignupWizard start={account} />;
  const kyc = await getBusinessKyc();
  if (!kyc) redirect(businessDestination.web.home);
  const start = kycWizardStartFor(me, kyc);
  if (!start) redirect(businessDestination.web.kyc);
  return <BusinessSignupWizard start={start} />;
}
