import type { Metadata } from 'next';
import { PaymentConfigPanel } from '@/features/orders/components/business/payment-config-panel';

export const metadata: Metadata = { title: 'Cobro' };

/** «Cobro» of the business portal (franja 8d): bank data and the private QR. */
export default function BusinessPaymentsPage() {
  return <PaymentConfigPanel />;
}
