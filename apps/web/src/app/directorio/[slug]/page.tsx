import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectoryReviewsSection } from '@/features/directory/components/directory-reviews-section';
import { MarketplacePlansSection } from '@/features/directory/components/marketplace-plans-section';
import {
  getDirectoryEntity,
  getEntityPaymentConfig,
  getEntityPlans,
  listDirectoryReviews,
} from '@/features/directory/services/directory-server';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';
import { AmbientBackground } from '@/shared/components/background/ambient-background';

type PageProps = {
  params: Promise<{ slug: string }>;
};

const TYPE_NAMES: Record<string, string> = {
  GYM: 'Gimnasio',
  COACH: 'Coach Personal',
  CENTER: 'Centro Especializado',
  STORE: 'Tienda Oficial',
  SERVICE_PROVIDER: 'Servicio de Salud',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const entity = await getDirectoryEntity(slug);
  if (!entity) return { title: 'Oferente no encontrado | REPP' };

  return {
    title: `${entity.name} | Calificaciones y Reseñas | REPP`,
    description:
      entity.headline ??
      `${entity.name} en REPP. Conoce sus productos, servicios y valoraciones de atletas.`,
  };
}

export default async function DirectoryEntityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entity = await getDirectoryEntity(slug);
  if (!entity) notFound();

  const [reviewsResponse, plans, paymentConfig] = await Promise.all([
    listDirectoryReviews(entity.id, {
      sortBy: 'helpful',
      limit: 20,
    }),
    getEntityPlans(entity.id),
    getEntityPaymentConfig(entity.id),
  ]);

  const typeName = TYPE_NAMES[entity.entityType] ?? entity.entityType;

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-[var(--background)]">
      <AmbientBackground behind fixed variant="portal" />
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 space-y-10">
        {/* Breadcrumb de Categoría */}
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href="/directorio" className="hover:text-[var(--accent-ink)] transition-colors">
            Directorio
          </Link>
          <span>/</span>
          <span className="text-[var(--text-muted)] font-medium">
            {entity.primaryCategory.name}
          </span>
          <span>/</span>
          <span className="text-[var(--text)] font-semibold truncate">
            {entity.name}
          </span>
        </nav>

        {/* Ficha Principal de Oferente */}
        <section className="relative overflow-hidden rounded-3xl border border-[var(--border-subtle)] bg-[var(--surface-low)] backdrop-blur-md shadow-xl">
          {/* Cover Header */}
          <div className="relative h-44 sm:h-64 w-full bg-gradient-to-r from-[color-mix(in_srgb,var(--volt)_20%,transparent)] via-orange-500/10 to-transparent">
            {entity.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entity.coverUrl}
                alt={entity.name}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--scrim)]/60 via-transparent to-transparent" />
          </div>

          <div className="relative px-6 pb-8 pt-0">
            {/* Logo y Badges */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 mb-6">
              <div className="flex items-end gap-4">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-[var(--surface-low)] border-4 border-[var(--surface-low)] shadow-xl flex items-center justify-center">
                  {entity.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entity.logoUrl}
                      alt={entity.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-display font-bold text-[var(--accent-ink)]">
                      {entity.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[color-mix(in_srgb,var(--volt)_12%,transparent)] text-[var(--accent-ink)]">
                      {typeName}
                    </span>

                    {entity.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--info-bg)] text-[var(--info-text)]">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verificado Oficial
                      </span>
                    )}
                  </div>

                  <h1 className="mt-1 text-2xl sm:text-3xl font-display font-bold text-[var(--text)] tracking-tight">
                    {entity.name}
                  </h1>
                </div>
              </div>

              {/* Botón de Contacto / Enlace Externo */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {entity.contactInfo?.whatsapp && (
                  <a
                    href={`https://wa.me/${entity.contactInfo.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--volt)] hover:bg-[var(--success)] text-[var(--text)] transition-all shadow-sm"
                  >
                    WhatsApp Oficial
                  </a>
                )}
                {entity.contactInfo?.website && (
                  <a
                    href={entity.contactInfo.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-[var(--text)] text-[var(--background)] transition-all shadow-sm"
                  >
                    Sitio Web
                  </a>
                )}
              </div>
            </div>

            {/* Headline & Resumen */}
            {entity.headline && (
              <p className="text-base text-[var(--text-muted)] font-medium max-w-2xl">
                {entity.headline}
              </p>
            )}

            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-[var(--text-muted)]">
              <div>
                <span className="font-bold text-[var(--text)] block mb-1">
                  Ubicación & Cobertura
                </span>
                <p>
                  {entity.isOnlineOnly
                    ? 'Venta online / Envíos a todo el país'
                    : entity.address
                    ? `${entity.address}, ${entity.city}`
                    : entity.city ?? 'Presencial'}
                </p>
              </div>

              <div>
                <span className="font-bold text-[var(--text)] block mb-1">
                  Categoría Principal
                </span>
                <p>{entity.primaryCategory.name}</p>
                {entity.secondaryCategories.length > 0 && (
                  <p className="text-[var(--text-muted)] mt-0.5">
                    +{entity.secondaryCategories.map((s) => s.name).join(', ')}
                  </p>
                )}
              </div>

              <div>
                <span className="font-bold text-[var(--text)] block mb-1">
                  Calificación Global
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
                  <span className="text-[var(--accent-ink)] text-sm">★</span>
                  <span>{entity.ratingAverage > 0 ? entity.ratingAverage.toFixed(1) : 'Nuevo'}</span>
                  <span className="text-[var(--text-muted)] font-normal">
                    ({entity.ratingCount} {entity.ratingCount === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </div>
              </div>
            </div>

            {/* Descripción detallada */}
            <div className="mt-6 pt-6 border-t border-[var(--border-subtle)] space-y-2">
              <h3 className="text-sm font-bold text-[var(--text)]">
                Sobre este oferente
              </h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed whitespace-pre-line">
                {entity.description}
              </p>
            </div>
          </div>
        </section>

        {/* Marketplace de Planes y Membresías con Pago QR */}
        <MarketplacePlansSection
          plans={plans}
          paymentConfig={paymentConfig}
          entityId={entity.id}
          entityName={entity.name}
        />

        {/* Galería si existe */}
        {entity.gallery.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-[var(--text)]">
              Galería e Instalaciones
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {entity.gallery.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--surface-high)] border border-[var(--border-subtle)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imgUrl}
                    alt={`Foto ${idx + 1}`}
                    className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sección de Reseñas y Calificaciones Estilo App Store */}
        {reviewsResponse && (
          <DirectoryReviewsSection
            initialData={reviewsResponse}
            entityName={entity.name}
          />
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
