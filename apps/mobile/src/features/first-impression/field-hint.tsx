import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentPolicy, colors, iconSizes, minTouchTarget, spacing } from '@/theme';

type HintState = 'pending' | 'ok' | 'off';

const GLYPH: Record<HintState, keyof typeof Ionicons.glyphMap> = {
  pending: 'ellipse-outline',
  ok: 'checkmark-circle',
  off: 'alert-circle',
};

/**
 * Una línea bajo un campo que dice, mientras se escribe, si cumple lo que el
 * envío va a exigir. Requisito a la vista desde el principio, no después de
 * fallar (skill `signup`). El estado va también en el glifo, no solo en el color.
 */
export function FieldHint({ state, label }: { state: HintState; label: string }) {
  const tint = state === 'ok' ? accentPolicy.ink : state === 'off' ? colors.warning : colors.textMuted;
  return (
    <View
      accessibilityLiveRegion="polite"
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: -spacing.xs }}
    >
      <Ionicons
        accessibilityElementsHidden
        color={tint}
        importantForAccessibility="no-hide-descendants"
        name={GLYPH[state]}
        size={iconSizes.sm}
      />
      <Text style={{ color: tint }} variant="footnote">
        {label}
      </Text>
    </View>
  );
}

/** «¿Quisiste decir pablo@gmail.com?» — un toque y queda corregido. */
export function EmailSuggestion({ suggestion, onAccept }: { suggestion: string; onAccept: () => void }) {
  return (
    <PressableScale
      accessibilityHint="Corrige el correo"
      accessibilityLabel={`¿Quisiste decir ${suggestion}?`}
      haptic="selection"
      onPress={onAccept}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: minTouchTarget,
        marginTop: -spacing.sm,
      }}
    >
      <Ionicons
        accessibilityElementsHidden
        color={accentPolicy.ink}
        importantForAccessibility="no-hide-descendants"
        name="sparkles-outline"
        size={iconSizes.sm}
      />
      <Text tone="secondary" variant="footnote">
        ¿Quisiste decir{' '}
        <Text strong style={{ color: accentPolicy.ink }} variant="footnote">
          {suggestion}
        </Text>
        ?
      </Text>
    </PressableScale>
  );
}
