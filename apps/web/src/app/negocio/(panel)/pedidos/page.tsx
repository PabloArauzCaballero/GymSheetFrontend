import type { Metadata } from 'next';
import { OrdersInbox } from '@/features/orders/components/business/orders-inbox';

export const metadata: Metadata = { title: 'Pedidos' };

/** «Pedidos» of the business portal (franja 8d). The layout already requires a business session. */
export default function BusinessOrdersPage() {
  return <OrdersInbox />;
}
