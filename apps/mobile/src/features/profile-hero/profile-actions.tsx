import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentContrast, colors, iconSizes, radii, spacing } from '@/theme';

type Action = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  primary?: boolean;
  testID?: string;
};

/**
 * Las tres acciones bajo la cara, en círculo y con su nombre debajo (el patrón
 * de Tinder). La central es la principal y la única en relleno de acento:
 * editar es lo que esta pantalla tiene que facilitar.
 */
export function ProfileActions({ actions }: { actions: readonly Action[] }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: spacing.lg }}>
      {actions.map((action) => {
        const size = action.primary ? 64 : 52;
        return (
          <PressableScale
            accessibilityLabel={action.label}
            haptic={action.primary ? 'light' : 'selection'}
            key={action.key}
            onPress={action.onPress}
            scaleTo={0.94}
            style={{ alignItems: 'center', gap: spacing.xs, minWidth: 76 }}
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
            <Text strong={action.primary} tone={action.primary ? 'default' : 'secondary'} variant="footnote">
              {action.label}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
