'use client';

import { useMemo, useState } from 'react';
import type { CategoryTreeNode, DirectoryEntitySummary } from '@/shared/api/schemas';
import { CategoryTreeNav } from './category-tree-nav';
import { DirectoryEntityCard } from './directory-entity-card';

interface DirectoryBrowserClientProps {
  initialCategories: CategoryTreeNode[];
  initialEntities: DirectoryEntitySummary[];
}

const TYPE_FILTER_BUTTONS = [
  { label: 'Todos', value: undefined },
  { label: 'Tiendas', value: 'STORE' },
  { label: 'Gimnasios', value: 'GYM' },
  { label: 'Coaches', value: 'COACH' },
  { label: 'Centros', value: 'CENTER' },
  { label: 'Salud', value: 'SERVICE_PROVIDER' },
] as const;

export function DirectoryBrowserClient({
  initialCategories,
  initialEntities,
}: DirectoryBrowserClientProps) {
  const [selectedCategoryPath, setSelectedCategoryPath] = useState<string | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Filtrado reactivo en cliente (más rápido e instantáneo)
  const filteredEntities = useMemo(() => {
    return initialEntities.filter((entity) => {
      if (selectedType && entity.entityType !== selectedType) return false;
      if (verifiedOnly && !entity.isVerified) return false;
      if (
        selectedCategoryPath &&
        !entity.primaryCategory.path.startsWith(selectedCategoryPath)
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = entity.name.toLowerCase().includes(query);
        const matchesHeadline = entity.headline?.toLowerCase().includes(query) ?? false;
        const matchesCategory = entity.primaryCategory.name.toLowerCase().includes(query);
        const matchesCity = entity.city?.toLowerCase().includes(query) ?? false;
        if (!matchesName && !matchesHeadline && !matchesCategory && !matchesCity) {
          return false;
        }
      }
      return true;
    });
  }, [initialEntities, selectedType, verifiedOnly, selectedCategoryPath, searchQuery]);

  return (
    <div className="space-y-8">
      {/* Barra de Búsqueda y Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar gimnasios, suplementos, equipamiento, coaches o ciudades..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/60 backdrop-blur-sm text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all placeholder:text-neutral-400 shadow-sm"
          />
        </div>

        {/* Toggle para móvil de categorías */}
        <button
          type="button"
          onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
          className="lg:hidden inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 text-sm font-semibold shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          Categorías
        </button>
      </div>

      {/* Chips de Tipos Rápidos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {TYPE_FILTER_BUTTONS.map((btn) => {
          const isSelected = selectedType === btn.value;
          return (
            <button
              key={btn.label}
              type="button"
              onClick={() => setSelectedType(btn.value)}
              className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                isSelected
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 shadow-sm'
                  : 'bg-white/80 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
              }`}
            >
              {btn.label}
            </button>
          );
        })}

        <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800 mx-1 shrink-0" />

        <button
          type="button"
          onClick={() => setVerifiedOnly(!verifiedOnly)}
          className={`shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            verifiedOnly
              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/30'
              : 'bg-white/80 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'
          }`}
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Solo Verificados
        </button>
      </div>

      {/* Grid Principal: Sidebar de Categorías + Resultados */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Árbol de Categorías Desktop */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/50 backdrop-blur-md p-4 space-y-3">
          <div className="px-2 pt-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Árbol de Categorías
            </h3>
          </div>
          <CategoryTreeNav
            categories={initialCategories}
            activePath={selectedCategoryPath}
            onSelectCategory={(path) => setSelectedCategoryPath(path)}
          />
        </aside>

        {/* Modal / Sheet móvil de categorías */}
        {isMobileNavOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="relative w-full max-w-sm rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 overflow-y-auto m-auto max-h-[80vh]">
              <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-4">
                <h3 className="font-bold text-neutral-900 dark:text-white text-base">
                  Categorías
                </h3>
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(false)}
                  className="p-1 text-neutral-400 hover:text-neutral-700"
                >
                  ✕
                </button>
              </div>
              <CategoryTreeNav
                categories={initialCategories}
                activePath={selectedCategoryPath}
                onSelectCategory={(path) => {
                  setSelectedCategoryPath(path);
                  setIsMobileNavOpen(false);
                }}
              />
            </div>
          </div>
        )}

        {/* Listado de Oferentes */}
        <main className="lg:col-span-9 space-y-4">
          <div className="flex items-center justify-between px-1 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            <span>
              Mostrando {filteredEntities.length}{' '}
              {filteredEntities.length === 1 ? 'oferente' : 'oferentes'}
            </span>
            {(selectedCategoryPath || selectedType || searchQuery || verifiedOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategoryPath(undefined);
                  setSelectedType(undefined);
                  setSearchQuery('');
                  setVerifiedOnly(false);
                }}
                className="text-amber-600 dark:text-amber-400 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>

          {filteredEntities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredEntities.map((entity) => (
                <DirectoryEntityCard key={entity.id} entity={entity} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 p-12 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-400">
                <svg className="w-6 h-6 fill-none stroke-current stroke-2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h4 className="text-base font-semibold text-neutral-900 dark:text-white">
                No se encontraron oferentes
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                No hay resultados con los filtros actuales. Prueba cambiando de categoría o borrando el término de búsqueda.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
