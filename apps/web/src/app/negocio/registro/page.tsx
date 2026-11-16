import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authDestination, businessDestination } from '@gymsheet/domain';
import { BusinessSignupWizard } from '@/features/business/components/business-signup-wizard';
import { wizardStartFor } from '@/features/business/lib/wizard-start';
import { SESSION_COOKIE } from '@/shared/auth/constants';
import { getBusinessMe, isBusinessSession } from '@/shared/server/business-session';
import { requireSession } from '@/shared/server/session';

export const metadata: Metadata = { title: 'Registra tu negocio' };

/**
 * `/negocio/registro`: public for steps 0–1. A signed-in business resumes at
 * the step its `nextSteps` say, or goes to its portal when done; a person
 * never sees it (their own home instead).
 */
export default async function BusinessSignupPage() {
  if (!(await cookies()).has(SESSION_COOKIE)) return <BusinessSignupWizard start={{ step: 0 }} />;
  const session = await requireSession();
  if (!isBusinessSession(session)) redirect(authDestination.web.afterLogin);
  const me = await getBusinessMe();
  // Without an answer the portal home shows the error and its retry; done, it is the next place anyway.
  const start = me ? wizardStartFor(me) : null;
  if (!start) redirect(businessDestination.web.home);
  return <BusinessSignupWizard start={start} />;
}
