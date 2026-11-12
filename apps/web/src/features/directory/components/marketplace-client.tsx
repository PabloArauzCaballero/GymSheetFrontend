'use client';

import {
  DEFAULT_MARKETPLACE_FILTERS,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_SORTS,
  MARKETPLACE_TOP_RATING,
  filterEntities,
  filterPlans,
  formatPrice,
  hasActiveFilters,
  initials,
  offerKindLabel,
  ratingLabel,
  sellerKindLabel,
  type MarketplaceFilters,
  type MarketplaceSort,
} from '@gymsheet/domain';
import { ArrowDownUp, BadgeCheck, CircleX, CreditCard, Dumbbell, Search, ShieldCheck, ShoppingBag, Star, Tag, Ticket } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { DirectoryEntitySummary, EntityPlan } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { DomainImage } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';

type Tab = 'OFFERS' | 'ENTITIES';

const CATEGORY_IMAGE: Record<string, string> = {
  all: 'todo',
  gyms: 'gimnasios',
  supplements: 'suplementos',
  apparel: 'indumentaria',
  equipment: 'equipamiento',
  coaches: 'coaches',
  centers: 'centros',
  passes: 'pases',
};

function FilterChipButton({ active, children, onClick }: Readonly<{ active: boolean; children: React.ReactNode; onClick: () => void }>) {
  return (
    <button
      aria-pressed={active}
      className={cn(
        'tap inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors duration-[var(--dur-2)]',
        active
          ? 'border-[var(--text)] bg-[var(--text)] text-[var(--background)]'
          : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text)]',
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

const KIND_ICON = {
  MEMBERSHIP_PLAN: CreditCard,
  PASS: Ticket,
  PRODUCT: ShoppingBag,
  SERVICE: Dumbbell,
} as const;

function OfferCard({ plan }: Readonly<{ plan: EntityPlan }>) {
  const price = formatPrice(plan.currentPrice, plan.currency, plan.durationDays);
  const uri = plan.mediaUrls[0] ?? plan.entity?.coverUrl ?? plan.entity?.logoUrl ?? null;
  const seller = [plan.entity?.name, plan.entity?.city].filter(Boolean).join(' · ');
  const Icon = KIND_ICON[plan.type] ?? Tag;
  const href = plan.entity?.slug ? `/directorio/${plan.entity.slug}` : '/directorio';
  return (
    <Link className="tap group grid content-start gap-2" href={href}>
      <span className="grid aspect-square place-items-center overflow-hidden rounded-[var(--radius-lg)] bg-[var(--surface-high)]">
        {uri ? (
          <DomainImage alt="" className="size-full object-cover transition-transform duration-[var(--dur-4)] group-hover:scale-[1.03]" src={uri} />
        ) : (
          <Icon aria-hidden className="size-7 text-[var(--text-muted)]" />
        )}
      </span>
      <span className="grid gap-0.5">
        <span className="t-headline tabular-nums">{price}</span>
        <span className="t-subhead line-clamp-2">{plan.name}</span>
        <span className="t-caption truncate text-[var(--text-muted)]">{seller || offerKindLabel(plan.type)}</span>
      </span>
    </Link>
  );
}

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
 * Marketplace, la misma pantalla que `apps/mobile/app/(app)/directorio.tsx`:
 * buscador, píldoras de categoría, pestañas de texto «Ofertas / Tiendas» con
 * subrayado y una cuadrícula de dos columnas (cuatro en escritorio).
 */
export function MarketplaceClient({
  entities,
  plans,
}: Readonly<{ entities: DirectoryEntitySummary[]; plans: EntityPlan[] | null }>) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<MarketplaceFilters>(DEFAULT_MARKETPLACE_FILTERS);
  const [tab, setTab] = useState<Tab>('OFFERS');
  const query = search.trim().toLowerCase();
  const applied = useMemo(() => ({ ...filters, search }), [filters, search]);
  const sellers = useMemo(() => filterEntities(entities, applied), [entities, applied]);
  const offers = useMemo(() => filterPlans(plans ?? [], applied), [plans, applied]);

  const emptyMessage = query
    ? 'Prueba con otra palabra o quita el filtro.'
    : 'Cuando los vendedores publiquen, aparecerán aquí.';

  return (
    <div className="grid gap-5">
      <label className="flex min-h-12 items-center gap-2 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface)] px-4 focus-within:border-[var(--volt)]">
        <Search aria-hidden className="size-[18px] shrink-0 text-[var(--text-muted)]" />
        <input
          aria-label="Buscar en Marketplace"
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-[var(--text-muted)]"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Busca un plan, producto o tienda…"
          spellCheck={false}
          type="search"
          value={search}
        />
        {search ? (
          <button aria-label="Borrar búsqueda" className="grid size-8 place-items-center text-[var(--text-muted)]" onClick={() => setSearch('')} type="button">
            <CircleX aria-hidden className="size-[18px]" />
          </button>
        ) : null}
      </label>

      <div aria-label="Categorías" className="nav-scroll -mx-1 flex gap-4 overflow-x-auto px-1 pb-1" role="group">
        {MARKETPLACE_CATEGORIES.map((item) => {
          const selected = filters.category === item.id;
          return (
            <button
              aria-pressed={selected}
              className="tap grid w-[5.5rem] shrink-0 justify-items-center gap-1.5"
              key={item.id}
              onClick={() => setFilters((current) => ({ ...current, category: item.id }))}
              type="button"
            >
              <span
                className={cn(
                  'relative block size-[5.25rem] overflow-hidden rounded-[1.4rem] bg-[var(--surface-low)] transition-[box-shadow] duration-[var(--dur-2)]',
                  selected ? 'ring-2 ring-[var(--text)]' : 'ring-1 ring-[var(--border)]',
                )}
              >
                <Image alt="" className="object-cover" fill sizes="84px" unoptimized src={`/marketplace/categories/${CATEGORY_IMAGE[item.id]}.png`} />
              </span>
              <span className={cn('text-xs', selected ? 'font-bold text-[var(--text)]' : 'font-medium text-[var(--text-muted)]')}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <div aria-label="Filtros" className="nav-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1" role="group">
        <label
          className={cn(
            'relative inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold',
            filters.sort !== 'relevance'
              ? 'border-[var(--text)] bg-[var(--text)] text-[var(--background)]'
              : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)]',
          )}
        >
          <ArrowDownUp aria-hidden className="size-4" />
          <select
            aria-label="Ordenar por"
            className="cursor-pointer appearance-none bg-transparent pr-1 outline-none"
            onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as MarketplaceSort }))}
            value={filters.sort}
          >
            {MARKETPLACE_SORTS.map((option) => (
              <option className="text-[var(--text)]" key={option.id} value={option.id}>
                {option.id === 'relevance' ? 'Ordenar' : option.label}
              </option>
            ))}
          </select>
        </label>
        <FilterChipButton active={filters.topRated} onClick={() => setFilters((current) => ({ ...current, topRated: !current.topRated }))}>
          <Star aria-hidden className="size-4" />
          {String(MARKETPLACE_TOP_RATING).replace('.', ',')} o más
        </FilterChipButton>
        <FilterChipButton active={filters.verifiedOnly} onClick={() => setFilters((current) => ({ ...current, verifiedOnly: !current.verifiedOnly }))}>
          <ShieldCheck aria-hidden className="size-4" />
          Verificados
        </FilterChipButton>
        {hasActiveFilters(applied) ? (
          <button
            className="shrink-0 px-2 text-sm text-[var(--text-muted)] underline"
            onClick={() => {
              setFilters(DEFAULT_MARKETPLACE_FILTERS);
              setSearch('');
            }}
            type="button"
          >
            Borrar
          </button>
        ) : null}
      </div>

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
                'border-b-2 py-2 text-[17px] transition-colors duration-[var(--dur-2)]',
                tab === value
                  ? 'border-[var(--text)] font-semibold text-[var(--text)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text)]',
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
        plans === null ? (
          <EmptyState description="No pudimos cargar las ofertas. Vuelve a intentarlo en un momento." level={2} title="Ofertas no disponibles" />
        ) : offers.length === 0 ? (
          <EmptyState description={emptyMessage} level={2} title="Nada por aquí todavía" />
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
            {offers.map((plan) => (
              <OfferCard key={plan.id} plan={plan} />
            ))}
          </div>
        )
      ) : sellers.length === 0 ? (
        <EmptyState description={emptyMessage} level={2} title="Ninguna tienda por aquí" />
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
