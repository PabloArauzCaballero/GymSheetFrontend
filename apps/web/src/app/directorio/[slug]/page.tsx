import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DirectoryReviewsSection } from '@/features/directory/components/directory-reviews-section';
import {
  getDirectoryEntity,
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
  if (!entity) return { title: 'Oferente no encontrado | GymSheet' };

  return {
    title: `${entity.name} | Calificaciones y Reseñas | GymSheet`,
    description:
      entity.headline ??
      `${entity.name} en GymSheet. Conoce sus productos, servicios y valoraciones de atletas.`,
  };
}

export default async function DirectoryEntityDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const entity = await getDirectoryEntity(slug);
  if (!entity) notFound();

  const reviewsResponse = await listDirectoryReviews(entity.id, {
    sortBy: 'helpful',
    limit: 20,
  });

  const typeName = TYPE_NAMES[entity.entityType] ?? entity.entityType;

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-[var(--background)]">
      <AmbientBackground behind fixed variant="portal" />
      <PublicHeader />

      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 space-y-10">
        {/* Breadcrumb de Categoría */}
        <nav aria-label="Ruta de navegación" className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <Link href="/directorio" className="hover:text-amber-500 transition-colors">
            Directorio
          </Link>
          <span>/</span>
          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
            {entity.primaryCategory.name}
          </span>
          <span>/</span>
          <span className="text-neutral-900 dark:text-white font-semibold truncate">
            {entity.name}
          </span>
        </nav>

        {/* Ficha Principal de Oferente */}
        <section className="relative overflow-hidden rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-md shadow-xl">
          {/* Cover Header */}
          <div className="relative h-44 sm:h-64 w-full bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-neutral-900/40">
            {entity.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entity.coverUrl}
                alt={entity.name}
                className="h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>

          <div className="relative px-6 pb-8 pt-0">
            {/* Logo y Badges */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-16 mb-6">
              <div className="flex items-end gap-4">
                <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-white dark:bg-neutral-800 border-4 border-white dark:border-neutral-900 shadow-xl flex items-center justify-center">
                  {entity.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entity.logoUrl}
                      alt={entity.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-black text-amber-500">
                      {entity.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="pb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      {typeName}
                    </span>

                    {entity.isVerified && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Verificado Oficial
                      </span>
                    )}
                  </div>

                  <h1 className="mt-1 text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm"
                  >
                    WhatsApp Oficial
                  </a>
                )}
                {entity.contactInfo?.website && (
                  <a
                    href={entity.contactInfo.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 transition-all shadow-sm"
                  >
                    Sitio Web
                  </a>
                )}
              </div>
            </div>

            {/* Headline & Resumen */}
            {entity.headline && (
              <p className="text-base text-neutral-700 dark:text-neutral-300 font-medium max-w-2xl">
                {entity.headline}
              </p>
            )}

            <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-neutral-600 dark:text-neutral-400">
              <div>
                <span className="font-bold text-neutral-900 dark:text-white block mb-1">
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
                <span className="font-bold text-neutral-900 dark:text-white block mb-1">
                  Categoría Principal
                </span>
                <p>{entity.primaryCategory.name}</p>
                {entity.secondaryCategories.length > 0 && (
                  <p className="text-neutral-400 mt-0.5">
                    +{entity.secondaryCategories.map((s) => s.name).join(', ')}
                  </p>
                )}
              </div>

              <div>
                <span className="font-bold text-neutral-900 dark:text-white block mb-1">
                  Calificación Global
                </span>
                <div className="flex items-center gap-1.5 font-semibold text-neutral-900 dark:text-white">
                  <span className="text-amber-500 text-sm">★</span>
                  <span>{entity.ratingAverage > 0 ? entity.ratingAverage.toFixed(1) : 'Nuevo'}</span>
                  <span className="text-neutral-400 font-normal">
                    ({entity.ratingCount} {entity.ratingCount === 1 ? 'reseña' : 'reseñas'})
                  </span>
                </div>
              </div>
            </div>

            {/* Descripción detallada */}
            <div className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Sobre este oferente
              </h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                {entity.description}
              </p>
            </div>
          </div>
        </section>

        {/* Galería si existe */}
        {entity.gallery.length > 0 && (
          <section className="space-y-4">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              Galería e Instalaciones
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {entity.gallery.map((imgUrl, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800"
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
