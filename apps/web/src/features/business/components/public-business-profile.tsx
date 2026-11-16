import { BadgeCheck, MapPin } from 'lucide-react';
import { businessTypeLabel, initials } from '@gymsheet/domain';
import type { DirectoryEntityDetail } from '@/shared/api/schemas';

/**
 * Minimal public profile of a business at `/@handle` (franja 8a): identity,
 * where it is and what it says about itself. Sedes, publicaciones and reseñas
 * join in franja 8c.
 */
export function PublicBusinessProfile({ entity, handle }: Readonly<{ entity: DirectoryEntityDetail; handle: string }>) {
  const place = [entity.city, entity.country].filter(Boolean).join(', ');
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <article className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] shadow-[var(--shadow-md)]">
        <div className="aspect-[3/1] w-full bg-[var(--surface-high)]">
          {entity.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- media comes from the backend's own host
            <img alt="" className="size-full object-cover" height={400} src={entity.coverUrl} width={1200} />
          ) : null}
        </div>
        <div className="grid gap-5 px-5 pb-8 sm:px-8">
          <div className="-mt-10 grid size-20 place-items-center overflow-hidden rounded-[var(--radius-lg)] border-4 border-[var(--surface-low)] bg-[var(--surface)] sm:-mt-12 sm:size-24">
            {entity.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- media comes from the backend's own host
              <img alt={`Logo de ${entity.name}`} className="size-full object-cover" height={96} src={entity.logoUrl} width={96} />
            ) : (
              <span aria-hidden className="text-2xl font-semibold">
                {initials(entity.name)}
              </span>
            )}
          </div>
          <header className="grid gap-1">
            <p className="data-label">
              {businessTypeLabel(entity.entityType)}
              {entity.primaryCategory.name ? ` · ${entity.primaryCategory.name}` : ''}
            </p>
            <h1 className="display-title flex flex-wrap items-center gap-2 break-words">
              {entity.name}
              {entity.isVerified ? <BadgeCheck aria-label="Verificado por REPP" role="img" className="size-6 text-[var(--info-text)]" /> : null}
            </h1>
            <p className="t-subhead text-[var(--text-muted)]">@{handle}</p>
          </header>
          {entity.headline ? <p className="text-[17px] leading-7">{entity.headline}</p> : null}
          {place ? (
            <p className="t-subhead flex items-center gap-1.5 text-[var(--text-muted)]">
              <MapPin aria-hidden className="size-4" />
              {place}
            </p>
          ) : null}
          {entity.description ? (
            <p className="whitespace-pre-line text-[15px] leading-7 text-[var(--text-muted)]">{entity.description}</p>
          ) : null}
        </div>
      </article>
    </main>
  );
}
