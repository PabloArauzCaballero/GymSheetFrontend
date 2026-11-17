import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { BusinessOrderDetail } from '@/features/orders/components/business/business-order-detail';

export const metadata: Metadata = { title: 'Pedido' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** One order of the business: amount, receipt with zoom, Confirmar and Rechazar. */
export default async function BusinessOrderPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <BusinessOrderDetail orderId={id} />;
}
