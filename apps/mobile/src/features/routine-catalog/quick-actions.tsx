import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { EnterUp, PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { alpha, colors, iconSizes, metricColors, radii, shadows, spacing, type MetricKey } from '@/theme';

export type QuickAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  testID?: string;
};

/** Color de cada acceso: un tono por destino para reconocerlos sin leer. */
const TONE: Record<string, MetricKey> = { create: 'rest', exercises: 'weight', cardio: 'volume' };

/**
 * Accesos de la cabecera de Rutinas: fichas iguales con su icono en una gota de
 * color, la palabra debajo y un degradado casi imperceptible del mismo tono.
 * Cada destino tiene su color (crear = jade, ejercicios = azul, cardio = rosa)
 * para que se distingan con el rabillo del ojo; ninguno compite con la acción
 * principal de la pantalla, que es elegir una rutina.
 */
export function QuickActions({ actions }: { actions: readonly QuickAction[] }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {actions.map((action, index) => {
        const tone = metricColors[TONE[action.key] ?? 'rest'];
        return (
          <EnterUp index={index} key={action.key} style={{ flex: 1 }}>
            <PressableScale
              accessibilityLabel={action.label}
              onPress={action.onPress}
              scaleTo={0.95}
              style={{
                minHeight: 96,
                padding: spacing.smd,
                gap: spacing.sm,
                justifyContent: 'space-between',
                borderRadius: radii.xl,
                borderCurve: 'continuous',
                overflow: 'hidden',
                backgroundColor: colors.surfaceLow,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: tone.edge,
                boxShadow: shadows.e1,
              }}
              testID={action.testID}
            >
              <LinearGradient
                colors={[tone.tint, alpha(colors.surfaceLow, 0)]}
                end={{ x: 1, y: 1 }}
                pointerEvents="none"
                start={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: radii.lg,
                  borderCurve: 'continuous',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: tone.tint,
                }}
              >
                <Ionicons color={tone.ink} name={action.icon} size={iconSizes.md + 2} />
              </View>
              <Text numberOfLines={2} strong variant="footnote">
                {action.label}
              </Text>
            </PressableScale>
          </EnterUp>
        );
      })}
    </View>
  );
}
