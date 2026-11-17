import { formatPrice, initials, listingTerms, offerKindName } from '@gymsheet/domain';
import { Check, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import type { PublicListing } from '@/shared/api/schemas';
import { WriteToBusinessButton } from '@/features/business-chat/components/write-to-business-button';
import { DomainImage } from '@/shared/components/media/domain-image';
import { Button } from '@/shared/components/ui/button';
import { ReportButton, type Viewer } from './report-button';
import { SellerBadge } from './seller-badge';

function Carousel({ listing }: Readonly<{ listing: PublicListing }>) {
  if (listing.mediaUrls.length === 0) return <div aria-hidden className="aspect-square rounded-[var(--radius-xl)] bg-[var(--surface-high)] sm:aspect-[4/3]" />;
  return (
    <ul
      aria-label={`Fotos de ${listing.name}`}
      className="nav-scroll m-0 flex list-none snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain rounded-[var(--radius-xl)] p-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--volt)] motion-reduce:snap-none"
      tabIndex={0}
    >
      {listing.mediaUrls.map((url, index) => (
        <li className="relative aspect-square w-full shrink-0 snap-center overflow-hidden rounded-[var(--radius-xl)] bg-[var(--surface-high)] sm:aspect-[4/3]" key={url}>
          <DomainImage alt={`Foto ${index + 1} de ${listing.mediaUrls.length}`} className="size-full object-cover" src={url} />
        </li>
      ))}
    </ul>
  );
}

/**
 * A public listing (plan §4.3): photos, price in BOB, what it includes, the
 * seller and the actions. «Escribir» opens the chat with the seller (franja
 * 8f); buying arrives with the orders (8d) and shows disabled with «Llega
 * pronto», never as a link that leads nowhere.
 */
export function ListingDetail({ listing, viewer }: Readonly<{ listing: PublicListing; viewer: Viewer }>) {
  const terms = listingTerms(listing);
  const seller = listing.seller;
  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <Carousel listing={listing} />
      <div className="grid content-start gap-6">
        <header className="grid gap-2">
          <p className="data-label">
            {offerKindName(listing.offerKind)}
            {listing.productCategory ? ` · ${listing.productCategory.name}` : ''}
          </p>
          <h1 className="display-title text-balance break-words">{listing.name}</h1>
          <p className="title-text tabular-nums">{formatPrice(listing.price, listing.currency)}</p>
          {terms ? <p className="t-subhead text-[var(--text-muted)]">{terms}</p> : null}
          {listing.inStock === false ? <p className="t-subhead font-semibold text-[var(--warning-text)]">Sin stock por ahora</p> : null}
        </header>

        <div className="grid gap-2">
          <Button aria-describedby="listing-soon" className="w-full" disabled size="lg" variant="primary">
            <ShoppingBag aria-hidden className="size-5" />
            Comprar
          </Button>
          <p className="t-footnote text-center text-[var(--text-muted)]" id="listing-soon">
            Llega pronto: comprar con QR desde REPP.
          </p>
          <WriteToBusinessButton entityId={seller.id} returnTo={`/publicacion/${listing.id}`} variant="secondary" viewer={viewer} />
        </div>

        <section aria-labelledby="listing-includes" className="grid gap-3">
          <h2 className="t-headline" id="listing-includes">
            Qué incluye
          </h2>
          <p className="whitespace-pre-line text-[15px] leading-7 text-[var(--text-muted)]">{listing.description}</p>
          {listing.benefits.length > 0 ? (
            <ul className="m-0 grid list-none gap-2 p-0">
              {listing.benefits.map((benefit) => (
                <li className="flex items-start gap-2 text-[15px]" key={benefit}>
                  <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--success-text)]" />
                  {benefit}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section aria-label="Quién lo vende" className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4">
          <span className="relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface-high)]">
            {seller.logoUrl ? <DomainImage alt="" className="size-full object-cover" src={seller.logoUrl} /> : <span className="font-semibold">{initials(seller.name)}</span>}
          </span>
          <span className="grid min-w-0 gap-0.5">
            {seller.handle ? (
              <Link className="truncate font-semibold underline-offset-4 hover:underline" href={`/@${seller.handle}`}>
                {seller.name}
              </Link>
            ) : (
              <span className="truncate font-semibold">{seller.name}</span>
            )}
            <span className="t-footnote truncate text-[var(--text-muted)]" translate="no">{[seller.handle ? `@${seller.handle}` : null, seller.city].filter(Boolean).join(' · ')}</span>
            <SellerBadge badge={seller.badge} />
          </span>
        </section>

        <div className="justify-self-start">
          <ReportButton returnTo={`/publicacion/${listing.id}`} subjectName={listing.name} targetId={listing.id} targetKind="BUSINESS_LISTING" viewer={viewer} />
        </div>
      </div>
    </main>
  );
}
