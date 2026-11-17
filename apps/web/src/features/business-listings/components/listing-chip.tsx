import { listingChip } from '@gymsheet/domain';
import type { OwnListing } from '@/shared/api/schemas';
import { Badge } from '@/shared/components/ui/badge';

/** Where the listing stands, from the backend's `visibility`: a chip and, when it matters, why. */
export function ListingChip({ listing, withDetail = false }: Readonly<{ listing: OwnListing; withDetail?: boolean }>) {
  const chip = listingChip(listing);
  return (
    <span className="grid justify-items-start gap-1">
      <Badge tone={chip.tone}>{chip.label}</Badge>
      {withDetail && chip.detail ? <span className="t-footnote text-[var(--text-muted)]">{chip.detail}</span> : null}
    </span>
  );
}
