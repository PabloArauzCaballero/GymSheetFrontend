'use client';

import {
  DEFAULT_MARKETPLACE_QUERY,
  entityFiltersOf,
  filterEntities,
  handleFromSearch,
  hasActiveMarketplaceQuery,
  initials,
  listingSearchParams,
  marketplaceUrlParams,
  ratingLabel,
  sellerKindLabel,
  type MarketplaceQuery,
} from '@gymsheet/domain';
import { ArrowRight, BadgeCheck, CircleX, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { DirectoryEntitySummary, PublicListingsPage } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { DomainImage } from '@/shared/components/media/domain-image';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value';
import { cn } from '@/shared/lib/cn';
import { ListingsGrid } from '@/features/business-listings/components/public/listings-grid';
import { MarketplaceFilters } from '@/features/business-listings/components/public/marketplace-filters';
import { MarketplaceCategoryRail } from './marketplace-category-rail';

type Tab = 'OFFERS' | 'ENTITIES';

function SellerCard({ seller }: Readonly<{ seller: DirectoryEntitySummary }>) {
  const meta = [sellerKindLabel(seller.entityType), seller.city].filter(Boolean).join(' · ');
  const uri = seller.coverUrl ?? seller.logoUrl;
  return (
    <Link className="tap group grid content-start gap-2" href={`/directorio/${seller.slug}`}>
      <span className="grid aspect-[4/3] place-items-center overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-high)]">
        {uri ? (
          <DomainImage alt="" className="size-full object-cover transition-transform duration-[var(--dur-4)] group-hover:scale-[1.03]" src={uri} />
        ) : (
          <span className="title-text text-[var(--text-muted)]">{initials(seller.name)}</span>
        )}
      </span>
      <span className="grid gap-0.5">
        <span className="flex items-center gap-1">
          <span className="t-subhead truncate font-semibold">{seller.name}</span>
          {seller.isVerified ? (
            <BadgeCheck aria-label="Verificado" className="size-3.5 shrink-0 text-[var(--accent-ink)]" />
          ) : null}
        </span>
        <span className="t-caption truncate text-[var(--text-muted)]">{meta}</span>
        <span className="t-caption tabular-nums text-[var(--text-muted)]">{ratingLabel(seller.ratingAverage, seller.ratingCount)}</span>
      </span>
    </Link>
  );
}

/**
 * Marketplace, la misma pantalla que la pestaña del móvil: buscador que
 * entiende `@handle`, píldoras de categoría, filtros, pestañas «Ofertas /
 * Tiendas» y la cuadrícula. «Ofertas» busca en el backend
 * (`GET /public/directory/listings`, ADR-0022) con paginación por cursor;
 * los filtros viven en la URL para poder compartir la búsqueda.
 */
export function MarketplaceClient({
  entities,
  initialQuery = DEFAULT_MARKETPLACE_QUERY,
  initialPage = null,
}: Readonly<{ entities: DirectoryEntitySummary[]; initialQuery?: MarketplaceQuery; initialPage?: PublicListingsPage | null }>) {
  const [query, setQuery] = useState<MarketplaceQuery>(initialQuery);
  const [tab, setTab] = useState<Tab>('OFFERS');
  // Typing is debounced: the backend is asked once the person pauses.
  const settled = useDebouncedValue(query, 350);
  const backendQuery = listingSearchParams(settled);
  const handle = handleFromSearch(query.q);
  const sellers = useMemo(() => filterEntities(entities, entityFiltersOf(query)), [entities, query]);
  const active = hasActiveMarketplaceQuery(query);
  const patch = (next: Partial<MarketplaceQuery>) => setQuery((current) => ({ ...current, ...next }));

  // The search lives in the URL (replaceState: no server round trip on every key).
  useEffect(() => {
    const search = marketplaceUrlParams(settled);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search ? `?${search}` : ''}`);
  }, [settled]);

  const emptyMessage = query.q.trim() || active ? 'Prueba con otra palabra o quita algún filtro.' : 'Cuando los negocios publiquen, aparecerán aquí.';

  return (
    <div className="grid gap-5">
      <label className="flex min-h-12 items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] px-4 focus-within:border-[var(--volt)]">
        <Search aria-hidden className="size-[18px] shrink-0 text-[var(--text-muted)]" />
        <input
          aria-label="Buscar en Marketplace"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--text-muted)]"
          maxLength={100}
          onChange={(event) => patch({ q: event.target.value })}
          placeholder="Busca un plan, un producto o @negocio…"
          spellCheck={false}
          type="search"
          value={query.q}
        />
        {query.q ? (
          <button aria-label="Borrar búsqueda" className="grid size-11 place-items-center text-[var(--text-muted)]" onClick={() => patch({ q: '' })} type="button">
            <CircleX aria-hidden className="size-[18px]" />
          </button>
        ) : null}
      </label>

      {handle ? (
        <Link
          className="flex min-h-12 items-center justify-between gap-3 rounded-[var(--radius-lg)] bg-[var(--surface-low)] px-4 text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--volt)]"
          href={`/@${handle}`}
        >
          Ver el perfil de @{handle}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      ) : null}

      <MarketplaceCategoryRail onChange={(category) => patch({ category })} value={query.category} />

      <MarketplaceFilters active={active} onChange={patch} onReset={() => setQuery(DEFAULT_MARKETPLACE_QUERY)} query={query} tab={tab} />

      <div className="grid">
        <div className="flex gap-6" role="tablist">
          {(
            [
              ['OFFERS', 'Ofertas'],
              ['ENTITIES', 'Tiendas'],
            ] as const
          ).map(([value, label]) => (
            <button
              aria-selected={tab === value}
              className={cn(
                'min-h-11 border-b-2 py-2 text-[17px] transition-colors duration-[var(--dur-2)]',
                tab === value ? 'border-[var(--text)] font-semibold text-[var(--text)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]',
              )}
              key={value}
              onClick={() => setTab(value)}
              role="tab"
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
        <hr className="m-0 h-px border-0 bg-[var(--border-subtle)]" />
      </div>

      {tab === 'OFFERS' ? (
        <ListingsGrid
          empty={{ title: 'Nada por aquí todavía', description: emptyMessage }}
          initial={{ query: listingSearchParams(initialQuery), page: initialPage }}
          query={backendQuery}
        />
      ) : sellers.length === 0 ? (
        <EmptyState description={emptyMessage} level={2} mascot="asleep" title="Ninguna tienda por aquí" />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
          {sellers.map((seller) => (
            <SellerCard key={seller.id} seller={seller} />
          ))}
        </div>
      )}
    </div>
  );
}
