import Link from 'next/link';
import type { DirectoryEntitySummary } from '@/shared/api/schemas';

const TYPE_LABELS: Record<string, string> = {
  GYM: 'Gimnasio',
  COACH: 'Coach Certificado',
  CENTER: 'Centro Especializado',
  STORE: 'Tienda Oficial',
  SERVICE_PROVIDER: 'Servicio de Salud',
};

export function DirectoryEntityCard({ entity }: { entity: DirectoryEntitySummary }) {
  const typeLabel = TYPE_LABELS[entity.entityType] ?? entity.entityType;

  return (
    <Link
      href={`/directorio/${entity.slug}`}
      className="group block rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-low)] p-4 transition-all duration-200 hover:shadow-lg hover:border-[var(--border)] hover:-translate-y-0.5"
    >
      <div className="flex gap-4">
        {/* Logo / Thumbnail */}
        <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-xl bg-[var(--surface-high)] flex items-center justify-center border border-[var(--border-subtle)]">
          {entity.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={entity.logoUrl}
              alt={entity.name}
              className="h-full w-full object-cover"
              loading="lazy"
            />
          ) : (
            <span className="text-xl font-bold text-[var(--text-muted)]">
              {entity.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--surface-high)] text-[var(--text-muted)]">
              {typeLabel}
            </span>

            {entity.isVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-[var(--info-bg)] text-[var(--info-text)]">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verificado
              </span>
            )}
          </div>

          <h3 className="mt-1 text-base font-semibold text-[var(--text)] truncate group-hover:text-[var(--accent-ink)] transition-colors">
            {entity.name}
          </h3>

          {entity.headline && (
            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
              {entity.headline}
            </p>
          )}

          {/* Location & Rating */}
          <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1 truncate">
              <svg className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">
                {entity.isOnlineOnly ? 'Envíos / Online' : entity.city ?? 'Presencial'}
              </span>
            </div>

            {/* App Store Star Rating Badge */}
            <div className="flex items-center gap-1 shrink-0 font-medium">
              <svg className="w-3.5 h-3.5 fill-[var(--warning)] text-[var(--warning)]" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-[var(--text)] font-semibold tabular-nums">
                {entity.ratingAverage > 0 ? entity.ratingAverage.toFixed(1) : 'Nuevo'}
              </span>
              {entity.ratingCount > 0 && (
                <span className="text-[var(--text-muted)] text-[11px] tabular-nums">
                  ({entity.ratingCount})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
