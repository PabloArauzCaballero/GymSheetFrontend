import { Text, View } from 'react-native';
import { Button } from '@/components/ui';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

type Action = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
};

/**
 * Barra fija inferior del asistente. A la izquierda, una línea de contexto
 * («5 ejercicios», «2 días seleccionados»); a la derecha, hasta dos acciones, la
 * principal a la derecha y rellena.
 *
 * Es una superficie elevada y no un degradado sobre el contenido: debajo hay
 * texto y filas, y un fondo translúcido los dejaría leerse a través de los
 * botones.
 */
export function WizardActionBar({
  info,
  primary,
  secondary,
}: {
  info?: string;
  primary: Action;
  secondary?: Action;
}) {
  return (
    <View
      style={{
        gap: spacing.sm,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        padding: spacing.sm,
      }}
    >
      {info ? (
        <Text
          accessibilityLiveRegion="polite"
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.sm,
            fontWeight: semibold,
            paddingHorizontal: spacing.xs,
          }}
        >
          {info}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {secondary ? (
          <Button
            disabled={secondary.disabled}
            label={secondary.label}
            onPress={secondary.onPress}
            style={{ flex: 1 }}
            variant="ghost"
          />
        ) : null}
        <Button
          disabled={primary.disabled}
          label={primary.label}
          loading={primary.loading}
          onPress={primary.onPress}
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}
