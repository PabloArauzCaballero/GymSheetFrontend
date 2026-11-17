import { businessHomeCopy } from '@gymsheet/domain';
import type { Metadata } from 'next';
import Link from 'next/link';
import { GalleryPanel } from '@/features/business-listings/components/gallery-panel';
import { LocationsPanel } from '@/features/business-listings/components/locations-panel';
import { ErrorPanel } from '@/shared/components/feedback/error-panel';
import { PageHeader } from '@/shared/components/layout/page-header';
import { getBusinessMe } from '@/shared/server/business-session';

export const metadata: Metadata = { title: 'Perfil del negocio' };

const card = 'rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] p-5 sm:p-6';

/** «Perfil» of the business portal (plan §4.2, franja 8c): sedes and photos of the public profile. */
export default async function BusinessProfilePage() {
  const me = await getBusinessMe();
  if (!me) return <ErrorPanel message={businessHomeCopy.loadFailed} />;
  const handle = me.handle?.status === 'ACTIVE' ? me.handle.handle : null;
  return (
    <div className="grid gap-6">
      <PageHeader
        description="Dónde atiendes y cómo se ve tu negocio por dentro."
        title="Perfil"
        actions={
          handle ? (
            <Link className="t-subhead inline-flex min-h-11 items-center font-semibold underline underline-offset-4" href={`/@${handle}`}>
              Ver @{handle}
            </Link>
          ) : undefined
        }
      />
      <div className={card}>
        <LocationsPanel />
      </div>
      <div className={card}>
        <GalleryPanel initial={me.entity.gallery} />
      </div>
    </div>
  );
}
