import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View } from 'react-native';
import type { Exercise } from '@gymsheet/types';
import { BottomSheet } from '@/components/bottom-sheet';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { colors, iconSizes, minTouchTarget, radii, spacing, thumbSizes } from '@/theme';

function MenuRow({
  icon,
  label,
  detail,
  danger = false,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail?: string;
  danger?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      haptic="none"
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: minTouchTarget + spacing.smd }}
      testID={testID}
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
        <Ionicons color={danger ? colors.danger : colors.text} name={icon} size={iconSizes.md} />
      </View>
      <View style={{ flex: 1 }}>
        <Text strong tone={danger ? 'danger' : 'default'} variant="body">
          {label}
        </Text>
        {detail ? (
          <Text tone="muted" variant="footnote">
            {detail}
          </Text>
        ) : null}
      </View>
    </PressableScale>
  );
}

export type OverviewItem = {
  id: string;
  page: number;
  name: string;
  badge: string | null;
  progress: string;
  done: boolean;
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular' | 'imagenUrl'> | null;
};

/** Qué enseña la hoja: las opciones o la lista de ejercicios. `null` = cerrada. */
export type SessionSheetMode = 'menu' | 'overview' | null;

/**
 * Todo lo que no es registrar una serie, fuera del camino: antes «Añadir
 * ejercicio», «Finalizar» y «Cancelar» eran tres botones al final de un scroll
 * larguísimo, a un dedo de la acción principal.
 *
 * Opciones y lista de ejercicios son la MISMA hoja con dos contenidos: iOS no
 * presenta un modal mientras otro se está cerrando, y con dos hojas un toque
 * rápido dejaba la segunda sin abrir.
 */
export function SessionSheet({
  mode,
  onClose,
  onOverview,
  onAdd,
  onFinish,
  onCancel,
  setsLabel,
  items,
  currentPage,
  onSelect,
}: {
  mode: SessionSheetMode;
  onClose: () => void;
  onOverview: () => void;
  onAdd: () => void;
  onFinish: () => void;
  onCancel: () => void;
  /** «6 series registradas». */
  setsLabel: string;
  items: readonly OverviewItem[];
  currentPage: number;
  onSelect: (item: OverviewItem) => void;
}) {
  // Mientras se cierra, la hoja conserva lo último que enseñaba (no parpadea a la otra vista).
  const [shown, setShown] = useState<'menu' | 'overview'>('menu');
  if (mode !== null && mode !== shown) setShown(mode);
  const overview = (mode ?? shown) === 'overview';
  return (
    <BottomSheet
      onClose={onClose}
      subtitle={overview ? 'Toca uno para ir a él' : undefined}
      testID={overview ? 'workout-overview' : 'workout-menu'}
      title={overview ? 'Ejercicios' : 'Tu entreno'}
      visible={mode !== null}
    >
      {overview ? (
        <View style={{ gap: spacing.xs }}>
          {items.map((item) => {
            const here = item.page === currentPage;
            return (
              <PressableScale
                accessibilityLabel={[item.badge, item.name, item.done ? 'hecho' : `${item.progress} series`].filter(Boolean).join(', ')}
                accessibilityState={{ selected: here }}
                haptic="selection"
                key={item.id}
                onPress={() => onSelect(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.smd,
                  minHeight: minTouchTarget + spacing.md,
                  paddingHorizontal: spacing.sm,
                  borderRadius: radii.lg,
                  borderCurve: 'continuous',
                  backgroundColor: here ? colors.surfaceHigh : 'transparent',
                }}
                testID={`overview-${item.id}`}
              >
                <View style={{ width: thumbSizes.stack + spacing.xs, height: thumbSizes.stack + spacing.xs, opacity: item.done ? 0.6 : 1 }}>
                  {item.exercise ? <ExerciseImage exercise={item.exercise} rounded={radii.md} size="fill" /> : null}
                </View>
                <View style={{ flex: 1 }}>
                  {item.badge ? (
                    <Text strong tabular tone="group" variant="caption">
                      {item.badge}
                    </Text>
                  ) : null}
                  <Text numberOfLines={1} strong tone={item.done ? 'secondary' : 'default'} variant="subhead">
                    {item.name}
                  </Text>
                </View>
                {item.done ? (
                  <Ionicons color={colors.textSecondary} name="checkmark-circle" size={iconSizes.lg} />
                ) : (
                  <Text strong tabular tone="secondary" variant="subhead">
                    {item.progress}
                  </Text>
                )}
              </PressableScale>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: spacing.xs }}>
          <MenuRow detail="Salta a cualquiera" icon="list" label="Ver todos los ejercicios" onPress={onOverview} testID="menu-overview" />
          <MenuRow detail="Se añade al final" icon="add" label="Añadir ejercicio" onPress={onAdd} testID="menu-add" />
          <MenuRow detail={setsLabel} icon="flag-outline" label="Finalizar sesión" onPress={onFinish} testID="menu-finish" />
          <MenuRow danger detail="Descarta lo registrado" icon="trash-outline" label="Cancelar sesión" onPress={onCancel} testID="menu-cancel" />
        </View>
      )}
    </BottomSheet>
  );
}
