'use client';

import { drinkingLabels, petLabels, smokingLabels } from '@gymsheet/domain';
import { drinkingHabits, petOptions, smokingHabits } from '@/shared/api/schemas';
import type { SocialProfileDraft } from '@/features/social/lib/social-profile-draft';
import { SingleChoiceGroup } from './single-choice-group';

type Habits = Pick<SocialProfileDraft, 'drinking' | 'smoking' | 'pets'>;

/** Drinking, smoking and pets: three optional single choices. */
export function HabitsPicker({
  value,
  onChange,
}: Readonly<{ value: Habits; onChange: (next: Habits) => void }>) {
  return (
    <div className="grid gap-7">
      <SingleChoiceGroup
        labels={drinkingLabels}
        legend="Bebida"
        onChange={(drinking) => onChange({ ...value, drinking })}
        options={drinkingHabits}
        value={value.drinking}
      />
      <SingleChoiceGroup
        labels={smokingLabels}
        legend="Tabaco"
        onChange={(smoking) => onChange({ ...value, smoking })}
        options={smokingHabits}
        value={value.smoking}
      />
      <SingleChoiceGroup
        labels={petLabels}
        legend="Mascotas"
        onChange={(pets) => onChange({ ...value, pets })}
        options={petOptions}
        value={value.pets}
      />
    </div>
  );
}
