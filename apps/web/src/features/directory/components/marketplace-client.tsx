'use client';

import { formatPrice, initials, offerKindLabel, ratingLabel, sellerKindLabel } from '@gymsheet/domain';
import { BadgeCheck, CircleX, CreditCard, Dumbbell, Search, ShoppingBag, Tag, Ticket } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import type { DirectoryEntitySummary, EntityPlan } from '@/shared/api/schemas';
import { EmptyState } from '@/shared/components/feedback/empty-state';
import { DomainImage } from '@/shared/components/media/domain-image';
import { cn } from '@/shared/lib/cn';

/** Las píldoras del móvil (`MARKET_CATEGORIES` en `directorio.tsx`). */
const CATEGORIES = [
  { id: 'all', label: 'Todo', type: undefined, path: undefined },
  { id: 'gyms', label: 'Gimnasios', type: 'GYM', path: 'gimnasios' },
  { id: 'supplements', label: 'Suplementos', type: 'STORE', path: 'tiendas.nutricion' },
  { id: 'apparel', label: 'Indumentaria', type: 'STORE', path: 'tiendas.indumentaria' },
  { id: 'passes', label: 'Pases y planes', type: undefined, path: undefined },
  { id: 'coaches', label: 'Coaches', type: 'COACH', path: 'coaches' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];
type Tab = 'OFFERS' | 'ENTITIES';

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
  const [category, setCategory] = useState<CategoryId>('all');
  const [tab, setTab] = useState<Tab>('OFFERS');
  const config = CATEGORIES.find((item) => item.id === category) ?? CATEGORIES[0];
  const query = search.trim().toLowerCase();

  const sellers = useMemo(
    () =>
      entities.filter((entity) => {
        if (config.type && entity.entityType !== config.type) return false;
        if (config.path && !entity.primaryCategory.path.startsWith(config.path)) return false;
        if (!query) return true;
        return [entity.name, entity.headline, entity.city, entity.primaryCategory.name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      }),
    [config, entities, query],
  );

  const offers = useMemo(
    () =>
      (plans ?? []).filter((plan) => {
        if (category === 'passes' && plan.type !== 'PASS' && plan.type !== 'MEMBERSHIP_PLAN') return false;
        if (config.type && plan.entity && plan.entity.entityType !== config.type) return false;
        if (config.path && plan.entity && !plan.entity.primaryCategory.path.startsWith(config.path)) return false;
        if (!query) return true;
        return [plan.name, plan.entity?.name, plan.entity?.city]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      }),
    [category, config, plans, query],
  );

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

      <div aria-label="Categorías" className="nav-scroll -mx-1 flex gap-2 overflow-x-auto px-1" role="group">
        {CATEGORIES.map((item) => (
          <button
            aria-pressed={category === item.id}
            className={cn(
              'tap min-h-10 shrink-0 rounded-full border px-4 text-[15px] font-semibold transition-colors duration-[var(--dur-2)]',
              category === item.id
                ? 'border-[var(--text)] bg-[var(--text)] text-[var(--background)]'
                : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text)]',
            )}
            key={item.id}
            onClick={() => setCategory(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
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
