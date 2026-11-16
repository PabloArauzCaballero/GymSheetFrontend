'use client';

import { Dumbbell, HeartPulse, Store, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import {
  businessTypeCards,
  businessWizardCopy,
  legalKindChoices,
  needsLegalKind,
} from '@gymsheet/domain';
import type { EntityType, LegalKind } from '@/shared/api/schemas';
import { Button } from '@/shared/components/ui/button';

const TYPE_ICONS: Readonly<Record<EntityType, LucideIcon>> = {
  GYM: Dumbbell,
  COACH: UserRound,
  CENTER: HeartPulse,
  STORE: Store,
  SERVICE_PROVIDER: Wrench,
};

export type BusinessKind = { type: EntityType | null; legalKind: LegalKind | null };

/** Step 0, «¿Qué eres?»: one big card per type, one tap. Native radios: arrows and screen readers work. */
export function BusinessTypeStep({
  value,
  onChange,
  onNext,
  error,
}: Readonly<{ value: BusinessKind; onChange: (value: BusinessKind) => void; onNext: () => void; error?: string | null }>) {
  return (
    <form
      className="grid gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onNext();
      }}
    >
      <fieldset className="grid gap-3">
        <legend className="sr-only">{businessWizardCopy.steps[0].title}</legend>
        {businessTypeCards.map((card) => {
          const Icon = TYPE_ICONS[card.type];
          return (
            <label className="choice-card min-h-[72px] grid-cols-[auto_1fr] items-center gap-x-4 rounded-[var(--radius-lg)] px-4 py-4" key={card.type}>
              <input
                checked={value.type === card.type}
                className="sr-only"
                name="entityType"
                onChange={() => onChange({ type: card.type, legalKind: needsLegalKind(card.type) ? value.legalKind : null })}
                type="radio"
                value={card.type}
              />
              <span className="row-span-2 grid size-11 place-items-center rounded-full bg-[var(--surface-high)]">
                <Icon aria-hidden className="size-5 text-[var(--text)]" />
              </span>
              <span className="text-[17px] font-semibold leading-tight">{card.title}</span>
              <span className="t-subhead text-[var(--text-muted)]">{card.description}</span>
            </label>
          );
        })}
      </fieldset>

      {needsLegalKind(value.type) ? (
        <fieldset className="grid gap-3">
          <legend className="data-label mb-1">{businessWizardCopy.legalKindLegend}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {legalKindChoices.map((choice) => (
              <label className="choice-card rounded-[var(--radius-lg)] px-4 py-3" key={choice.value}>
                <input
                  checked={value.legalKind === choice.value}
                  className="sr-only"
                  name="legalKind"
                  onChange={() => onChange({ ...value, legalKind: choice.value })}
                  type="radio"
                  value={choice.value}
                />
                <span className="font-semibold">{choice.title}</span>
                <span className="t-subhead text-[var(--text-muted)]">{choice.description}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--danger-text)]" role="alert">
          {error}
        </p>
      ) : null}

      <Button className="w-full" size="lg" type="submit" variant="primary">
        {businessWizardCopy.next}
      </Button>
    </form>
  );
}

