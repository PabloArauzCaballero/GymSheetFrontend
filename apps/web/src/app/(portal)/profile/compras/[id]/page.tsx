import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderDetail } from '@/features/orders/components/order-detail';

export const metadata: Metadata = { title: 'Pedido' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** One order of the person: pay, send the receipt, follow its timeline. */
export default async function OrderPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <OrderDetail orderId={id} />;
}
