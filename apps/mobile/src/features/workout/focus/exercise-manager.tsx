import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { colors, iconSizes, metricColors, minTouchTarget, radii, spacing } from '@/theme';

function Tool({
  icon,
  label,
  disabled = false,
  danger = false,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      haptic="selection"
      onPress={onPress}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: danger ? metricColors.volume.tint : colors.surfaceHighest,
        opacity: disabled ? 0.35 : 1,
      }}
      testID={testID}
    >
      <Ionicons color={danger ? colors.danger : colors.text} name={icon} size={iconSizes.md} />
    </PressableScale>
  );
}

/**
 * Lo que se puede hacer con un ejercicio ya hecho en una rutina in situ:
 * subirlo, bajarlo, repetirlo (otra tanda al final) o quitarlo.
 */
export function ExerciseManager({
  id,
  name,
  first,
  last,
  busy,
  onMove,
  onRepeat,
  onRemove,
}: {
  id: string;
  name: string;
  first: boolean;
  last: boolean;
  busy: boolean;
  onMove: (id: string, direction: -1 | 1) => void;
  onRepeat: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, paddingBottom: spacing.xs }}>
      <Tool disabled={busy || first} icon="arrow-up" label={`Subir ${name}`} onPress={() => onMove(id, -1)} testID={`move-up-${id}`} />
      <Tool disabled={busy || last} icon="arrow-down" label={`Bajar ${name}`} onPress={() => onMove(id, 1)} testID={`move-down-${id}`} />
      <Tool disabled={busy} icon="copy-outline" label={`Repetir ${name} al final`} onPress={() => onRepeat(id)} testID={`repeat-${id}`} />
      <Tool danger disabled={busy} icon="trash-outline" label={`Quitar ${name}`} onPress={() => onRemove(id)} testID={`remove-${id}`} />
    </View>
  );
}
