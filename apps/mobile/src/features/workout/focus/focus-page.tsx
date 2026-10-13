import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { Extrapolation, FadeIn, interpolate, useAnimatedStyle, ZoomIn, type SharedValue } from 'react-native-reanimated';
import type { Exercise, OmittedMark, SkippedSet, WorkoutSet } from '@gymsheet/types';
import { ExerciseImage, hasArtwork } from '@/components/media';
import { Burst, PressableScale } from '@/components/motion';
import { Button } from '@/components/ui';
import { Text } from '@/components/text';
import { setLabel } from '@/features/workout/exercise-card';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { restLabel, skipReasonLabel } from '@/features/workout/workout-flow';
import { colors, fontSizes, gutter, iconSizes, metricColors, minTouchTarget, popSpring, radii, shadows, spacing } from '@/theme';

type Artwork = Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular' | 'imagenUrl'>;

/** Alto de la imagen del ejercicio: grande, pero deja la serie a la vista sin desplazar. */
const MEDIA_HEIGHT = 196;
const COMPACT_MEDIA_HEIGHT = 148;
/** Sin imagen no se gasta media pantalla en un marcador: queda como una franja. */
const PLACEHOLDER_HEIGHT = 112;

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
  compact = false,
  onPress,
}: {
  /** En una superserie la página lleva además el selector A1/A2: la imagen cede alto. */
  compact?: boolean;
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
      [-width * 0.06, 0, width * 0.06],
      Extrapolation.CLAMP,
    );
    return { transform: [{ translateX: shift }] };
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
        height: exercise && hasArtwork(exercise) ? (compact ? COMPACT_MEDIA_HEIGHT : MEDIA_HEIGHT) : PLACEHOLDER_HEIGHT,
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

/** Una serie se da por «recién hecha» (y su píldora salta) durante estos milisegundos. */
const FRESH_MS = 4000;

function isFresh(iso: string): boolean {
  const at = new Date(iso).getTime();
  return Number.isFinite(at) && Date.now() - at < FRESH_MS;
}

/**
 * Las series del ejercicio en una fila: las hechas con lo que se hizo
 * («60 kg × 7»), las saltadas tachadas, la actual marcada y las que faltan
 * como huecos. Contesta sin leer a «¿cuántas llevo y cuántas me quedan?».
 * La píldora de la serie recién registrada entra con un salto: es el «hecho».
 */
export function SetTrack({
  sets,
  skipped = [],
  target,
  current,
  onUndoSkip,
}: {
  sets: readonly WorkoutSet[];
  skipped?: readonly SkippedSet[];
  target: number | null;
  /** Número de la serie que se está por hacer; `null` si no hay ninguna en curso. */
  current: number | null;
  /** Tocar una serie saltada la recupera. */
  onUndoSkip?: (skip: SkippedSet) => void;
}) {
  const reduceMotion = useReduceMotion();
  const entries = [
    ...sets.map((set) => ({ kind: 'done' as const, n: set.numeroSerie, set })),
    ...skipped.map((skip) => ({ kind: 'skipped' as const, n: skip.numeroSerie, skip })),
  ].sort((x, y) => x.n - y.n);
  const pending = Math.max(0, (target ?? 0) - entries.length - (current !== null ? 1 : 0));
  const summary = `${sets.length} ${sets.length === 1 ? 'serie hecha' : 'series hechas'}${target ? ` de ${target}` : ''}${
    skipped.length > 0 ? `, ${skipped.length} ${skipped.length === 1 ? 'saltada' : 'saltadas'}` : ''
  }`;
  return (
    <View accessibilityLabel={summary} style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }} testID="set-track">
      {entries.map((entry) =>
        entry.kind === 'done' ? (
          <Animated.View
            entering={!reduceMotion && isFresh(entry.set.fechaRegistro) ? ZoomIn.springify().damping(popSpring.damping).stiffness(popSpring.stiffness).withInitialValues({ transform: [{ scale: 0.7 }] }) : undefined}
            key={entry.set.id}
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
            <Ionicons color={colors.success} name="checkmark-circle" size={iconSizes.sm} />
            <Text strong tabular variant="footnote">
              {setLabel(entry.set)}
            </Text>
          </Animated.View>
        ) : (
          <PressableScale
            accessibilityHint="Toca para recuperarla"
            accessibilityLabel={`Serie ${entry.n} saltada: ${skipReasonLabel(entry.skip.motivo)}`}
            disabled={!onUndoSkip}
            haptic="selection"
            hitSlop={spacing.sm}
            key={entry.skip.id}
            onPress={() => onUndoSkip?.(entry.skip)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              height: 32,
              paddingHorizontal: spacing.smd,
              borderRadius: radii.full,
              backgroundColor: metricColors.skipped.tint,
            }}
            testID={`skipped-set-${entry.n}`}
          >
            <Ionicons color={metricColors.skipped.ink} name="play-skip-forward" size={iconSizes.xs} />
            <Text strong style={{ color: metricColors.skipped.ink, textDecorationLine: 'line-through' }} tabular variant="footnote">
              {`Serie ${entry.n}`}
            </Text>
          </PressableScale>
        ),
      )}
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

