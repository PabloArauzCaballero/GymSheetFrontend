import * as Haptics from 'expo-haptics';
import { Switch, View } from 'react-native';
import { SOCIAL_BIO_MAX } from '@gymsheet/schemas';
import { drinkingLabels, orientationLabels, petLabels, smokingLabels } from '@gymsheet/domain';
import { Text } from '@/components/text';
import { Input } from '@/components/ui';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, minTouchTarget, spacing } from '@/theme';
import { SingleChoice } from './option-chips';
import type { SocialDraft } from './selection';

type StepProps = { draft: SocialDraft; onChange: (patch: Partial<SocialDraft>) => void };

export function HabitsStep({ draft, onChange }: StepProps) {
  return (
    <View style={{ gap: spacing.lg }}>
      <SingleChoice labels={drinkingLabels} onChange={(drinking) => onChange({ drinking })} title="Alcohol" value={draft.drinking} />
      <SingleChoice labels={smokingLabels} onChange={(smoking) => onChange({ smoking })} title="Tabaco" value={draft.smoking} />
      <SingleChoice labels={petLabels} onChange={(pets) => onChange({ pets })} title="Mascotas" value={draft.pets} />
    </View>
  );
}

/**
 * Orientation is optional and hidden by default. The switch is a persistent
 * preference, hence a `Switch` and not a checkbox; without an orientation there
 * is nothing to show, so it stays disabled.
 */
export function OrientationStep({ draft, onChange, error }: StepProps & { error?: string }) {
  const reduceMotion = useReduceMotion();
  const disabled = draft.orientation === null;
  return (
    <View style={{ gap: spacing.lg }}>
      <SingleChoice
        labels={orientationLabels}
        onChange={(orientation) => onChange({ orientation, orientationVisible: orientation ? draft.orientationVisible : false })}
        title="Orientación"
        value={draft.orientation}
      />
      {/* A sensitive datum: saving it asks for its own consent first (ADR-0014). */}
      {error ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" tone="danger" variant="footnote">{error}</Text>
      ) : disabled ? null : (
        <Text tone="muted" variant="footnote">Para guardarla te pediremos tu consentimiento. Puedes retirarlo cuando quieras.</Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: minTouchTarget }}>
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <Text strong variant="subhead">Mostrar en mi perfil</Text>
          <Text tone="muted" variant="footnote">Nunca filtra quién te ve.</Text>
        </View>
        <Switch
          accessibilityHint="Nunca filtra quién te ve."
          accessibilityLabel="Mostrar mi orientación en mi perfil"
          accessibilityRole="switch"
          accessibilityState={{ checked: draft.orientationVisible, disabled }}
          disabled={disabled}
          ios_backgroundColor={colors.surfaceHigh}
          onValueChange={(orientationVisible) => {
            if (!reduceMotion) void Haptics.selectionAsync();
            onChange({ orientationVisible });
          }}
          thumbColor={disabled ? colors.textDisabled : colors.surfaceHigh}
          trackColor={{ false: colors.surfaceHigh, true: colors.volt }}
          value={draft.orientationVisible}
        />
      </View>
    </View>
  );
}

/** Free text with a live counter. The server rejects links and phone numbers and says so. */
export function BioStep({ draft, onChange, error }: StepProps & { error?: string }) {
  const length = draft.bio.length;
  return (
    <View style={{ gap: spacing.xs }}>
      <Input
        error={error}
        label="Tu bio"
        maxLength={SOCIAL_BIO_MAX}
        multiline
        numberOfLines={4}
        onChangeText={(bio) => onChange({ bio })}
        placeholder="Entreno por las mañanas y busco con quién hacer pierna."
        value={draft.bio}
      />
      <Text
        accessibilityLabel={`${length} de ${SOCIAL_BIO_MAX} caracteres`}
        style={{ alignSelf: 'flex-end' }}
        tabular
        tone={length >= SOCIAL_BIO_MAX ? 'warning' : 'muted'}
        variant="footnote"
      >
        {`${length}/${SOCIAL_BIO_MAX}`}
      </Text>
    </View>
  );
}
