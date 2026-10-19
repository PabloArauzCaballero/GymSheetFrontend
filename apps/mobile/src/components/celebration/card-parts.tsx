import type { CardTier, Particle } from '@gymsheet/domain';
import { LinearGradient } from 'expo-linear-gradient';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { withAlpha } from '@/components/progression';
import { celebrationPalette, fontSizes, radii, spacing, type CardMaterial } from '@/theme';

/**
 * Las piezas visuales de la carta. Ninguna decide cuándo se mueve: reciben
 * valores compartidos y los traducen a estilo en el hilo de UI. El guion vive
 * en `stage.tsx`; aquí sólo hay forma.
 *
 * Todo es vectorial —degradados, vistas y glifos de fuente—, que es lo que
 * deja escalar y voltear la carta sin que nada se vea pixelado.
 */

type Gradient = readonly [string, string, ...string[]];

/* ─── Rayos ──────────────────────────────────────────────────────────────── */

const RAY_COUNT = 16;

/**
 * El sol de detrás de la carta. Dieciséis listones de degradado girados desde
 * su base, alternando anchos: la irregularidad es lo que lo hace parecer luz y
 * no una rueda dentada.
 */
export function Rays({
  size,
  tint,
  alpha,
  appear,
  spin,
}: {
  size: number;
  tint: string;
  alpha: number;
  appear: SharedValue<number>;
  spin: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ rotate: `${spin.value}deg` }, { scale: 0.55 + appear.value * 0.45 }],
  }));
  const half = size / 2;

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      {Array.from({ length: RAY_COUNT }, (_, index) => {
        const wide = index % 2 === 0;
        const width = size * (wide ? 0.1 : 0.045);
        const colorsFor: Gradient = [withAlpha(tint, 0), withAlpha(tint, wide ? alpha : alpha * 0.55)];
        return (
          <View
            key={index}
            style={{
              position: 'absolute',
              left: half - width / 2,
              top: 0,
              width,
              height: half,
              transformOrigin: 'bottom',
              transform: [{ rotate: `${(360 / RAY_COUNT) * index}deg` }],
            }}
          >
            <LinearGradient
              colors={colorsFor}
              end={{ x: 0.5, y: 1 }}
              start={{ x: 0.5, y: 0 }}
              style={{ flex: 1, borderTopLeftRadius: width, borderTopRightRadius: width }}
            />
          </View>
        );
      })}
    </Animated.View>
  );
}

/* ─── Halo y destello ────────────────────────────────────────────────────── */

export function Halo({ size, tint, level }: { size: number; tint: string; level: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: level.value,
    transform: [{ scale: 0.8 + level.value * 0.25 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: withAlpha(tint, 0.16),
          shadowColor: tint,
          shadowOpacity: 0.9,
          shadowRadius: size / 4,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

/**
 * El reventón: un disco blanco que se abre y se apaga. Sube casi de golpe y se
 * disuelve despacio, que es como se lee un fogonazo.
 */
export function Flash({ size, progress }: { size: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const value = progress.value;
    const opacity = value <= 0 ? 0 : value < 0.12 ? (value / 0.12) * 0.95 : 0.95 * (1 - (value - 0.12) / 0.88);
    return { opacity, transform: [{ scale: 0.3 + value * 2.2 }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: celebrationPalette.light,
          shadowColor: celebrationPalette.light,
          shadowOpacity: 1,
          shadowRadius: size / 3,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

/* ─── Partículas ─────────────────────────────────────────────────────────── */

const RAINBOW = celebrationPalette.rainbow;

function Spark({
  particle,
  clock,
  reach,
  color,
}: {
  particle: Particle;
  clock: SharedValue<number>;
  reach: number;
  color: string;
}) {
  const { angle, delay, distance, duration, size, spin } = particle;
  const style = useAnimatedStyle(() => {
    const local = Math.min(1, Math.max(0, (clock.value - delay) / duration));
    const eased = 1 - Math.pow(1 - local, 3);
    const travelled = distance * reach * eased;
    return {
      opacity: clock.value <= delay ? 0 : 1 - local * local,
      transform: [
        { translateX: Math.cos(angle) * travelled },
        { translateY: Math.sin(angle) * travelled },
        { rotate: `${(angle * 180) / Math.PI + spin * local}deg` },
        { scale: 1 - 0.55 * local },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: -size * 0.9,
          top: -size * 0.35,
          width: size * 1.8,
          height: size * 0.7,
          borderRadius: size,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * Chispas alargadas que salen en radial. Un único reloj compartido mueve las
 * cuarenta: cada una calcula su tramo desde él, sin un valor por partícula ni
 * un solo render de React durante el vuelo.
 */
export function Particles({
  particles,
  clock,
  reach,
  tier,
}: {
  particles: readonly Particle[];
  clock: SharedValue<number>;
  reach: number;
  tier: CardTier;
}) {
  const palette: readonly string[] =
    tier.holo === 'rainbow' ? RAINBOW : [tier.glow, celebrationPalette.light, tier.frame[0]];
  return (
    <View pointerEvents="none" style={{ position: 'absolute', width: 0, height: 0 }}>
      {particles.map((particle, index) => (
        <Spark
          clock={clock}
          color={palette[index % palette.length] ?? tier.glow}
          key={index}
          particle={particle}
          reach={reach}
        />
      ))}
    </View>
  );
}

/* ─── Sello ──────────────────────────────────────────────────────────────── */

/** Cae grande y se clava: la escala baja de 1,6 a 1 con un muelle que rebasa. */
export function Stamp({
  label,
  material,
  progress,
  exit,
}: {
  label: string;
  material: CardMaterial;
  progress: SharedValue<number>;
  exit: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 3) * (1 - exit.value),
    transform: [{ rotate: '-9deg' }, { scale: 1.6 - 0.6 * progress.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -16, right: -22 }, style]}>
      <LinearGradient
        colors={[material.frame[0], material.frame[1]]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{
          borderRadius: radii.full,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderWidth: 2,
          borderColor: celebrationPalette.light,
        }}
      >
        <Text
          allowFontScaling={false}
          style={{ color: celebrationPalette.stampInk, fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.8 }}
        >
          {label}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}
