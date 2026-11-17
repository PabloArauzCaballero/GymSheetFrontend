'use client';

import { Check } from 'lucide-react';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { toggleSingle } from '@/features/social/lib/discovery-choices';

/**
 * One optional answer out of a few. Tapping the selected chip clears it, so
 * "prefiero no decirlo" never needs its own option.
 */
export function SingleChoiceGroup<T extends string>({
  legend,
  labels,
  options,
  value,
  onChange,
}: Readonly<{
  legend: string;
  labels: Record<T, string>;
  options: readonly T[];
  value: T | null;
  onChange: (next: T | null) => void;
}>) {
  return (
    <fieldset className="grid gap-3">
      <legend className="t-headline mb-3">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <ChoiceChip
            key={option}
            onClick={() => onChange(toggleSingle(value, option))}
            selected={value === option}
          >
            {value === option ? <Check aria-hidden className="mr-1.5 size-4" /> : null}
            {labels[option]}
          </ChoiceChip>
        ))}
      </div>
    </fieldset>
  );
}
