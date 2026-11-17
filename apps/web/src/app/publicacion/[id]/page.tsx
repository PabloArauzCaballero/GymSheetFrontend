import { formatPrice } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ListingDetail } from '@/features/business-listings/components/public/listing-detail';
import { getPublicListing } from '@/features/business-listings/services/marketplace-server';
import { marketplaceViewer } from '@/features/business-listings/services/viewer-server';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';

type PageProps = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = UUID.test(id) ? await getPublicListing(id) : null;
  if (!listing) return { title: 'Publicación no encontrada' };
  return {
    title: `${listing.name} · ${listing.seller.name}`,
    description: `${formatPrice(listing.price, listing.currency)} en REPP.`,
    alternates: { canonical: `/publicacion/${listing.id}` },
  };
}

/** A public listing (franja 8c). Anything not public (held, hidden, paused, seller not active) is a 404. */
export default async function PublicListingPage({ params }: PageProps) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const [listing, viewer] = await Promise.all([getPublicListing(id), marketplaceViewer()]);
  if (!listing) notFound();
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <ListingDetail listing={listing} viewer={viewer} />
      <PublicFooter />
    </div>
  );
}
