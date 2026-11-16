'use client';

import { experienceLevelLabels, preferenceOptions } from '@gymsheet/domain';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { profileService } from '@/features/profile/services/profile-service';
import { queryKeys } from '@/shared/api/query-keys';
import { useDraftReport } from '@/features/profile/lib/unsaved-guard';
import { SaveStatusLine, useSectionSave } from '@/shared/components/feedback/save-status';
import { Button } from '@/shared/components/ui/button';
import { ChoiceChip } from '@/shared/components/ui/choice-chip';
import { notify } from '@/shared/notifications';

type Level = keyof typeof experienceLevelLabels;
const LEVELS: readonly Level[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const TRAINING_SAVE_KEY = ['profile', 'training'] as const;

/**
 * Nivel e intereses (`training-editor` del móvil). `PATCH` de preferencias:
 * cambia los datos sin devolver el alta a «en curso».
 */
export function TrainingEditor({ level, interests, footer }: Readonly<{ level: Level | null; interests: readonly string[]; footer?: ReactNode }>) {
  const queryClient = useQueryClient();
  const interestsKey = interests.join('|');
  const [draftLevel, setDraftLevel] = useState<Level | null>(level);
  const [draftInterests, setDraftInterests] = useState<string[]>([...interests]);
  const dirty = draftLevel !== level || draftInterests.join('|') !== interestsKey;
  const options = [...new Set([...preferenceOptions, ...interests])];
  const status = useSectionSave(TRAINING_SAVE_KEY, dirty);
  useDraftReport('training', dirty);

  const save = useMutation({
    mutationKey: TRAINING_SAVE_KEY,
    mutationFn: () => profileService.updateTrainingProfile({ ...(draftLevel ? { experienceLevel: draftLevel } : {}), trainingPreferences: draftInterests }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.onboarding }),
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
    },
    onError: (error: Error) => notify.error(error.message),
  });

  const toggle = (interest: string) =>
    setDraftInterests((current) => (current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]));

  return (
    <div className="panel grid gap-4 p-5">
      {footer}
      <fieldset className="grid gap-2">
        <legend className="t-subhead mb-2 font-semibold">Tu nivel</legend>
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((value) => (
            <ChoiceChip key={value} onClick={() => setDraftLevel(value)} selected={draftLevel === value}>
              {experienceLevelLabels[value]}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>
      <fieldset className="grid gap-2">
        <legend className="t-subhead mb-2 font-semibold">Qué te gusta entrenar</legend>
        <div className="flex flex-wrap gap-2">
          {options.map((interest) => (
            <ChoiceChip key={interest} onClick={() => toggle(interest)} selected={draftInterests.includes(interest)}>
              {interest}
            </ChoiceChip>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <SaveStatusLine saved="Entreno guardado." status={status} testId="training-status" />
        <Button disabled={!dirty || (!draftLevel && draftInterests.length === 0)} loading={save.isPending} onClick={() => save.mutate()} size="sm" variant="primary">
          Guardar entreno
        </Button>
      </div>
    </div>
  );
}
