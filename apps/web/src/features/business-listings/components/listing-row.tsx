import { formatPrice, listingTerms, offerKindName } from '@gymsheet/domain';
import { ChevronRight, ImageIcon } from 'lucide-react';
import Link from 'next/link';
import type { OwnListing } from '@/shared/api/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';
import { ListingChip } from './listing-chip';

/** One row of «Publicaciones»: photo, name, price and terms, and where it stands. The whole row opens it. */
export function ListingRow({ listing }: Readonly<{ listing: OwnListing }>) {
  const terms = listingTerms(listing);
  return (
    <li>
      <Link
        className="grid min-h-20 grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-4 rounded-[var(--radius-lg)] px-3 py-3 transition-colors duration-[var(--dur-1)] hover:bg-[var(--surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
        href={`/negocio/publicaciones/${listing.id}`}
      >
        <span className="relative grid size-14 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-high)]">
          {listing.mediaUrls[0] ? (
            <DomainImage alt="" className="size-full object-cover" src={listing.mediaUrls[0]} />
          ) : (
            <ImageIcon aria-hidden className="size-5 text-[var(--text-muted)]" />
          )}
        </span>
        <span className="grid min-w-0 gap-1">
          <span className="truncate font-semibold">{listing.name}</span>
          <span className="t-footnote truncate tabular-nums text-[var(--text-muted)]">
            {formatPrice(listing.price, listing.currency)} · {offerKindName(listing.offerKind)}
            {terms ? ` · ${terms}` : ''}
          </span>
          <ListingChip listing={listing} />
        </span>
        <ChevronRight aria-hidden className="size-5 text-[var(--text-muted)]" />
      </Link>
    </li>
  );
}
