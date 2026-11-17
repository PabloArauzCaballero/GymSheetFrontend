import type { Metadata } from 'next';
import { MySubscriptions } from '@/features/subscriptions/components/person/my-subscriptions';

export const metadata: Metadata = { title: 'Mis suscripciones' };

/** «Mis suscripciones» under the person's profile (franja 8e); replaces «Membresía» and «Acceso». */
export default function MySubscriptionsPage() {
  return <MySubscriptions />;
}
