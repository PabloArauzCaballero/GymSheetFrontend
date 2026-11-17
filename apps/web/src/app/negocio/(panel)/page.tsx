import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { businessDestination, businessHomeCopy, businessResumeStep } from '@gymsheet/domain';
import { BusinessHome } from '@/features/business/components/business-home';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { getBusinessMe } from '@/shared/server/business-session';

export const metadata: Metadata = { title: 'Tu negocio' };

/** Business «Inicio». While the signup's steps 0–3 are not done, the wizard resumes instead. */
export default async function BusinessHomePage() {
  const me = await getBusinessMe();
  if (!me) return <ErrorPanel message={businessHomeCopy.loadFailed} />;
  if (businessResumeStep(me.nextSteps) !== null) redirect(businessDestination.web.signup);
  return <BusinessHome me={me} />;
}
