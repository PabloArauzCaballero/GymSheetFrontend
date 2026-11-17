import type { Metadata } from 'next';
import { BusinessAccountView } from '@/features/business-account/components/business-account-view';

export const metadata: Metadata = { title: 'Cuenta del negocio' };

/** «Cuenta» of the business portal (franja 8f): legal documents, data export, KYC erasure and closure. */
export default function BusinessAccountPage() {
  return <BusinessAccountView />;
}
