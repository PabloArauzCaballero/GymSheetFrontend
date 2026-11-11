import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { BackLink } from '@/components/nav';
import { ScrollScreen, useScreenFrame } from '@/components/layout';
import { Button } from '@/components/ui';
import { useScrollY } from '@/components/hero-bar';
import { EnterUp } from '@/components/motion';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentPolicy, alpha, colors, iconSizes, overlay, radii, screenGap, shadows, spacing } from '@/theme';

export type LegalIcon = keyof typeof Ionicons.glyphMap;

export type LegalClause = { title: string; icon: LegalIcon; body: string };
export type LegalEssential = { icon: LegalIcon; label: string };

const BADGE = 64;
const TILE = 40;
/** Desplazamiento a partir del cual aparece la barra de lectura. */
const READING_BAR_FROM = 48;

/**
 * El emblema de la cabecera. Al entrar, un halo sale de él dos veces y se
 * detiene: dice de qué va el documento y no se queda latiendo (repp-diseno §7:
 * nada se mueve solo sin causa). Con «Reducir movimiento», quieto.
 */
function Emblem({ icon }: { icon: LegalIcon }) {
  const reduceMotion = useReduceMotion();
  const wave = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return;
    wave.value = 0;
    wave.value = withDelay(
      320,
      withRepeat(withTiming(1, { duration: 1400, easing: Easing.bezier(0.23, 1, 0.32, 1) }), 2, false),
    );
    return () => cancelAnimation(wave);
  }, [reduceMotion, wave]);
  const ring = useAnimatedStyle(() => ({
    opacity: wave.value === 0 ? 0 : 0.6 * (1 - wave.value),
    transform: [{ scale: 1 + wave.value * 0.65 }],
  }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: BADGE, height: BADGE, alignItems: 'center', justifyContent: 'center' }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: BADGE,
            height: BADGE,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            borderWidth: 2,
            borderColor: colors.accentInk,
          },
          ring,
        ]}
      />
      <View
        style={{
          width: BADGE,
          height: BADGE,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: alpha(colors.accentInk, 0.16),
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: alpha(colors.accentInk, 0.4),
        }}
      >
        <Ionicons color={accentPolicy.ink} name={icon} size={iconSizes.xl} />
      </View>
    </View>
  );
}

/**
 * Una cláusula. Su ficha se enciende cuando la lectura llega a ella —el borde
 * superior de la tarjeta cruza los tres cuartos de la pantalla—, así que la que
 * brilla es la que estás leyendo. Atado al desplazamiento, no al reloj.
 */
function ClauseCard({
  index,
  clause,
  listTop,
}: {
  index: number;
  clause: LegalClause;
  listTop: SharedValue<number>;
}) {
  const scrollY = useScrollY();
  const { height: viewport } = useWindowDimensions();
  const top = useSharedValue(Number.POSITIVE_INFINITY);
  const reduceMotion = useReduceMotion();
  // Los colores entran como valores: dentro del worklet `colors.*` quedaría
  // congelado en la marca de arranque (ver `Checkbox`).
  const idle = colors.surfaceHigh;
  const lit = alpha(colors.accentInk, 0.18);
  const idleBorder = alpha(colors.text, 0.08);
  const litBorder = alpha(colors.accentInk, 0.45);

  const reached = (scroll: number) => {
    'worklet';
    return interpolate(scroll + viewport * 0.75 - (listTop.value + top.value), [0, 120], [0, 1], 'clamp');
  };
  const tile = useAnimatedStyle(() => {
    const on = reached(scrollY.value);
    return {
      backgroundColor: interpolateColor(on, [0, 1], [idle, lit]),
      borderColor: interpolateColor(on, [0, 1], [idleBorder, litBorder]),
      transform: [{ scale: reduceMotion ? 1 : 0.92 + on * 0.08 }],
    };
  });
  const glyph = useAnimatedStyle(() => ({ opacity: 0.55 + reached(scrollY.value) * 0.45 }));

  return (
    <View
      onLayout={(event) => {
        top.value = event.nativeEvent.layout.y;
      }}
    >
      <EnterUp
        index={Math.min(index + 3, 6)}
        style={{
          flexDirection: 'row',
          gap: spacing.md,
          padding: spacing.mdl,
          borderRadius: radii.xl,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceLow,
          boxShadow: shadows.e1,
        }}
      >
        <Animated.View
          style={[
            {
              width: TILE,
              height: TILE,
              borderRadius: radii.md,
              borderCurve: 'continuous',
              borderWidth: StyleSheet.hairlineWidth,
              alignItems: 'center',
              justifyContent: 'center',
            },
            tile,
          ]}
        >
          <Animated.View style={glyph}>
            <Ionicons
              accessibilityElementsHidden
              color={accentPolicy.ink}
              importantForAccessibility="no-hide-descendants"
              name={clause.icon}
              size={iconSizes.md}
            />
          </Animated.View>
        </Animated.View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text accessibilityRole="header" variant="headline">
            {`${index + 1}. ${clause.title}`}
          </Text>
          <Text tone="secondary" variant="subhead" style={{ lineHeight: 22 }}>
            {clause.body}
          </Text>
        </View>
      </EnterUp>
    </View>
  );
}

/**
 * Lo leído y la salida, fijos abajo. Aparece cuando empiezas a desplazarte: al
 * abrir el documento la barra vacía no informaba de nada y tapaba «Lo esencial»,
 * que es justo lo que se viene a leer arriba. La línea se llena con el
 * desplazamiento y «Entendido» devuelve a donde se vino (efecto de cierre).
 */
