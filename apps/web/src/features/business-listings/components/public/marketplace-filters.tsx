'use client';

import { LISTING_SORTS, OFFER_KIND_ORDER, MARKETPLACE_TOP_RATING, offerKindCopy, type ListingSort, type MarketplaceQuery } from '@gymsheet/domain';
import { ArrowDownUp, ShieldCheck, Star } from 'lucide-react';
import type { OfferKind } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';

const chip = (active: boolean) =>
  cn(
    'tap inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors duration-[var(--dur-2)]',
    // Native controls inside the chip: the ring shows on the chip when they take the focus.
    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--volt)]',
    active ? 'border-[var(--text)] bg-[var(--text)] text-[var(--background)]' : 'border-[var(--border)] bg-[var(--surface-low)] text-[var(--text-muted)] hover:text-[var(--text)]',
  );
const field =
  'min-h-11 rounded-full border border-[var(--border)] bg-[var(--surface-low)] px-4 text-[15px] outline-none placeholder:text-[var(--text-muted)] focus-visible:border-[var(--volt)]';

/**
 * The filter row of «Ofertas» (plan §4.3): tipo, ciudad, precio, verificados
 * and order; «Tiendas» keeps its rating chip. Every control is native, so
 * keyboard and screen readers get it for free.
 */
export function MarketplaceFilters({
  tab,
  query,
  onChange,
  onReset,
  active,
}: Readonly<{ tab: 'OFFERS' | 'ENTITIES'; query: MarketplaceQuery; onChange: (patch: Partial<MarketplaceQuery>) => void; onReset: () => void; active: boolean }>) {
  return (
    <div aria-label="Filtros" className="nav-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1" role="group">
      {tab === 'OFFERS' ? (
        <>
          <label className={cn(chip(query.offerKind !== null), 'relative')}>
            <span className="sr-only">Tipo</span>
            <select
              className="cursor-pointer appearance-none bg-transparent outline-none"
              onChange={(event) => onChange({ offerKind: (event.target.value || null) as OfferKind | null })}
              value={query.offerKind ?? ''}
            >
              <option className="bg-[var(--surface)] text-[var(--text)]" value="">
                Tipo
              </option>
              {OFFER_KIND_ORDER.map((kind) => (
                <option className="bg-[var(--surface)] text-[var(--text)]" key={kind} value={kind}>
                  {offerKindCopy[kind].label}
                </option>
              ))}
            </select>
          </label>
          <input aria-label="Ciudad" autoComplete="address-level2" className={cn(field, 'w-36')} maxLength={100} onChange={(event) => onChange({ city: event.target.value })} placeholder="Ciudad…" value={query.city} />
          <input aria-label="Precio desde (Bs)" autoComplete="off" className={cn(field, 'w-28')} inputMode="decimal" onChange={(event) => onChange({ priceMin: event.target.value })} placeholder="Bs desde…" value={query.priceMin} />
          <input aria-label="Precio hasta (Bs)" autoComplete="off" className={cn(field, 'w-28')} inputMode="decimal" onChange={(event) => onChange({ priceMax: event.target.value })} placeholder="Bs hasta…" value={query.priceMax} />
          <label className={chip(query.sort !== 'recent')}>
            <ArrowDownUp aria-hidden className="size-4" />
            <select
              aria-label="Ordenar por"
              className="cursor-pointer appearance-none bg-transparent pr-1 outline-none"
              onChange={(event) => onChange({ sort: event.target.value as ListingSort })}
              value={query.sort}
            >
              {LISTING_SORTS.map((option) => (
                <option className="bg-[var(--surface)] text-[var(--text)]" key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <button aria-pressed={query.topRated} className={chip(query.topRated)} onClick={() => onChange({ topRated: !query.topRated })} type="button">
          <Star aria-hidden className="size-4" />
          {String(MARKETPLACE_TOP_RATING).replace('.', ',')} o más
        </button>
      )}
      <button aria-pressed={query.verifiedOnly} className={chip(query.verifiedOnly)} onClick={() => onChange({ verifiedOnly: !query.verifiedOnly })} type="button">
        <ShieldCheck aria-hidden className="size-4" />
        Verificados
      </button>
      {active ? (
        <button className="inline-flex min-h-11 shrink-0 items-center px-2 text-[15px] text-[var(--text-muted)] underline underline-offset-4" onClick={onReset} type="button">
          Borrar
        </button>
      ) : null}
    </div>
  );
}
