import type { Metadata } from 'next';
import { DirectoryBrowserClient } from '@/features/directory/components/directory-browser-client';
import {
  getDirectoryCategories,
  listDirectoryEntities,
} from '@/features/directory/services/directory-server';
import { PublicFooter } from '@/features/public-facilities/components/public-footer';
import { PublicHeader } from '@/features/public-facilities/components/public-header';
import { AmbientBackground } from '@/shared/components/background/ambient-background';

export const metadata: Metadata = {
  title: 'Directorio de Gimnasios, Tiendas y Coaches | GymSheet',
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

  const [categories, entities] = await Promise.all([
    getDirectoryCategories(),
    listDirectoryEntities({
      categoryPath: params.category_path,
      type: params.type as Parameters<typeof listDirectoryEntities>[0]['type'],
      search: params.search,
      limit: 50,
    }),
  ]);

  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-[var(--background)]">
      <AmbientBackground behind fixed variant="portal" />
      <PublicHeader />

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-12 sm:px-8 space-y-8">
        {/* Encabezado Principal */}
        <header className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-amber-500">
            Ecosistema de Fitness & Fuerza
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight">
            Directorio de Gimnasios, Tiendas y Coaches
          </h1>
          <p className="max-w-3xl text-sm sm:text-base text-neutral-600 dark:text-neutral-400 leading-relaxed">
            Descubre los mejores gimnasios, tiendas oficiales de proteínas y suplementación, distribuidores de equipamiento y entrenadores certificados. Con calificaciones y reseñas reales verificadas por atletas.
          </p>
        </header>

        {/* Explorador con Árbol de Categorías y Filtros */}
        <DirectoryBrowserClient
          initialCategories={categories}
          initialEntities={entities}
        />
      </main>

      <PublicFooter />
    </div>
  );
}
