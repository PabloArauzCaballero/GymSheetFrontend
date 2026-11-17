import type { Metadata } from 'next';
import { MyOrdersList } from '@/features/orders/components/my-orders-list';

export const metadata: Metadata = { title: 'Mis compras' };

/** «Mis compras» under the person's profile (franja 8d). The portal layout already requires a person session. */
export default function MyOrdersPage() {
  return <MyOrdersList />;
}
