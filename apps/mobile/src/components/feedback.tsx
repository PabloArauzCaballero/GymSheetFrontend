import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { mascotXml, type MascotMood } from '@gymsheet/design-tokens/repi';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { resolveError } from '@/notifications';
import { Shimmer } from '@/components/shimmer';
import { Text } from '@/components/text';
import { cardPadding, colors, iconSizes, radii, shadows, spacing } from '@/theme';

/**
 * Placeholder shown while a query is in flight. Blocks of the right shape beat
 * a spinner: the screen does not jump once the data lands.
 *
 * The slow pulse is the difference between "loading" and "broken" — a static
 * grey box reads as a dead layout, a breathing one reads as work in progress.
 */
export function Skeleton({
  height = 72,
  width,
  radius = radii.xl,
}: {
  height?: number | `${number}%`;
  width?: number | `${number}%`;
  radius?: number;
}) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    // Un esqueleto existe para desaparecer: es el componente de la app que más
    // veces se desmonta, y cada vez dejaba su bucle atrás.
    return () => {
      cancelAnimation(progress);
    };
  }, [progress, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: 0.45 + progress.value * 0.35 }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          height,
          width,
          borderRadius: radius,
          borderCurve: 'continuous',
          overflow: 'hidden',
          backgroundColor: colors.surfaceHigh,
        },
        animated,
      ]}
    >
      <Shimmer />
    </Animated.View>
  );
}

/**
 * Esqueleto de una lista de filas con miniatura, con la forma de lo que va a
 * llegar: una tarjeta, filas de lámina más dos líneas de texto, y divisores.
 * Tres cajas sueltas de 72 pt anunciaban otra cosa y la página saltaba al
 * cambiar de forma cuando llegaban los datos.
 */
export function RowsSkeleton({ rows = 4, thumb = 64 }: { rows?: number; thumb?: number }) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [progress, reduceMotion]);

  const animated = useAnimatedStyle(() => ({ opacity: 0.45 + progress.value * 0.35 }));
  const bone = { backgroundColor: colors.surfaceHigh, borderRadius: radii.sm } as const;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
        paddingHorizontal: cardPadding,
        paddingVertical: spacing.sm,
        overflow: 'hidden',
      }}
    >
      <Shimmer />
      {Array.from({ length: rows }, (_, index) => (
        <View key={index}>
          {index > 0 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} /> : null}
          <Animated.View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm }, animated]}>
            <View style={[bone, { width: thumb, height: thumb, borderRadius: radii.md }]} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <View style={[bone, { height: 14, width: '72%' }]} />
              <View style={[bone, { height: 10, width: '40%' }]} />
            </View>
          </Animated.View>
        </View>
      ))}
    </View>
  );
}

type ViewProps = React.ComponentProps<typeof View>;

/** Repi en un vacío: protagonista, pero sin empujar la acción fuera de pantalla. */
const MASCOT_EMPTY_SIZE = 112;

/** Repi en un estado vacío: decorativa, el título y el mensaje ya lo dicen. */
function Mascot({ mood, size }: { mood: MascotMood; size: number }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <SvgXml height={size} width={size} xml={mascotXml(mood)} />
    </View>
  );
}

function CenteredState({
  icon,
  mascot,
  title,
  message,
  children,
  style,
  onLayout,
  compact = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  mascot?: MascotMood;
  title: string;
  message: string;
  children?: React.ReactNode;
  style?: ViewProps['style'];
  onLayout?: ViewProps['onLayout'];
  compact?: boolean;
}) {
  if (compact) return <CompactState icon={icon} mascot={mascot} message={message} title={title}>{children}</CompactState>;
  return (
    <View
      onLayout={onLayout}
      style={[
        {
          alignItems: 'center',
          gap: spacing.sm,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceLow,
          boxShadow: shadows.e1,
          paddingVertical: spacing.xl,
          paddingHorizontal: spacing.lg,
        },
        // Con Repi la ilustración ya hace de superficie: sin tarjeta debajo.
        mascot ? { backgroundColor: 'transparent', boxShadow: 'none', paddingVertical: spacing.lg } : null,
        style,
      ]}
    >
      {/* Decorative: the title and message already carry the meaning, so the
          glyph is hidden from the accessibility tree instead of read aloud. */}
      {mascot ? (
        <Mascot mood={mascot} size={MASCOT_EMPTY_SIZE} />
      ) : (
        <Ionicons
          accessibilityElementsHidden
          color={colors.textMuted}
          importantForAccessibility="no-hide-descendants"
          name={icon}
          size={iconSizes.xl}
        />
      )}
      <Text style={{ textAlign: 'center' }} variant="headline">
        {title}
      </Text>
      <Text selectable style={{ textAlign: 'center' }} tone="muted" variant="subhead">
        {message}
      </Text>
      {children}
    </View>
  );
}

/**
 * La misma información en horizontal: glifo en ficha a la izquierda, texto
 * alineado a la izquierda y la acción debajo. Para un estado vacío que vive
 * bajo otras piezas (cabecera, tira de historias, selector): en vertical, con
 * el glifo grande arriba, su botón caía bajo la barra del entreno y no se veía
 * sin desplazar.
 */
function CompactState({
  icon,
  mascot,
  title,
  message,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  mascot?: MascotMood;
  title: string;
  message: string;
  children?: React.ReactNode;
}) {
  return (
    <View
      style={{
        gap: spacing.smd,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
        padding: spacing.mdl,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
        {mascot ? <Mascot mood={mascot} size={56} /> : <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={{
            width: 44,
            height: 44,
            borderRadius: radii.md,
            borderCurve: 'continuous',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Ionicons color={colors.textMuted} name={icon} size={iconSizes.lg} />
        </View>}
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="headline">{title}</Text>
          <Text selectable tone="muted" variant="subhead">
            {message}
          </Text>
        </View>
      </View>
      {children ? <View style={{ alignItems: 'flex-start' }}>{children}</View> : null}
    </View>
  );
}

/**
 * `style` y `onLayout` existen por las listas invertidas (el chat): React Native
 * inyecta ahí la transformación que deshace la inversión del
 * `ListEmptyComponent`. Si no se aplican, la tarjeta se pinta cabeza abajo.
 */
export function EmptyState({
  icon = 'sparkles-outline',
  mascot,
  title,
  message,
  children,
  style,
  onLayout,
  compact = false,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  /** Repi en lugar del glifo, con el ánimo que pida el vacío. */
  mascot?: MascotMood;
  title: string;
  message: string;
  children?: React.ReactNode;
  style?: ViewProps['style'];
  onLayout?: ViewProps['onLayout'];
  /** Horizontal y más bajo; ver `CompactState`. */
  compact?: boolean;
}) {
  return (
    <CenteredState compact={compact} icon={icon} mascot={mascot} message={message} onLayout={onLayout} style={style} title={title}>
      {children}
    </CenteredState>
  );
}

/**
 * Failure with a way out. The copy comes from the notifications engine, so a
 * screen never invents its own wording for the same backend error.
 */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const resolved = resolveError(error);
  return (
    <CenteredState icon="cloud-offline-outline" message={resolved.message} title={resolved.title}>
      {/* Secundario: reintentar no es la acción principal de la pantalla. */}
      <Button icon="refresh-outline" label="Reintentar" onPress={onRetry} size="sm" style={{ marginTop: spacing.xs }} variant="secondary" />
    </CenteredState>
  );
}
