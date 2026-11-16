import { redirect } from 'next/navigation';
import { authDestination, offersConocer } from '@gymsheet/domain';
import { ConocerFlow } from '@/features/onboarding/components/conocer/conocer-flow';
import { requireSession } from '@/shared/server/session';
import { staffHomeFor } from '@/shared/server/staff-home';

/** Members only: anyone else opening the URL goes to their own home instead of a backend error. */
export default async function ConocerOnboardingPage() {
  const session = await requireSession();
  if (!offersConocer(session.role)) redirect(staffHomeFor(session.role) ?? authDestination.web.afterLogin);
  return <ConocerFlow />;
}
