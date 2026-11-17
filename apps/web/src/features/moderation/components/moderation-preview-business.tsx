'use client';

import { businessTypeLabel, formatPrice, listingTerms, offerKindName } from '@gymsheet/domain';
import type { EntityType, ModerationBusinessProfileContent, ModerationListingContent, OfferKind } from '@gymsheet/schemas';
import { DomainImage } from '@/shared/components/media/domain-image';

function Thumbs({ urls, label }: Readonly<{ urls: string[]; label: string }>) {
  if (urls.length === 0) return <p className="text-sm text-[var(--text-muted)]">Sin fotos.</p>;
  return (
    <ul aria-label={label} className="m-0 flex list-none flex-wrap gap-2 p-0">
      {urls.slice(0, 10).map((url, index) => (
        <li className="relative size-24 overflow-hidden rounded-[8px] bg-[var(--surface-low)]" key={url}>
          <DomainImage alt={`${label} ${index + 1}`} className="object-cover" src={url} />
        </li>
      ))}
    </ul>
  );
}

/** A reported listing as the moderator reads it (case file `content`, ADR-0022). */
export function ListingBody({ listing }: Readonly<{ listing: ModerationListingContent }>) {
  const terms = listingTerms({ offerKind: listing.offerKind as OfferKind, validityDays: listing.validityDays, sessionsCount: listing.sessionsCount });
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-[var(--text-muted)]">
        {offerKindName(listing.offerKind)} · {listing.seller.name}
        {listing.seller.handle ? ` (@${listing.seller.handle})` : ''}
      </p>
      <p className="text-base font-semibold">{listing.name}</p>
      <p className="text-sm tabular-nums">
        {formatPrice(listing.price, listing.currency)}
        {terms ? ` · ${terms}` : ''}
      </p>
      <p className="whitespace-pre-line text-sm text-[var(--text-muted)]">{listing.description}</p>
      {listing.benefits.length > 0 ? (
        <ul className="m-0 list-disc pl-5 text-sm">
          {listing.benefits.map((benefit) => (
            <li key={benefit}>{benefit}</li>
          ))}
        </ul>
      ) : null}
      <Thumbs label="Foto de la publicación" urls={listing.mediaUrls} />
    </div>
  );
}

/** A reported business profile: identity, texts and its public images. */
export function BusinessProfileBody({ profile }: Readonly<{ profile: ModerationBusinessProfileContent }>) {
  const images = [profile.logoUrl, profile.coverUrl, ...profile.gallery].filter((url): url is string => Boolean(url));
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold text-[var(--text-muted)]">
        {businessTypeLabel(profile.entityType as EntityType)}
        {profile.city ? ` · ${profile.city}` : ''}
        {profile.isVerified ? ' · Verificado por REPP' : ''}
      </p>
      <p className="text-base font-semibold">
        {profile.name}
        {profile.handle ? <span className="font-normal text-[var(--text-muted)]"> @{profile.handle}</span> : null}
      </p>
      {profile.headline ? <p className="text-sm">{profile.headline}</p> : null}
      {profile.description ? <p className="whitespace-pre-line text-sm text-[var(--text-muted)]">{profile.description}</p> : null}
      <Thumbs label="Imagen del perfil" urls={images} />
    </div>
  );
}
