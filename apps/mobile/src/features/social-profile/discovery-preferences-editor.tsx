import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { TextInput, View } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { discoveryIntents, type DiscoveryIntent } from '@gymsheet/schemas';
import { intentLabels } from '@gymsheet/domain';
import { queryKeys } from '@gymsheet/hooks';
import { socialService } from '@/api/services';
import { Checkbox } from '@/components/checkbox';
import { FilterChip } from '@/components/filter-chip';
import { Card, Section } from '@/components/layout';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { notify } from '@/notifications';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';
import { refreshDiscoveryReadiness } from './query-keys';
import { isGenderChoiceSelected, selectGenders, toggleIntent, type GenderChoice } from './selection';

const INTENT_ICON: Record<DiscoveryIntent, keyof typeof Ionicons.glyphMap> = {
  TRAINING: 'barbell-outline',
  FRIENDSHIP: 'people-outline',
  DATING: 'heart-outline',
  UNSURE: 'help-circle-outline',
};
const GENDER_CHOICES: readonly { value: GenderChoice; label: string }[] = [
  { value: 'MALE', label: 'Hombres' },
  { value: 'FEMALE', label: 'Mujeres' },
  { value: 'ALL', label: 'Todos' },
];

function FieldLabel({ children }: { children: string }) {
  return <Text strong tone="secondary" variant="subhead">{children}</Text>;
}

/**
 * Whom to meet: genders, intents, age and distance. Explicit preferences, apart
 * from the permission to appear in discovery. `embedded` drops the section
 * header (the host screen already asks the question) and keeps a single button
 * that saves and moves on; `submitLabel` names that move.
 */
export function DiscoveryPreferencesEditor({
  embedded = false,
  onSaved,
  submitLabel,
}: { embedded?: boolean; onSaved?: () => void; submitLabel?: string } = {}) {
  const queryClient = useQueryClient();
  const preferences = useQuery({ queryKey: queryKeys.discoveryPreferences, queryFn: socialService.getDiscoveryPreferences });
  const [genders, setGenders] = useState<('MALE' | 'FEMALE')[]>([]);
  const [intents, setIntents] = useState<DiscoveryIntent[]>([]);
  const [minAge, setMinAge] = useState('18');
  const [maxAge, setMaxAge] = useState('65');
  const [radiusKm, setRadiusKm] = useState('25');
  const [flexibleAge, setFlexibleAge] = useState(false);
  const [flexibleDistance, setFlexibleDistance] = useState(false);
  useEffect(() => {
    const value = preferences.data;
    if (!value?.configured) return;
    setGenders(value.genders); setIntents(value.intents);
    setMinAge(String(value.minAge)); setMaxAge(String(value.maxAge)); setRadiusKm(String(value.radiusKm));
    setFlexibleAge(value.flexibleAge); setFlexibleDistance(value.flexibleDistance);
  }, [preferences.data]);
  const save = useMutation({
    mutationFn: socialService.updateDiscoveryPreferences,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.discoveryPreferences }),
        refreshDiscoveryReadiness(queryClient),
      ]);
      notify.success('Preferencias de Conocer guardadas.');
      onSaved?.();
    },
    onError: (error: Error) => notify.error(error),
  });
  const ages = Number(minAge) >= 18 && Number(maxAge) >= Number(minAge) && Number(maxAge) <= 100;
  const radius = Number(radiusKm) >= 1 && Number(radiusKm) <= 500;
  const blocker = !genders.length ? 'Elige a quién quieres ver.' : !intents.length ? 'Elige qué buscas.'
    : !ages ? 'Revisa la edad: desde 18 años.' : !radius ? 'La distancia va de 1 a 500 km.' : null;

  const form = (
    <View style={{ gap: spacing.lg }}>
      {embedded ? null : (
        <Text tone="secondary" variant="subhead">Elige a quién quieres conocer. Sin esto, la baraja no adivina por ti.</Text>
      )}
      <View style={{ gap: spacing.sm }}>
        <FieldLabel>Qué buscas</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {discoveryIntents.map((intent) => (
            <FilterChip icon={INTENT_ICON[intent]} key={intent} label={intentLabels[intent]} onPress={() => setIntents((current) => toggleIntent(current, intent))} selected={intents.includes(intent)} />
          ))}
        </View>
      </View>
      <View style={{ gap: spacing.sm }}>
        <FieldLabel>A quién ver</FieldLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {GENDER_CHOICES.map((choice) => (
            <FilterChip key={choice.value} label={choice.label} onPress={() => setGenders((current) => selectGenders(current, choice.value))} selected={isGenderChoiceSelected(genders, choice.value)} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {([[minAge, setMinAge, 'Edad mín.'], [maxAge, setMaxAge, 'Edad máx.'], [radiusKm, setRadiusKm, 'Distancia (km)']] as const).map(([value, setter, label]) => (
          <View key={label} style={{ flex: 1, gap: spacing.xs }}>
            <FieldLabel>{label}</FieldLabel>
            <TextInput
              accessibilityLabel={label}
              keyboardType="number-pad"
              onChangeText={setter}
              style={{
                minHeight: 48, color: colors.text, fontSize: fontSizes.md, fontWeight: semibold, textAlign: 'center',
                backgroundColor: colors.surfaceLow, borderColor: colors.borderControl, borderWidth: 1,
                borderRadius: radii.lg, borderCurve: 'continuous', paddingVertical: spacing.smd,
              }}
              value={value}
            />
          </View>
        ))}
      </View>
      <View style={{ gap: spacing.xs }}>
        <Checkbox checked={flexibleAge} label="Ampliar un poco la edad si hay pocas personas" onChange={setFlexibleAge} />
        <Checkbox checked={flexibleDistance} label="Ampliar un poco la distancia si hay pocas personas" onChange={setFlexibleDistance} />
      </View>
      {blocker ? <Text tone="muted" variant="footnote">{blocker}</Text> : null}
      <Button
        disabled={blocker !== null}
        label={submitLabel ?? (embedded ? 'Buscar compañeros' : 'Guardar preferencias')}
        loading={save.isPending}
        onPress={() => save.mutate({
          genders, intents, minAge: Number(minAge), maxAge: Number(maxAge), radiusKm: Number(radiusKm),
          flexibleAge, flexibleDistance, expectedVersion: preferences.data?.version ?? 0,
        })}
      />
    </View>
  );

  if (embedded) return <Card>{form}</Card>;
  return (
    <Section icon="options-outline" title="Preferencias de Conocer">
      <Card>{form}</Card>
    </Section>
  );
}
