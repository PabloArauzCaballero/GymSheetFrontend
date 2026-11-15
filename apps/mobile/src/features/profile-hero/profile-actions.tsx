import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentContrast, colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

export type ProfileAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  /** Kept in its slot but inert, so the row never reflows while data loads or after an error. */
  disabled?: boolean;
  /** Spoken instead of the label when disabled: says why. */
  disabledLabel?: string;
  testID?: string;
};

/**
 * Las acciones bajo la cara, en círculo y con su nombre debajo (el patrón de
 * Tinder). Columnas iguales: a 320 pt ninguna etiqueta se corta ni empuja a la
 * de al lado. La principal es la única en relleno de acento.
 */
export function ProfileActions({ actions }: { actions: readonly ProfileAction[] }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', alignSelf: 'stretch' }}>
      {actions.map((action) => {
        const size = action.primary ? 64 : 52;
        return (
          <PressableScale
            accessibilityLabel={action.disabled ? (action.disabledLabel ?? action.label) : action.label}
            accessibilityState={{ disabled: Boolean(action.disabled) }}
            disabled={action.disabled}
            haptic={action.primary ? 'light' : 'selection'}
            key={action.key}
            onPress={action.onPress}
            scaleTo={0.94}
            style={{ flex: 1, minWidth: 0, minHeight: minTouchTarget, alignItems: 'center', gap: spacing.xs, opacity: action.disabled ? 0.45 : 1 }}
            testID={action.testID}
          >
            <View
              style={{
                width: size,
                height: size,
                borderRadius: radii.full,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: action.primary ? colors.volt : colors.surfaceHigh,
                borderWidth: action.primary ? 0 : 1,
                borderColor: colors.border,
              }}
            >
              <Ionicons
                color={action.primary ? accentContrast() : colors.text}
                name={action.icon}
                size={action.primary ? iconSizes.lg : iconSizes.md}
              />
            </View>
            <Text numberOfLines={1} strong={action.primary} style={{ textAlign: 'center' }} tone={action.primary ? 'default' : 'secondary'} variant="footnote">
              {action.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
