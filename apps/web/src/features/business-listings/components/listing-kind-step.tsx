'use client';

import { offerKindCopy, offerKindsFor } from '@gymsheet/domain';
import { CalendarDays, Dumbbell, Layers, Package, Repeat, Ticket, UserRound, type LucideIcon } from 'lucide-react';
import type { EntityType, OfferKind } from '@/shared/api/schemas';

const KIND_ICONS: Readonly<Record<OfferKind, LucideIcon>> = {
  MEMBERSHIP: Repeat,
  DAY_PASS: Ticket,
  MULTI_DAY_PASS: CalendarDays,
  CLASS_PACK: Layers,
  SERVICE_SESSION: UserRound,
  SERVICE_PACK: Dumbbell,
  PRODUCT: Package,
};

/** Step 1, «¿Qué vas a publicar?»: one card per kind, the business type's usual kinds first. Native radios. */
export function ListingKindStep({
  entityType,
  value,
  onChange,
}: Readonly<{ entityType: EntityType | null; value: OfferKind | null; onChange: (kind: OfferKind) => void }>) {
  return (
    <fieldset className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">¿Qué vas a publicar?</legend>
      {offerKindsFor(entityType).map((kind) => {
        const Icon = KIND_ICONS[kind];
        return (
          <label className="choice-card min-h-[72px] grid-cols-[auto_1fr] items-center gap-x-4 rounded-[var(--radius-lg)] px-4 py-4" key={kind}>
            <input checked={value === kind} className="sr-only" name="offerKind" onChange={() => onChange(kind)} type="radio" value={kind} />
            <span className="row-span-2 grid size-11 place-items-center rounded-full bg-[var(--surface-high)]">
              <Icon aria-hidden className="size-5 text-[var(--text)]" />
            </span>
            <span className="text-[17px] font-semibold leading-tight">{offerKindCopy[kind].label}</span>
            <span className="t-subhead text-[var(--text-muted)]">{offerKindCopy[kind].description}</span>
          </label>
        );
      })}
    </fieldset>
  );
}