function ReadingBar({ maxScroll, fallbackHref }: { maxScroll: SharedValue<number>; fallbackHref: '/(auth)/register' }) {
  const router = useRouter();
  const scrollY = useScrollY();
  const reduceMotion = useReduceMotion();
  const shown = useAnimatedStyle(() => {
    const on = interpolate(scrollY.value, [READING_BAR_FROM - 24, READING_BAR_FROM], [0, 1], 'clamp');
    return { opacity: on, transform: [{ translateY: reduceMotion ? 0 : (1 - on) * 16 }] };
  });
  const fill = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(scrollY.value, [0, Math.max(1, maxScroll.value)], [0.04, 1], 'clamp') }],
  }));
  return (
    <Animated.View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.sm,
          paddingLeft: spacing.mdl,
          paddingRight: spacing.sm,
          borderRadius: radii.full,
          borderCurve: 'continuous',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: overlay.glass,
          backgroundColor: alpha(colors.surfaceHigh, 0.94),
          boxShadow: shadows.e2,
        },
        shown,
      ]}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ flex: 1, gap: spacing.xs }}>
        <Text tone="muted" variant="caption">
          Tu lectura
        </Text>
        <View style={{ height: 4, borderRadius: radii.full, overflow: 'hidden', backgroundColor: alpha(colors.text, 0.1) }}>
          <Animated.View
            style={[
              { height: 4, width: '100%', borderRadius: radii.full, backgroundColor: colors.accentInk, transformOrigin: 'left' },
              fill,
            ]}
          />
        </View>
      </View>
      <Button
        icon="checkmark"
        label="Entendido"
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallbackHref))}
        size="sm"
      />
    </Animated.View>
  );
}

/**
 * Un documento legal leíble: emblema, título con su fecha, «Lo esencial» (cada
 * línea resume una cláusula, sin añadir nada que no diga) y las cláusulas en
 * tarjetas numeradas. Términos y Privacidad comparten esta pieza: antes cada uno
 * tenía su maqueta, y uno era tarjetas animadas mientras el otro seguía siendo
 * un muro de texto gris.
 *
 * El texto de cada cláusula es el mismo que la web, tal cual: aquí solo se
 * decide cómo se lee.
 */
export function LegalDocument({
  title,
  updated,
  icon,
  essentials,
  clauses,
}: {
  title: string;
  /** Frase completa, con su concordancia: «Actualizada el 25 de agosto de 2026». */
  updated: string;
  icon: LegalIcon;
  essentials: readonly LegalEssential[];
  clauses: readonly LegalClause[];
}) {
  const listTop = useSharedValue(0);
  const frame = useScreenFrame();
  const { height: viewport } = useWindowDimensions();
  const maxScroll = useSharedValue(0);
  const paddingTop = frame.contentPadding.paddingTop as number;
  const paddingBottom = frame.contentPadding.paddingBottom as number;

  return (
    <ScrollScreen overlay={<ReadingBar fallbackHref="/(auth)/register" maxScroll={maxScroll} />}>
      <View
        onLayout={(event) => {
          // Desplazamiento máximo: contenido más rellenos, menos lo que se ve.
          maxScroll.value = event.nativeEvent.layout.height + paddingTop + paddingBottom - viewport;
        }}
        style={{ gap: screenGap }}
      >
        <BackLink />

        <View style={{ gap: spacing.md }}>
          <EnterUp index={0}>
            <Emblem icon={icon} />
          </EnterUp>
          <EnterUp index={1} style={{ gap: spacing.sm }}>
            <Text accessibilityRole="header" variant="display">
              {title}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                alignSelf: 'flex-start',
                gap: spacing.xs,
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.smd,
                borderRadius: radii.full,
                backgroundColor: colors.surfaceHigh,
              }}
            >
              <Ionicons
                accessibilityElementsHidden
                color={colors.textSecondary}
                importantForAccessibility="no-hide-descendants"
                name="calendar-outline"
                size={iconSizes.sm}
              />
              <Text tone="secondary" variant="footnote">
                {updated}
              </Text>
            </View>
          </EnterUp>
        </View>

        <EnterUp
          index={2}
          style={{
            gap: spacing.smd,
            padding: spacing.mdl,
            borderRadius: radii.xl,
            borderCurve: 'continuous',
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: overlay.glass,
            backgroundColor: alpha(colors.accentInk, 0.07),
          }}
        >
          <Text accessibilityRole="header" strong tone="accent" variant="subhead">
            Lo esencial
          </Text>
          {essentials.map((item) => (
            <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
              <Ionicons
                accessibilityElementsHidden
                color={accentPolicy.ink}
                importantForAccessibility="no-hide-descendants"
                name={item.icon}
                size={iconSizes.md}
              />
              <Text style={{ flex: 1 }} variant="subhead">
                {item.label}
              </Text>
            </View>
          ))}
        </EnterUp>

        <View
          onLayout={(event) => {
            // `y` dentro del envoltorio; el desplazamiento cuenta desde el borde
            // del contenido, que empieza un relleno superior más arriba.
            listTop.value = event.nativeEvent.layout.y + paddingTop;
          }}
          style={{ gap: spacing.smd }}
        >
          {clauses.map((clause, index) => (
            <ClauseCard clause={clause} index={index} key={clause.title} listTop={listTop} />
          ))}
        </View>
        {/* Aire para la barra fija de abajo: sin él, la última cláusula quedaba bajo ella. */}
        <View style={{ height: spacing['2xl'] }} />
      </View>
    </ScrollScreen>
  );
}
