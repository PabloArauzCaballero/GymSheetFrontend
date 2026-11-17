import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SubscriptionDetail } from '@/features/subscriptions/components/person/subscription-detail';

export const metadata: Metadata = { title: 'Suscripción' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** One period of the person: its days, sessions, «Renovar» and history. */
export default async function SubscriptionPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  return <SubscriptionDetail periodId={id} />;
}
