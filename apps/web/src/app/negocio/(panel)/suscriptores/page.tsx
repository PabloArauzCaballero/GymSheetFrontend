import type { Metadata } from 'next';
import { SubscribersPanel } from '@/features/subscriptions/components/business/subscribers-panel';

export const metadata: Metadata = { title: 'Suscriptores' };

/** «Suscriptores» of the business (franja 8e): every seller type; the backend answers 403 to anyone but NEGOCIO. */
export default function BusinessSubscribersPage() {
  return <SubscribersPanel />;
}
