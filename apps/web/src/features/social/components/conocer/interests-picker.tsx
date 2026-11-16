'use client';

import { Check } from 'lucide-react';
import type { InterestCatalogEntry } from '@/shared/api/schemas';
import { SOCIAL_INTERESTS_MAX } from '@/shared/api/schemas';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { toggleInterest } from '@/features/social/lib/discovery-choices';

/**
 * Interest chips from the backend catalog, up to five. Once the limit is
 * reached the unselected chips are disabled instead of silently ignoring the
 * tap, and the counter says why.
 */
export function InterestsPicker({
  catalog,
  selected,
  onChange,
}: Readonly<{
  catalog: InterestCatalogEntry[];
  selected: string[];
  onChange: (next: string[]) => void;
}>) {
  const full = selected.length >= SOCIAL_INTERESTS_MAX;
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-3 flex w-full items-baseline justify-between gap-3">
        <span className="t-headline">{`Elige hasta ${SOCIAL_INTERESTS_MAX}`}</span>
        <span aria-live="polite" className="t-footnote tabular-nums text-[var(--text-muted)]">
          {`${selected.length}/${SOCIAL_INTERESTS_MAX}`}
        </span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {catalog.map((entry) => {
          const active = selected.includes(entry.code);
          return (
            <ChoiceChip
              disabled={!active && full}
              className="disabled:cursor-not-allowed disabled:opacity-40"
              key={entry.code}
              onClick={() => onChange(toggleInterest(selected, entry.code, SOCIAL_INTERESTS_MAX))}
              selected={active}
            >
              {active ? <Check aria-hidden className="mr-1.5 size-4" /> : null}
              {entry.label}
            </ChoiceChip>
          );
        })}
      </div>
    </fieldset>
  );
}
