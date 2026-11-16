'use client';

import { orientationLabels } from '@gymsheet/domain';
import { useId } from 'react';
import { orientations } from '@/shared/api/schemas';
import type { SocialProfileDraft } from '@/features/social/lib/social-profile-draft';
import { SingleChoiceGroup } from './single-choice-group';

type OrientationValue = Pick<SocialProfileDraft, 'orientation' | 'orientationVisible'>;

/**
 * Optional orientation plus its visibility switch. The switch starts off and
 * only makes sense with an answer, so clearing the answer turns it off too.
 */
export function OrientationPicker({
  value,
  onChange,
}: Readonly<{ value: OrientationValue; onChange: (next: OrientationValue) => void }>) {
  const switchId = useId();
  const hintId = `${switchId}-hint`;
  return (
    <div className="grid gap-6">
      <SingleChoiceGroup
        labels={orientationLabels}
        legend="Orientación (opcional)"
        onChange={(orientation) =>
          onChange({ orientation, orientationVisible: orientation ? value.orientationVisible : false })
        }
        options={orientations}
        value={value.orientation}
      />
      <div className="grid gap-1.5 rounded-[var(--radius-lg)] bg-[var(--surface)] px-4 py-3">
        <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4" htmlFor={switchId}>
          <span className="t-headline">Mostrar en mi perfil</span>
          <input
            aria-describedby={hintId}
            checked={value.orientationVisible}
            className="size-6 shrink-0 cursor-pointer accent-[var(--volt)] disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!value.orientation}
            id={switchId}
            onChange={(event) => onChange({ ...value, orientationVisible: event.target.checked })}
            role="switch"
            type="checkbox"
          />
        </label>
        <p className="t-footnote text-[var(--text-muted)]" id={hintId}>
          Nunca filtra quién te ve. Solo decide si aparece en tu perfil.
        </p>
      </div>
    </div>
  );
}
