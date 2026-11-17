import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingEditor } from '@/features/business-listings/components/listing-editor';
import { getBusinessMe } from '@/shared/server/business-session';

export const metadata: Metadata = { title: 'Publicación' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** One listing of the business. Someone else's listing is a 404 on the backend, and the editor says so. */
export default async function ListingPage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const me = await getBusinessMe();
  return <ListingEditor entityType={me?.entity.entityType ?? null} listingId={id} />;
}