/**
 * «Descanso 2:30» (y «Entre ejercicios 0:15» en una superserie): cuánto se
 * va a descansar, a la vista ANTES de registrar, y a un toque de cambiarlo.
 */
export function RestPills({
  restSec,
  betweenSec,
  workSec,
  onPress,
}: {
  restSec: number;
  betweenSec: number | null;
  workSec: number | null;
  onPress: () => void;
}) {
  const pills: Array<{ key: string; icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone: 'rest' | 'time' }> = [
    { key: 'rest', icon: 'hourglass-outline', label: betweenSec !== null ? 'Tras la vuelta' : 'Descanso', value: restLabel(restSec), tone: 'rest' },
  ];
  if (betweenSec !== null) pills.push({ key: 'between', icon: 'swap-horizontal-outline', label: 'Entre ejercicios', value: restLabel(betweenSec), tone: 'time' });
  if (workSec !== null) pills.push({ key: 'work', icon: 'stopwatch-outline', label: 'Trabajo', value: restLabel(workSec), tone: 'time' });
  return (
    <PressableScale
      accessibilityHint="Cambia el descanso"
      accessibilityLabel={pills.map((pill) => `${pill.label} ${pill.value}`).join(', ')}
      haptic="selection"
      onPress={onPress}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget }}
      testID="rest-pills"
    >
      {pills.map((pill) => (
        <View
          key={pill.key}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            height: 34,
            paddingHorizontal: spacing.smd,
            borderRadius: radii.full,
            backgroundColor: metricColors[pill.tone].tint,
          }}
        >
          <Ionicons color={metricColors[pill.tone].ink} name={pill.icon} size={iconSizes.sm} />
          <Text tone="secondary" variant="footnote">
            {pill.label}
          </Text>
          <Text strong style={{ color: metricColors[pill.tone].ink }} tabular variant="footnote">
            {pill.value}
          </Text>
        </View>
      ))}
      <Ionicons color={colors.textMuted} name="options-outline" size={iconSizes.sm} />
    </PressableScale>
  );
}

