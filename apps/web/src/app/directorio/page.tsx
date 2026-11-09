import type { Metadata } from 'next';
import { MarketplaceClient } from '@/features/directory/components/marketplace-client';
import { listDirectoryEntities, listMarketplacePlans } from '@/features/directory/services/directory-server';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';
import { AmbientBackground } from '@/shared/components/background/ambient-background';

export const metadata: Metadata = {
  title: 'Marketplace: gimnasios, tiendas y coaches | REPP',
  description:
    'Explora gimnasios, tiendas de nutrición y suplementación deportiva, venta de equipamiento de gimnasio, centros de entrenamiento y coaches certificados.',
};

export default async function DirectorioPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{
    category_path?: string;
    type?: string;
    search?: string;
  }>;
}>) {
  const params = await searchParams;

  const [entities, plans] = await Promise.all([
    listDirectoryEntities({
      categoryPath: params.category_path,
      type: params.type as Parameters<typeof listDirectoryEntities>[0]['type'],
      search: params.search,
      limit: 50,
    }),
    listMarketplacePlans(50),
  ]);

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-[var(--background)]">
      <AmbientBackground behind fixed variant="portal" />
      <PublicHeader />

      {/* El Marketplace del móvil (`directorio.tsx`): título, buscador,
          píldoras, pestañas «Ofertas / Tiendas» y la cuadrícula. */}
      <main className="mx-auto grid w-full max-w-5xl flex-1 content-start gap-6 px-6 py-10 sm:px-8">
        <header className="grid gap-1">
          <h1 className="display-title">Marketplace</h1>
          <p className="t-subhead text-[var(--text-muted)] sm:text-[17px]">
            Gimnasios, tiendas, coaches, planes y pases, con reseñas de atletas.
          </p>
        </header>
        <MarketplaceClient entities={entities} plans={plans} />
      </main>

      <PublicFooter />
    </div>
  );
}
