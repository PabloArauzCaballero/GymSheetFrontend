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
import { BackLink } from '@/components/nav';
import { ScrollScreen } from '@/components/layout';
import { useScrollY } from '@/components/hero-bar';
import { EnterUp } from '@/components/motion';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { accentPolicy, alpha, colors, iconSizes, overlay, radii, shadows, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Mismo texto legal que `/privacidad` en la web — se enlaza desde el registro,
 * antes de que exista sesión. Lo que cambia es cómo se lee: un resumen de tres
 * líneas arriba (quien llega desde el alta quiere saber «¿qué hacen con lo
 * mío?» en cinco segundos) y las cuatro cláusulas en tarjetas numeradas.
 */
const SECTIONS: readonly { title: string; icon: IconName; body: string }[] = [
  {
    title: 'Qué datos guardamos',
    icon: 'folder-open-outline',
    body:
      'Datos de cuenta, entrenamientos y series registradas, medidas antropométricas, y —solo si las activas— género, ubicación al verificar una racha, fotos de perfil y datos de las funciones sociales.',
  },
  {
    title: 'Para qué los usamos',
    icon: 'stats-chart-outline',
    body:
      'Para mostrarte tu progreso, calcular rachas e insignias, y generar la clasificación de tu gimnasio. No vendemos tus datos a terceros.',
  },
  {
    title: 'Quién los ve',
    icon: 'eye-outline',
    body:
      'La clasificación del gimnasio solo muestra tu nombre e inicial. El personal del gimnasio ve los datos necesarios para tu membresía; no ve tus conversaciones ni tu ubicación exacta.',
  },
  {
    title: 'Tus derechos',
    icon: 'hand-left-outline',
    body:
      'Puedes pedir la eliminación de tu cuenta y de tus datos en cualquier momento contactando al gimnasio donde tienes tu membresía.',
  },
];

/** Lo esencial: cada línea resume una cláusula de abajo, sin añadir nada que no diga. */
const ESSENTIALS: readonly { icon: IconName; label: string }[] = [
  { icon: 'ban-outline', label: 'No vendemos tus datos a terceros.' },
  { icon: 'lock-closed-outline', label: 'El gimnasio no ve tus chats ni tu ubicación exacta.' },
  { icon: 'trash-outline', label: 'Pide borrar tu cuenta cuando quieras.' },
];

const BADGE = 64;
const TILE = 40;

/**
 * El escudo de la cabecera. Al entrar, un halo sale de él dos veces y se
 * detiene: dice «esto va de proteger tus datos» y no se queda latiendo
 * (repp-diseno §7: nada se mueve solo sin causa). Con «Reducir movimiento», quieto.
 */
function ShieldBadge() {
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
        <Ionicons color={accentPolicy.ink} name="shield-checkmark" size={iconSizes.xl} />
      </View>
    </View>
  );
}

/**
 * Una cláusula. Su ficha numerada se enciende cuando la lectura llega a ella
 * —el borde superior de la tarjeta cruza los tres cuartos de la pantalla—, así
 * que el número que brilla es el que estás leyendo. Va atado al
 * desplazamiento, no al reloj: si no te mueves, no se mueve.
 */
function ClauseCard({
  index,
  title,
  icon,
  body,
  listTop,
}: {
  index: number;
  title: string;
  icon: IconName;
  body: string;
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
        // `y` de la tarjeta dentro de la lista; la lista suma su propio `y`.
        top.value = event.nativeEvent.layout.y;
      }}
    >
    <EnterUp
      index={index + 3}
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
      <View>
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
              name={icon}
              size={iconSizes.md}
            />
          </Animated.View>
        </Animated.View>
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text accessibilityRole="header" variant="headline">
          {`${index + 1}. ${title}`}
        </Text>
        <Text tone="secondary" variant="subhead" style={{ lineHeight: 22 }}>
          {body}
        </Text>
      </View>
    </EnterUp>
    </View>
  );
}

export default function PrivacidadScreen() {
  const listTop = useSharedValue(0);

  return (
    <ScrollScreen>
      <BackLink />

      <View style={{ gap: spacing.md }}>
        <EnterUp index={0}>
          <ShieldBadge />
        </EnterUp>
        <EnterUp index={1} style={{ gap: spacing.sm }}>
          <Text accessibilityRole="header" variant="display">
            Política de privacidad
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
              Actualizada el 25 de agosto de 2026
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
        <Text accessibilityRole="header" strong variant="subhead" tone="accent">
          Lo esencial
        </Text>
        {ESSENTIALS.map((item) => (
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
          listTop.value = event.nativeEvent.layout.y;
        }}
        style={{ gap: spacing.smd }}
      >
        {SECTIONS.map((section, index) => (
          <ClauseCard key={section.title} index={index} listTop={listTop} {...section} />
        ))}
      </View>
    </ScrollScreen>
  );
}
