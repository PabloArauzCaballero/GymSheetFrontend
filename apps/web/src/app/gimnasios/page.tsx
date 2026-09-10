import type { CSSProperties } from 'react';
import type { Metadata } from 'next';
import { BranchCard } from '@/features/public-facilities/components/branch-card';
import { DirectoryFilters } from '@/features/public-facilities/components/directory-filters';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';
import { listPublicBranches } from '@/features/public-facilities/services/public-facilities-server';
import { AmbientBackground } from '@/shared/components/background/ambient-background';
import { EmptyState } from '@/shared/components/feedback/empty-state';

export const metadata: Metadata = {
  title: 'Gimnasios',
  description: 'Encuentra la sede de GymSheet más cercana y sus servicios.',
};

export default async function GimnasiosPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ search?: string; servicio?: string }> }>) {
  const params = await searchParams;
  const branches = await listPublicBranches({ search: params.search, servicio: params.servicio });

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-[var(--background)]">
      <AmbientBackground behind fixed variant="portal" />
      <PublicHeader />
      <main className="mx-auto grid w-full max-w-6xl flex-1 gap-8 px-5 py-14 sm:px-8">
        <div className="reveal">
          <p className="data-label mb-3 text-[var(--accent-ink)]">Directorio</p>
          <h1 className="display-title text-gradient-volt">Gimnasios</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--text-muted)] sm:text-base">
            Todas las sedes activas, con sus servicios y equipamiento disponible.
          </p>
        </div>
        <DirectoryFilters />
        {branches.length ? (
          <div className="grid gap-4">
            <p className="data-label text-[var(--text-disabled)]">
              {branches.length} {branches.length === 1 ? 'sede encontrada' : 'sedes encontradas'}
            </p>
            <section className="stagger grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {branches.map((branch, index) => (
                <div key={branch.id} style={{ '--i': index } as CSSProperties}>
                  <BranchCard branch={branch} />
                </div>
              ))}
            </section>
          </div>
        ) : (
          <EmptyState description="Ajusta los filtros o vuelve más tarde." title="Sin resultados" />
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
