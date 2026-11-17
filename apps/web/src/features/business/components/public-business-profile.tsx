import { businessTypeLabel, initials } from '@gymsheet/domain';
import { MapPin } from 'lucide-react';
import type { PublicBusinessProfile as Profile } from '@/shared/api/schemas';
import { WriteToBusinessButton } from '@/features/business-chat/components/write-to-business-button';
import { DomainImage } from '@/shared/components/media/domain-image';
import { ProfileListings } from '@/features/business-listings/components/public/profile-listings';
import { ProfileLocations } from '@/features/business-listings/components/public/profile-locations';
import { ReportButton, type Viewer } from '@/features/business-listings/components/public/report-button';
import { SellerBadge } from '@/features/business-listings/components/public/seller-badge';

/**
 * The public profile of a business at `/@handle` (franja 8c, plan §4.3):
 * cover, logo, badge, what it says about itself, its photos, sedes and its
 * listings by kind. «Escribir» opens the chat (8f) and «⋯ Reportar» is for
 * person accounts. Reviews and «Hacerme socio» join with franja 8e.
 */
export function PublicBusinessProfile({ profile, viewer }: Readonly<{ profile: Profile; viewer: Viewer }>) {
  const { entity, handle } = profile;
  const place = [entity.city, entity.country].filter(Boolean).join(', ');
  return (
    <main className="mx-auto grid w-full max-w-4xl flex-1 gap-8 px-4 py-8 sm:px-6 sm:py-12">
      <article className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] shadow-[var(--shadow-md)]">
        <div className="relative aspect-[3/1] w-full bg-[var(--surface-high)]">
          {entity.coverUrl ? <DomainImage alt="" className="size-full object-cover" src={entity.coverUrl} /> : null}
        </div>
        <div className="grid gap-5 px-5 pb-8 sm:px-8">
          <div className="flex items-end justify-between gap-3">
            <div className="relative -mt-10 grid size-20 place-items-center overflow-hidden rounded-[var(--radius-lg)] border-4 border-[var(--surface-low)] bg-[var(--surface)] sm:-mt-12 sm:size-24">
              {entity.logoUrl ? (
                <DomainImage alt={`Logo de ${entity.name}`} className="size-full object-cover" src={entity.logoUrl} />
              ) : (
                <span aria-hidden className="text-2xl font-semibold">
                  {initials(entity.name)}
                </span>
              )}
            </div>
            <ReportButton returnTo={`/@${handle}`} subjectName={entity.name} targetId={entity.id} targetKind="BUSINESS_PROFILE" viewer={viewer} />
          </div>
          <header className="grid gap-1">
            <p className="data-label">
              {businessTypeLabel(entity.entityType)}
              {entity.primaryCategory.name ? ` · ${entity.primaryCategory.name}` : ''}
            </p>
            <h1 className="display-title text-balance break-words">{entity.name}</h1>
            <p className="t-subhead flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--text-muted)]">
              <span translate="no">@{handle}</span>
              <SellerBadge badge={entity.isVerified ? 'VERIFIED' : 'NEW'} />
            </p>
          </header>
          <WriteToBusinessButton className="sm:max-w-xs" entityId={entity.id} returnTo={`/@${handle}`} viewer={viewer} />
          {entity.headline ? <p className="text-[17px] leading-7">{entity.headline}</p> : null}
          {place ? (
            <p className="t-subhead flex items-center gap-1.5 text-[var(--text-muted)]">
              <MapPin aria-hidden className="size-4" />
              {place}
            </p>
          ) : null}
          {entity.description ? <p className="whitespace-pre-line text-[15px] leading-7 text-[var(--text-muted)]">{entity.description}</p> : null}
          {entity.gallery.length > 0 ? (
            <ul aria-label={`Fotos de ${entity.name}`} className="nav-scroll -mx-1 m-0 flex list-none gap-3 overflow-x-auto px-1 p-0">
              {entity.gallery.map((url, index) => (
                <li className="relative aspect-[4/3] w-56 shrink-0 overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-high)]" key={url}>
                  <DomainImage alt={`Foto ${index + 1} de ${entity.name}`} className="size-full object-cover" src={url} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </article>

      <ProfileLocations locations={profile.locations} />

      <section aria-labelledby="profile-listings" className="grid gap-4">
        <h2 className="t-headline" id="profile-listings">
          Lo que ofrece
        </h2>
        <ProfileListings entityId={entity.id} firstPage={profile.listings} />
      </section>
    </main>
  );
}