/** Acciones secundarias de la página: discretas, debajo de la serie y lejos del botón principal. */
export function QuietActions({
  actions,
}: {
  actions: ReadonlyArray<{ key: string; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; disabled?: boolean; testID?: string }>;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: spacing.sm, rowGap: spacing.xs }}>
      {actions.map((action) => (
        <PressableScale
          accessibilityLabel={action.label}
          disabled={action.disabled}
          haptic="none"
          key={action.key}
          onPress={action.onPress}
          scaleTo={0.95}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            minHeight: minTouchTarget,
            paddingHorizontal: spacing.smd,
            borderRadius: radii.full,
          }}
          testID={action.testID}
        >
          <Ionicons color={colors.textSecondary} name={action.icon} size={iconSizes.sm} />
          <Text tone="secondary" variant="footnote">
            {action.label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

/** El ejercicio (o el bloque) quedó completo: check que salta y un destello sobrio, una sola vez. */
export function DoneCard({
  title,
  detail,
  celebrate,
  onExtra,
}: {
  title: string;
  detail: string;
  /** Solo cuando acaba de completarse (no al volver a una página ya hecha). */
  celebrate: boolean;
  onExtra: () => void;
}) {
  const reduceMotion = useReduceMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(220)}
      style={{ gap: spacing.md, padding: spacing.mdl, borderRadius: radii.xxl, borderCurve: 'continuous', backgroundColor: colors.surfaceLow }}
      testID="exercise-done"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        <View style={{ width: iconSizes.xl + spacing.sm, height: iconSizes.xl + spacing.sm, alignItems: 'center', justifyContent: 'center' }}>
          <Burst active={celebrate} color={colors.success} radius={26} />
          <Animated.View entering={reduceMotion || !celebrate ? undefined : ZoomIn.springify().damping(popSpring.damping).stiffness(popSpring.stiffness).withInitialValues({ transform: [{ scale: 0.6 }] })}>
            <Ionicons color={colors.success} name="checkmark-circle" size={iconSizes.xl} />
          </Animated.View>
        </View>
        <View style={{ flex: 1 }}>
          <Text strong variant="headline">
            {title}
          </Text>
          <Text tone="secondary" variant="footnote">
            {detail}
          </Text>
        </View>
      </View>
      <Button label="Hacer una serie extra" onPress={onExtra} testID="extra-set" variant="ghost" />
    </Animated.View>
  );
}

/** Ejercicio omitido: se dice por qué y se puede retomar. Nunca es un callejón sin salida. */
export function OmittedCard({ mark, onResume, busy }: { mark: OmittedMark; onResume: () => void; busy: boolean }) {
  return (
    <View
      style={{ gap: spacing.md, padding: spacing.mdl, borderRadius: radii.xxl, borderCurve: 'continuous', backgroundColor: colors.surfaceLow }}
      testID="exercise-omitted"
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: metricColors.skipped.tint,
          }}
        >
          <Ionicons color={metricColors.skipped.ink} name="play-skip-forward" size={iconSizes.md} />
        </View>
        <View style={{ flex: 1 }}>
          <Text strong variant="headline">
            Omitido hoy
          </Text>
          <Text tone="secondary" variant="footnote">
            {mark.nota ? `${skipReasonLabel(mark.motivo)}: ${mark.nota}` : skipReasonLabel(mark.motivo)}
          </Text>
        </View>
      </View>
      {mark.motivo === 'DOLOR' ? (
        <Text tone="secondary" variant="footnote">
          Si duele, parar es entrenar bien. Si la molestia sigue, coméntalo con tu entrenador o un profesional.
        </Text>
      ) : null}
      <Button disabled={busy} icon="refresh" label="Retomar ejercicio" onPress={onResume} testID="resume-exercise" variant="ghost" />
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
  index,
  scrollX,
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
  index: number;
  scrollX: SharedValue<number>;
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
  const reduceMotion = useReduceMotion();
  // Profundidad al pasar de página: la que se va se hunde y se apaga un poco, la
  // que llega sube. Solo `transform` y `opacity`, en el hilo de UI.
  const depth = useAnimatedStyle(() => {
    if (reduceMotion) return {};
    const range = [(index - 1) * width, index * width, (index + 1) * width];
    return {
      opacity: interpolate(scrollX.value, range, [0.45, 1, 0.45], Extrapolation.CLAMP),
      transform: [{ scale: interpolate(scrollX.value, range, [0.94, 1, 0.94], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={[{ width }, depth]}>
    <ScrollView
      automaticallyAdjustKeyboardInsets
      contentContainerStyle={{ paddingHorizontal: gutter, paddingTop: spacing.md, paddingBottom: bottomSpace, gap: spacing.md }}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
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
        <Text
          accessibilityRole="header"
          style={{ fontSize: fontSizes.xl, lineHeight: Math.round(fontSizes.xl * 1.14) }}
          testID="current-name"
          variant="display"
        >
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
    </Animated.View>
  );
}
