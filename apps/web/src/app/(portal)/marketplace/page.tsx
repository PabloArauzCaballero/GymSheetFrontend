import { listingSearchParams, marketplaceQueryFromParams } from '@gymsheet/domain';
import type { Metadata } from 'next';
import { searchPublicListings } from '@/features/business-listings/services/marketplace-server';
import { MarketplaceClient } from '@/features/directory/components/marketplace-client';
import { listDirectoryEntities } from '@/features/directory/services/directory-server';
import { PageHeader } from '@/shared/components/layout/page-header';

export const metadata: Metadata = { title: 'Marketplace' };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/**
 * Marketplace dentro del portal: la pestaña del móvil (#74). Es la misma
 * pantalla que `/directorio` (la versión pública), sin salir de la barra.
 * La primera página de ofertas sale del servidor con los filtros de la URL.
 */
export default async function MarketplacePage({ searchParams }: Readonly<{ searchParams: SearchParams }>) {
  const params = await searchParams;
  const query = marketplaceQueryFromParams((key) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  });
  const [entities, page] = await Promise.all([listDirectoryEntities({ limit: 50 }), searchPublicListings(listingSearchParams(query))]);
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <PageHeader title="Marketplace" />
      <MarketplaceClient entities={entities} initialPage={page} initialQuery={query} />
    </div>
  );
}
