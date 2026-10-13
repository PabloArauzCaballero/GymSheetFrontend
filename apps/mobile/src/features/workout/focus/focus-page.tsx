import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Extrapolation, interpolate, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { Exercise, WorkoutSet } from '@gymsheet/types';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { setLabel } from '@/features/workout/exercise-card';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { colors, gutter, iconSizes, minTouchTarget, radii, shadows, spacing } from '@/theme';

type Artwork = Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular' | 'imagenUrl'>;

/** Alto de la imagen del ejercicio: grande, pero deja la serie a la vista sin desplazar. */
const MEDIA_HEIGHT = 208;

/**
 * La imagen del ejercicio. Mientras se pasa de página se mueve un poco menos
 * que la página (parallax): es lo que hace que deslizar se sienta con fondo y
 * no como una diapositiva. Solo `transform`.
 */
export function PageMedia({
  exercise,
  index,
  width,
  scrollX,
  onPress,
}: {
  exercise: Artwork | null;
  index: number;
  width: number;
  scrollX: SharedValue<number>;
  onPress?: () => void;
}) {
  const reduceMotion = useReduceMotion();
  const animated = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const shift = interpolate(
      scrollX.value,
      [(index - 1) * width, index * width, (index + 1) * width],
      [-width * 0.14, 0, width * 0.14],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: shift }, { scale: 1.08 }] };
  });
  return (
    <PressableScale
      accessibilityHint={onPress ? 'Abre la ficha del ejercicio' : undefined}
      accessibilityLabel={exercise ? `Imagen de ${exercise.nombre}` : 'Ejercicio no disponible'}
      disabled={!onPress}
      haptic="none"
      onPress={onPress}
      scaleTo={0.985}
      style={{
        height: MEDIA_HEIGHT,
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        overflow: 'hidden',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.card,
      }}
    >
      <Animated.View style={[{ width: '100%', height: '100%' }, animated]}>
        {exercise ? <ExerciseImage exercise={exercise} rounded={0} size="fill" /> : null}
      </Animated.View>
      {onPress ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: spacing.smd,
            bottom: spacing.smd,
            width: 32,
            height: 32,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHighest,
          }}
        >
          <Ionicons color={colors.text} name="information" size={iconSizes.sm + 2} />
        </View>
      ) : null}
    </PressableScale>
  );
}

/**
 * Las series del ejercicio en una fila: las hechas con lo que se hizo
 * («60 kg × 7»), la actual marcada y las que faltan como huecos. Contesta sin
 * leer a «¿cuántas llevo y cuántas me quedan?».
 */
export function SetTrack({
  sets,
  target,
  current,
}: {
  sets: readonly WorkoutSet[];
  target: number | null;
  /** Número de la serie que se está por hacer; `null` si no hay ninguna en curso. */
  current: number | null;
}) {
  const ordered = [...sets].sort((a, b) => a.numeroSerie - b.numeroSerie);
  const pending = Math.max(0, (target ?? 0) - ordered.length - (current !== null ? 1 : 0));
  return (
    <View
      accessibilityLabel={`${ordered.length} ${ordered.length === 1 ? 'serie hecha' : 'series hechas'}${target ? ` de ${target}` : ''}`}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}
      testID="set-track"
    >
      {ordered.map((set) => (
        <View
          key={set.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            height: 32,
            paddingHorizontal: spacing.smd,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHighest,
          }}
        >
          <Ionicons color={colors.textSecondary} name="checkmark" size={iconSizes.sm} />
          <Text strong tabular variant="footnote">
            {setLabel(set)}
          </Text>
        </View>
      ))}
      {current !== null ? (
        <View
          style={{
            height: 32,
            paddingHorizontal: spacing.smd,
            justifyContent: 'center',
            borderRadius: radii.full,
            borderWidth: 1.5,
            borderColor: colors.text,
          }}
        >
          <Text strong tabular variant="footnote">
            {`Serie ${current}`}
          </Text>
        </View>
      ) : null}
      {Array.from({ length: pending }, (_, index) => (
        <View
          key={`pending-${index}`}
          style={{ width: 32, height: 32, borderRadius: radii.full, borderWidth: 1, borderColor: colors.border }}
        />
      ))}
    </View>
  );
}

/** Selector A1 / A2 de una superserie: qué ejercicio del bloque toca, y poder cambiarlo. */
export function GroupSwitch({
  items,
  activeId,
  onSelect,
}: {
  items: ReadonlyArray<{ id: string; badge: string; name: string; done: boolean }>;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <PressableScale
            accessibilityLabel={`${item.badge}, ${item.name}${item.done ? ', hecho' : ''}`}
            accessibilityState={{ selected: active }}
            haptic="selection"
            key={item.id}
            onPress={() => onSelect(item.id)}
            style={{
              flex: 1,
              minHeight: minTouchTarget + spacing.sm,
              paddingHorizontal: spacing.smd,
              paddingVertical: spacing.sm,
              justifyContent: 'center',
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              borderWidth: 1.5,
              borderColor: active ? colors.group : 'transparent',
              backgroundColor: active ? colors.groupTint : colors.surfaceLow,
            }}
            testID={`group-switch-${item.badge}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text strong tabular tone="group" variant="caption">
                {item.badge}
              </Text>
              {item.done ? <Ionicons color={colors.textSecondary} name="checkmark-circle" size={iconSizes.sm} /> : null}
            </View>
            <Text numberOfLines={1} strong tone={active ? 'default' : 'secondary'} variant="footnote">
              {item.name}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

/**
 * Una página del entreno: un ejercicio (o una superserie) a pantalla completa.
 * Arriba la imagen; debajo, qué es y cuánto pide; y la serie que toca. El
 * botón de registrar no está aquí: va fijo abajo, uno solo para toda la sesión.
 */
export function FocusPage({
  width,
  bottomSpace,
  media,
  eyebrow,
  name,
  target,
  note,
  groupSwitch,
  track,
  children,
  testID,
}: {
  width: number;
  /** Hueco del pie fijo, para que nada quede debajo del botón. */
  bottomSpace: number;
  media: ReactNode;
  /** «Superserie A · Vuelta 1/3»; `null` en un ejercicio suelto. */
  eyebrow: string | null;
  name: string;
  target: string | null;
  note?: string | null;
  groupSwitch?: ReactNode;
  track: ReactNode;
  children: ReactNode;
  testID?: string;
}) {
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: spacing.md, paddingBottom: bottomSpace, gap: spacing.mdl }}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={{ width }}
      testID={testID}
    >
      {media}
      {groupSwitch}
      <View style={{ gap: spacing.xs }}>
        {eyebrow ? (
          <Text strong tabular tone="group" variant="footnote">
            {eyebrow}
          </Text>
        ) : null}
        <Text accessibilityRole="header" testID="current-name" variant="display">
          {name}
        </Text>
        {target ? (
          <Text tabular testID="current-target" tone="secondary" variant="subhead">
            {target}
          </Text>
        ) : null}
      </View>
      {note ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.smd, borderRadius: radii.lg, backgroundColor: colors.surfaceLow }}>
          <Ionicons color={colors.textSecondary} name="chatbubble-ellipses-outline" size={iconSizes.sm} />
          <Text style={{ flexShrink: 1 }} tone="secondary" variant="footnote">
            {note}
          </Text>
        </View>
      ) : null}
      {track}
      {children}
    </ScrollView>
  );
}
