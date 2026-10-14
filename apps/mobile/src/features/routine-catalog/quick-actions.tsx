import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, comfortableTouchTarget, iconSizes, radii, shadows, spacing } from '@/theme';

export type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
};

/**
 * Accesos de la cabecera de Rutinas: un círculo con su icono y la palabra
 * debajo, sin casilla alrededor (antes era un círculo dentro de una tarjeta:
 * caja dentro de caja). Ninguno va en acento: la acción principal de la
 * pantalla es elegir una rutina.
 */
export function QuickActions({ actions }: { actions: readonly QuickAction[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {actions.map((action) => (
        <PressableScale
          accessibilityLabel={action.label}
          key={action.key}
          onPress={action.onPress}
          scaleTo={0.94}
          style={{ flex: 1, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs }}
          testID={action.testID}
        >
          <View
            style={{
              width: comfortableTouchTarget + spacing.sm,
              height: comfortableTouchTarget + spacing.sm,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceHigh,
              boxShadow: shadows.e1,
            }}
          >
            <Ionicons color={colors.text} name={action.icon} size={iconSizes.lg} />
          </View>
          <Text numberOfLines={2} style={{ textAlign: 'center' }} tone="secondary" variant="footnote">
            {action.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}
