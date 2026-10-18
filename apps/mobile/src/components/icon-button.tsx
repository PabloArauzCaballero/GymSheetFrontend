import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '@/components/motion';
import { colors, iconSizes, minTouchTarget, radii } from '@/theme';

/**
 * Botón de solo icono para acciones de significado universal (ajustes, cerrar,
 * compartir, editar…), sobre todo en el hueco `action` de `ScreenHeader`.
 *
 * - Círculo de 44 (`minTouchTarget`) con el mismo relleno discreto que el «?»
 *   de la guía: cromo de pantalla, no acción principal, así que nunca volt.
 * - `label` es obligatorio: sin texto visible, la etiqueta en español es lo
 *   único que oye un lector de pantalla.
 * - Hundimiento de icono pequeño (0,94) y sin háptico: abrir ajustes o cerrar
 *   es navegación (mapa de hápticos de repp-diseno §6).
 */
export function IconButton({
  icon,
  label,
  onPress,
  disabled = false,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Nombre de la acción para lectores de pantalla («Ajustes», «Cerrar»…). */
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      disabled={disabled}
      haptic="none"
      onPress={onPress}
      scaleTo={0.94}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceHigh,
        opacity: disabled ? 0.4 : 1,
      }}
      testID={testID}
    >
      <Ionicons
        accessibilityElementsHidden
        color={colors.textSecondary}
        importantForAccessibility="no-hide-descendants"
        name={icon}
        size={iconSizes.md}
      />
    </PressableScale>
  );
}
