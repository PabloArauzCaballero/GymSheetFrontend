import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, radii, shadows, spacing } from '@/theme';

export type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
};

/**
 * Accesos de la cabecera de Rutinas en casillas iguales con el icono arriba
 * y la palabra debajo (como los atajos de una app de banca o de Salud). Antes
 * eran tres botones de distinto ancho y estilo partidos en dos filas: no se
 * sabía cuál importaba más. Ninguno va en acento: la acción principal de la
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
          scaleTo={0.96}
          style={{
            flex: 1,
            alignItems: 'center',
            gap: spacing.sm,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.xs,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            backgroundColor: colors.surfaceLow,
            boxShadow: shadows.e1,
          }}
          testID={action.testID}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.surfaceHighest,
            }}
          >
            <Ionicons color={colors.text} name={action.icon} size={iconSizes.md} />
          </View>
          <Text numberOfLines={2} style={{ textAlign: 'center' }} tone="secondary" variant="footnote">
            {action.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}
