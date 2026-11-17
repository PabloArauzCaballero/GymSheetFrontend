import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { businessDestination, businessHomeCopy, businessResumeStep, kycPlace } from '@gymsheet/domain';
import { KycStatusView } from '@/features/business/components/kyc/kyc-status-view';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { getBusinessKyc, getBusinessMe } from '@/shared/server/business-session';

export const metadata: Metadata = { title: 'Verificación del negocio' };

/**
 * `/negocio/verificacion`: the KYC result on a later visit (published, in
 * review, to correct, suspended) and its follow-ups: resubmit after a
 * rejection, or a material change of an approved business. A DRAFT is
 * still being filled: the wizard takes over.
 */
export default async function BusinessKycPage() {
  const me = await getBusinessMe();
  if (!me) return <ErrorPanel message={businessHomeCopy.loadFailed} />;
  // The KYC routes need a verified email: finish the account steps first.
  if (businessResumeStep(me.nextSteps) !== null) redirect(businessDestination.web.signup);
  const kyc = await getBusinessKyc();
  if (!kyc) return <ErrorPanel message={businessHomeCopy.loadFailed} />;
  if (kycPlace(kyc).kind === 'wizard') redirect(businessDestination.web.signup);
  return <KycStatusView handle={me.handle?.handle ?? null} initial={kyc} />;
}
