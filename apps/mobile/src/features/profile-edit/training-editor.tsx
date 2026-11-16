import { useMutation, useQueryClient } from '@tanstack/react-query';
import { experienceLevelLabels, preferenceOptions } from '@gymsheet/domain';
import { type ReactNode, useState } from 'react';
import { View } from 'react-native';
import { onboardingService } from '@/api/services';
import { FilterChip } from '@/components/filter-chip';
import { Card, Section } from '@/components/layout';
import { Text } from '@/components/text';
import { SaveStatusLine, useSectionSave } from '@/components/save-status';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { spacing } from '@/theme';
import { useDraftReport } from './unsaved-guard';

type Level = keyof typeof experienceLevelLabels;
const LEVELS: readonly Level[] = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
const TRAINING_SAVE_KEY = ['profile', 'training'] as const;

/**
 * Nivel e intereses: las fichas que te juntan con gente de tu ritmo. Va por
 * `PATCH /me/onboarding/preferences`, que cambia los datos sin devolver el alta
 * a «en curso» (el `PUT` del cuestionario sí lo hace).
 */
export function TrainingEditor({
  level,
  interests,
  footer,
}: {
  level: Level | null;
  interests: readonly string[];
  footer?: ReactNode;
}) {
  const queryClient = useQueryClient();
  const [draftLevel, setDraftLevel] = useState<Level | null>(level);
  const [draftInterests, setDraftInterests] = useState<string[]>([...interests]);
  const interestsKey = interests.join('|');

  const dirty = draftLevel !== level || draftInterests.join('|') !== interestsKey;
  const options = [...new Set([...preferenceOptions, ...interests])];
  const status = useSectionSave(TRAINING_SAVE_KEY, dirty);
  useDraftReport('training', dirty);

  const save = useMutation({
    mutationKey: TRAINING_SAVE_KEY,
    mutationFn: () =>
      onboardingService.updateTrainingProfile({
        ...(draftLevel ? { experienceLevel: draftLevel } : {}),
        trainingPreferences: draftInterests,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['onboarding', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['progression'] }),
      ]);
    },
    onError: (error: unknown) => notify.error(error),
  });

  const toggle = (interest: string) =>
    setDraftInterests((current) => (current.includes(interest) ? current.filter((item) => item !== interest) : [...current, interest]));

  return (
    <Section title="Tu entreno">
      <Card>
        {footer}
        <Text strong variant="subhead">
          Tu nivel
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {LEVELS.map((value) => (
            <FilterChip key={value} label={experienceLevelLabels[value]} onPress={() => setDraftLevel(value)} selected={draftLevel === value} testID={`level-${value}`} />
          ))}
        </View>
        <Text strong variant="subhead">
          Qué te gusta entrenar
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {options.map((interest) => (
            <FilterChip key={interest} label={interest} onPress={() => toggle(interest)} selected={draftInterests.includes(interest)} testID={`interest-${interest}`} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <SaveStatusLine saved="Entreno guardado." status={status} testID="training-status" />
          <Button
            disabled={!dirty || (!draftLevel && draftInterests.length === 0)}
            label="Guardar entreno"
            loading={save.isPending}
            onPress={() => save.mutate()}
            size="sm"
            testID="training-save"
          />
        </View>
      </Card>
    </Section>
  );
}
