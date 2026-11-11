import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { EnterUp } from '@/components/motion';
import { Text } from '@/components/text';
import { accentPolicy, alpha, colors, iconSizes, overlay, radii, shadows, spacing } from '@/theme';
import type { Benefit } from './copy';

const TILE = 36;

/**
 * Lo que se lleva quien se registra: tres filas en un panel de vidrio, cada una
 * con su glifo en una ficha teñida de jade.
 *
 * Antes eran tres líneas sueltas centradas a ojo: el bloque quedaba más
 * estrecho que la tarjeta del formulario y desalineado con ella, y los glifos
 * finos flotaban sin peso. Ahora el panel ocupa la misma columna que la
 * tarjeta (mismo ancho, mismo radio), el texto pasa a tono principal y cada
 * glifo tiene una ficha que le da presencia sin usar el relleno de acento —el
 * único relleno de la pantalla sigue siendo «Crear cuenta».
 *
 * Movimiento: las filas entran en cascada (≤ 3 × 40 ms) justo después del
 * panel; con «Reducir movimiento», aparecen sin viaje (`EnterUp`).
 */
export function BenefitList({ items, startIndex = 0 }: { items: readonly Benefit[]; startIndex?: number }) {
  return (
    <View
      accessibilityRole="list"
      style={{
        alignSelf: 'stretch',
        gap: spacing.smd,
        padding: spacing.md,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: overlay.glass,
        backgroundColor: alpha(colors.surfaceLow, 0.72),
        boxShadow: shadows.e1,
      }}
    >
      {items.map((item, index) => (
        <EnterUp
          index={startIndex + index}
          key={item.label}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}
        >
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={{
              width: TILE,
              height: TILE,
              borderRadius: radii.md,
              borderCurve: 'continuous',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: alpha(colors.accentInk, 0.14),
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: alpha(colors.accentInk, 0.28),
            }}
          >
            <Ionicons color={accentPolicy.ink} name={item.icon} size={iconSizes.md} />
          </View>
          <Text strong style={{ flex: 1 }} variant="subhead">
            {item.label}
          </Text>
        </EnterUp>
      ))}
    </View>
  );
}
