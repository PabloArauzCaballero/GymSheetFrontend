import { formatPrice, listingTerms, offerKindName } from '@gymsheet/domain';
import { Tag } from 'lucide-react';
import Link from 'next/link';
import type { PublicListing } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { SellerBadge } from './seller-badge';

/** One listing, one action: the whole card opens it. Price first, then the name, then who sells it. */
export function ListingCard({ listing, showSeller = true }: Readonly<{ listing: PublicListing; showSeller?: boolean }>) {
  const terms = listingTerms(listing);
  const cover = listing.mediaUrls[0] ?? listing.seller.logoUrl;
  return (
    <Link
      className="tap group grid content-start gap-2 rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--volt)]"
      href={`/publicacion/${listing.id}`}
    >
      <span className="relative grid aspect-square place-items-center overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-high)]">
        {cover ? (
          <DomainImage alt="" className="size-full object-cover transition-transform duration-[var(--dur-4)] group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100" src={cover} />
        ) : (
          <Tag aria-hidden className="size-7 text-[var(--text-muted)]" />
        )}
      </span>
      <span className="grid gap-0.5">
        <span className="t-headline tabular-nums">{formatPrice(listing.price, listing.currency)}</span>
        <span className="t-subhead line-clamp-2">{listing.name}</span>
        <span className="t-caption truncate text-[var(--text-muted)]">
          {offerKindName(listing.offerKind)}
          {terms ? ` · ${terms}` : ''}
        </span>
        {showSeller ? (
          <>
            <span className="t-caption truncate text-[var(--text-muted)]">{[listing.seller.name, listing.seller.city].filter(Boolean).join(' · ')}</span>
            <SellerBadge badge={listing.seller.badge} />
          </>
        ) : null}
      </span>
    </Link>
  );
}
