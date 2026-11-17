'use client';

import {
  adminListingFilterLabels,
  formatPrice,
  listingCheckCopy,
  listingRejectionLabels,
  listingTerms,
  offerKindName,
} from '@gymsheet/domain';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import { adminListingFilters, listingRejectionReasons, type AdminListing, type AdminListingFilter, type ListingRejectionReason } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Segmented } from '@/shared/components/ui/segmented';
import { Select } from '@/shared/components/ui/select';
import { formatDateTime } from '@/shared/lib/date';
import { notify } from '@/shared/notifications';
import { isListingErrorCode, listingErrorText } from '@/features/business-listings/lib/listing-errors';
import { adminListingsService } from '@/features/business-listings/services/listings-client';

function ListingCase({ listing }: Readonly<{ listing: AdminListing }>) {
  const client = useQueryClient();
  const [reason, setReason] = useState<ListingRejectionReason | ''>('');
  const refresh = () => client.invalidateQueries({ queryKey: ['admin', 'business-listings'] });
  const release = useMutation({
    // The moderator releases what they saw: the backend refuses it if the seller edited it since.
    mutationFn: () => adminListingsService.release(listing.id, { seenUpdatedAt: listing.updatedAt }),
    onSuccess: async () => {
      notify.success('Publicada de nuevo. Le avisamos al negocio.');
      await refresh();
    },
    onError: async (error) => {
      notify.error(listingErrorText(error));
      if (isListingErrorCode(error, 'LISTING_CHANGED_SINCE_REVIEW')) await refresh();
    },
  });
  const reject = useMutation({
    mutationFn: (code: ListingRejectionReason) => adminListingsService.reject(listing.id, code),
    onSuccess: async () => {
      notify.success('Rechazada. Le avisamos al negocio con el motivo.');
      setReason('');
      await refresh();
    },
    onError: (error) => notify.error(listingErrorText(error)),
  });
  const terms = listingTerms(listing);
  const codes = [...listing.autoCheckCodes, ...(listing.moderationReasonCode && !listing.autoCheckCodes.includes(listing.moderationReasonCode) ? [listing.moderationReasonCode] : [])];
  const busy = release.isPending || reject.isPending;
  return (
    <li className="grid gap-3 border-b border-[var(--border-subtle)] p-4 last:border-b-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
      <div className="grid min-w-0 gap-1">
        <p className="t-footnote text-[var(--text-muted)]">
          {listing.sellerName}
          {listing.sellerHandle ? ` · @${listing.sellerHandle}` : ''} · {offerKindName(listing.offerKind)}
        </p>
        <p className="t-headline truncate">{listing.name}</p>
        <p className="t-footnote tabular-nums text-[var(--text-muted)]">
          {formatPrice(listing.price, listing.currency)}
          {terms ? ` · ${terms}` : ''} · {formatDateTime(listing.updatedAt)}
        </p>
        <p className="t-footnote line-clamp-4 whitespace-pre-line">{listing.description}</p>
        {listing.benefits.length > 0 ? <p className="t-footnote text-[var(--text-muted)]">Incluye: {listing.benefits.join(' · ')}</p> : null}
        {listing.mediaUrls.length > 0 ? (
          <ul aria-label={`Fotos de ${listing.name}`} className="m-0 flex list-none flex-wrap gap-2 p-0">
            {listing.mediaUrls.map((url, index) => (
              <li className="relative size-20 overflow-hidden rounded-[8px] bg-[var(--surface-high)]" key={url}>
                <DomainImage alt={`Foto ${index + 1} de ${listing.name}`} className="size-full object-cover" src={url} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="t-footnote text-[var(--text-muted)]">Sin fotos.</p>
        )}
        {codes.length > 0 ? (
          <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
            {codes.map((code) => (
              <li key={code}>
                <Badge tone="warning">{listingRejectionLabels[code as ListingRejectionReason] ?? listingCheckCopy[code]?.split('.')[0] ?? code}</Badge>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <Button disabled={busy} loading={release.isPending} onClick={() => release.mutate()} size="sm" type="button">
          Publicar
        </Button>
        {listing.moderationStatus === 'REJECTED' ? null : (
          <>
            <Select aria-label={`Motivo para rechazar: ${listing.name}`} onChange={(event) => setReason(event.target.value as ListingRejectionReason | '')} value={reason}>
              <option value="">Motivo</option>
              {listingRejectionReasons.map((code) => (
                <option key={code} value={code}>
                  {listingRejectionLabels[code]}
                </option>
              ))}
            </Select>
            <Button disabled={busy || !reason} loading={reject.isPending} onClick={() => reason && reject.mutate(reason)} size="sm" type="button" variant="danger">
              Rechazar
            </Button>
          </>
        )}
      </div>
    </li>
  );
}

/**
 * «Publicaciones» of REPP's business console (ADR-0022): what the automatic
 * checks held, what a moderator hid, and what was rejected. Oldest first.
 * Reported LIVE listings arrive through the moderation queue (`/moderacion`).
 */
export function AdminListingsPanel() {
  const [status, setStatus] = useState<AdminListingFilter>('HELD');
  const listings = useInfiniteQuery({
    queryKey: queryKeys.admin.businessListings(status),
    queryFn: ({ pageParam }) => adminListingsService.list(status, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (page) => page.nextCursor,
  });
  const items = listings.data?.pages.flatMap((page) => page.items) ?? [];
  return (
    <div className="grid gap-4">
      <Segmented
        label="Estado de moderación"
        onChange={setStatus}
        options={adminListingFilters.map((value) => ({ value, label: adminListingFilterLabels[value] }))}
        value={status}
      />
      {listings.isPending ? (
        <div className="h-64 animate-pulse rounded-[8px] bg-[var(--surface-low)] motion-reduce:animate-none" />
      ) : listings.isError ? (
        <ErrorPanel error={listings.error} message={listings.error.message} onRetry={() => void listings.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState description="Cuando una publicación quede retenida, oculta o rechazada, aparece aquí." flat title="Nada por revisar" />
      ) : (
        <ul aria-label={`Publicaciones: ${adminListingFilterLabels[status]}`} className="m-0 list-none rounded-[var(--radius-lg)] border border-[var(--border-subtle)] p-0">
          {items.map((listing) => (
            <ListingCase key={`${listing.id}-${listing.updatedAt}`} listing={listing} />
          ))}
        </ul>
      )}
      {listings.hasNextPage ? (
        <Button className="justify-self-center" loading={listings.isFetchingNextPage} onClick={() => void listings.fetchNextPage()} variant="ghost">
          Ver más
        </Button>
      ) : null}
    </div>
  );
}
