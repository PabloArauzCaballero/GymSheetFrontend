import type { Metadata } from 'next';
import { MarketplaceClient } from '@/features/directory/components/marketplace-client';
import { listDirectoryEntities, listMarketplacePlans } from '@/features/directory/services/directory-server';
import { PageHeader } from '@/shared/components/layout/page-header';

export const metadata: Metadata = { title: 'Marketplace' };

/**
 * Marketplace dentro del portal: la pestaña del móvil (#74). Es la misma
 * pantalla que `/directorio` (la versión pública), sin salir de la barra.
 */
export default async function MarketplacePage() {
  const [entities, plans] = await Promise.all([
    listDirectoryEntities({ limit: 50 }),
    listMarketplacePlans(50),
  ]);
  return (
    <div className="mx-auto grid w-full max-w-5xl gap-6">
      <PageHeader title="Marketplace" />
      <MarketplaceClient entities={entities} plans={plans} />
    </div>
  );
}
