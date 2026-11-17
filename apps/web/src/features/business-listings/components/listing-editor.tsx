'use client';

import { listingFormErrors, listingFormOf, listingLockText, listingPatch, offerKindName, type ListingForm, type ListingFormErrors } from '@gymsheet/domain';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ExternalLink, Lock } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { queryKeys } from '@/shared/api/query-keys';
import type { EntityType, OwnListing } from '@/shared/api/schemas';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { SkeletonDetail } from '@/shared/components/feedback/skeleton';
import { Button } from '@/shared/components/ui/button';
import { businessService } from '@/features/business/services/business-client';
import { useListingWrite } from '../hooks/use-listing-write';
import { businessListingsService } from '../services/listings-client';
import { ListingChip } from './listing-chip';
import { ListingDetailFields, ListingTextFields } from './listing-fields';
import { ListingPhotosEditor } from './listing-photos-editor';
import { ListingPriceStock } from './listing-price-stock';
import { ListingStateActions } from './listing-state-actions';

const card = 'grid gap-6 rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5 sm:p-6';

function ContentForm({ listing, entityType, locked }: Readonly<{ listing: OwnListing; entityType: EntityType | null; locked: boolean }>) {
  const [form, setForm] = useState<ListingForm>(() => listingFormOf(listing));
  const [errors, setErrors] = useState<ListingFormErrors>({});
  const save = useListingWrite(listing.id, (patch: NonNullable<ReturnType<typeof listingPatch>>) => businessListingsService.update(listing.id, patch), 'Cambios guardados.');
  const categories = useQuery({
    queryKey: queryKeys.business.categories(entityType ?? 'STORE'),
    queryFn: () => businessService.categories(entityType ?? 'STORE'),
    enabled: listing.offerKind === 'PRODUCT',
  });
  const disabled = locked || listing.status === 'ARCHIVED';
  const patch = (next: Partial<ListingForm>) => setForm((current) => ({ ...current, ...next }));
  return (
    <form
      aria-labelledby="listing-content"
      className="grid gap-4"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        // The price is not part of this form: the saved one stands in so only these fields are checked.
        setErrors(listingFormErrors({ ...form, price: listing.price }));
        const body = listingPatch({ ...form, price: listing.price });
        if (body) save.mutate(body);
      }}
    >
      <h2 className="t-headline" id="listing-content">
        Datos
      </h2>
      <ListingTextFields disabled={disabled} errors={errors} form={form} onChange={patch} withPrice={false} />
      <ListingDetailFields categories={categories.data ?? []} disabled={disabled} errors={errors} form={form} onChange={patch} withStock={false} />
      <Button className="justify-self-start" disabled={disabled} loading={save.isPending} type="submit" variant="primary">
        Guardar cambios
      </Button>
    </form>
  );
}

/**
 * `/negocio/publicaciones/[id]`: where the listing stands and why, its photos,
 * its data, price and stock, and pause / resume / archive. While REPP holds
 * it hidden or rejected its content is frozen (409 LISTING_LOCKED_BY_REPP),
 * so those controls are disabled with the reason; state actions stay open.
 */
export function ListingEditor({ listingId, entityType }: Readonly<{ listingId: string; entityType: EntityType | null }>) {
  const listing = useQuery({ queryKey: queryKeys.business.listing(listingId), queryFn: () => businessListingsService.get(listingId) });
  if (listing.isPending) return <SkeletonDetail />;
  if (listing.isError) return <ErrorPanel error={listing.error} message={listing.error.message} onRetry={() => void listing.refetch()} />;
  const data = listing.data;
  const lock = listingLockText(data.visibility);
  return (
    <div className="grid gap-6">
      <Link className="t-subhead inline-flex min-h-11 items-center gap-1 justify-self-start text-[var(--text-muted)] hover:text-[var(--text)]" href="/negocio/publicaciones">
        <ChevronLeft aria-hidden className="size-4" />
        Publicaciones
      </Link>
      <header className="grid gap-2">
        <p className="data-label">{offerKindName(data.offerKind)}</p>
        <h1 className="display-title text-balance break-words">{data.name}</h1>
        <ListingChip listing={data} withDetail />
        {data.visibility === 'PUBLIC' ? (
          <Link className="t-subhead inline-flex min-h-11 items-center gap-1 justify-self-start font-semibold underline underline-offset-4" href={`/publicacion/${data.id}`}>
            Verla como la ve la gente
            <ExternalLink aria-hidden className="size-4" />
          </Link>
        ) : null}
      </header>
      {lock ? (
        <p className="flex items-start gap-2 rounded-[var(--radius-lg)] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-[15px] text-[var(--danger-text)]" role="status">
          <Lock aria-hidden className="mt-0.5 size-4 shrink-0" />
          {lock}
        </p>
      ) : null}
      <div className={card}>
        <ListingPhotosEditor listing={data} locked={Boolean(lock)} />
      </div>
      <div className={card}>
        <ContentForm entityType={entityType} key={data.updatedAt} listing={data} locked={Boolean(lock)} />
      </div>
      <div className={card}>
        <ListingPriceStock key={`${data.price}-${data.stockQuantity}`} listing={data} locked={Boolean(lock)} />
      </div>
      <ListingStateActions listing={data} />
    </div>
  );
}
