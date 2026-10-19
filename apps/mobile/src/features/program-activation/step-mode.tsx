import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { MODE_COPY } from '@gymsheet/hooks';
import { programModes, type ProgramMode } from '@gymsheet/types';
import { Checkbox } from '@/components/checkbox';
import { PressableScale } from '@/components/motion';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, semibold, spacing } from '@/theme';

/** A3 · Modo: tres tarjetas con qué pide y qué da cada una, y la casilla de cardio. */
export function ModeStep({
  mode,
  onMode,
  withCardio,
  onCardio,
}: {
  mode: ProgramMode;
  onMode: (mode: ProgramMode) => void;
  withCardio: boolean;
  onCardio: (value: boolean) => void;
}) {
  return (
    <View style={{ gap: spacing.md }}>
      {programModes.map((option) => {
        const selected = option === mode;
        return (
          <PressableScale
            accessibilityLabel={`${MODE_COPY[option].title}. ${MODE_COPY[option].body}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            haptic="selection"
            key={option}
            onPress={() => onMode(option)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              minHeight: minTouchTarget + 24,
              borderRadius: radii.lg,
              borderWidth: selected ? 2 : 1,
              borderColor: selected ? colors.volt : colors.borderSubtle,
              backgroundColor: colors.surfaceLow,
              padding: spacing.md,
            }}
            testID={`mode-${option}`}
          >
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>{MODE_COPY[option].title}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>{MODE_COPY[option].body}</Text>
            </View>
            <Ionicons color={selected ? colors.volt : colors.textMuted} name={selected ? 'radio-button-on' : 'radio-button-off'} size={iconSizes.lg} />
          </PressableScale>
        );
      })}
      <Checkbox checked={withCardio} label="Añadir plan de cardio" onChange={onCardio} />
    </View>
  );
}
