import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { colors, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** Qué hace el único CTA principal del detalle (C1/C2, C8.3.1). */
export type PrimaryIntent = 'save' | 'activate' | 'train';

const PRIMARY_LABEL: Record<PrimaryIntent, string> = {
  save: 'Guardar en mis rutinas',
  activate: 'Activar programa',
  train: 'Entrenar hoy',
};

const PRIMARY_ICON = {
  save: 'bookmark-outline',
  activate: 'flag-outline',
  train: 'play',
} as const;

/** Acción secundaria compacta: icono + texto, sin caja, 44 de alto. */
export function QuietAction({
  icon,
  label,
  onPress,
  loading = false,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityState={{ busy: loading }}
      disabled={loading}
      haptic="none"
      onPress={onPress}
      scaleTo={0.96}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        minHeight: minTouchTarget,
        paddingHorizontal: spacing.xs,
      }}
      testID={testID}
    >
      {loading ? (
        <ActivityIndicator color={colors.textSecondary} size="small" />
      ) : (
        <Ionicons
          accessibilityElementsHidden
          color={colors.textSecondary}
          importantForAccessibility="no-hide-descendants"
          name={icon}
          size={iconSizes.md}
        />
      )}
      <Text strong tone="secondary" variant="subhead">
        {label}
      </Text>
    </PressableScale>
  );
}

/**
 * Bloque de acciones del detalle: **un solo** botón principal según el caso
 * (ajena → «Guardar en mis rutinas»; propia sin programa → «Activar
 * programa»; con programa activo → «Entrenar hoy»), el aviso de una copia ya
 * guardada y la fila de secundarias («Probar un día», «Compartir»).
 */
export function DetailActions({
  intent,
  onPrimary,
  primaryLoading,
  existingCopy,
  onOpenCopy,
  onTryDay,
  tryingDay,
  onShare,
}: {
  intent: PrimaryIntent;
  onPrimary: () => void;
  primaryLoading?: boolean;
  existingCopy?: { id: string; label: string } | null;
  onOpenCopy?: (id: string) => void;
  /** «Probar un día»: entrenar sin guardar (no es un programa). */
  onTryDay?: () => void;
  tryingDay?: boolean;
  onShare?: () => void;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Button
        icon={PRIMARY_ICON[intent]}
        label={PRIMARY_LABEL[intent]}
        loading={primaryLoading}
        onPress={onPrimary}
        size="lg"
        testID="routine-primary-cta"
      />
      {existingCopy && onOpenCopy ? (
        <PressableScale
          accessibilityLabel={`${existingCopy.label}. Abrir`}
          haptic="none"
          onPress={() => onOpenCopy(existingCopy.id)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: minTouchTarget,
            paddingHorizontal: spacing.smd,
            borderRadius: radii.md,
            backgroundColor: colors.surfaceLow,
          }}
          testID="existing-copy"
        >
          <Ionicons color={colors.success} name="checkmark-circle" size={iconSizes.md} />
          <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
            {existingCopy.label}
          </Text>
          <Text strong tone="accent" variant="subhead">
            Abrir
          </Text>
        </PressableScale>
      ) : null}
      {onTryDay || onShare ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {onTryDay ? (
            <QuietAction icon="play-circle-outline" label="Probar un día" loading={tryingDay} onPress={onTryDay} testID="try-day" />
          ) : null}
          {onShare ? <QuietAction icon="share-outline" label="Compartir" onPress={onShare} testID="share-routine" /> : null}
        </View>
      ) : null}
    </View>
  );
}
