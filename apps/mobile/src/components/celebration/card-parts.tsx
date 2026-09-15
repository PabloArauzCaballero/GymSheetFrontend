import { Ionicons } from '@expo/vector-icons';
import type { CardTier, Particle } from '@gymsheet/domain';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { CountUpText } from '@/components/motion';
import { withAlpha } from '@/components/progression';
import { fontSizes, radii, semibold, spacing } from '@/theme';
import type { CardScene } from './scene';

/**
 * Las piezas visuales de la carta. Ninguna decide cuándo se mueve: reciben
 * valores compartidos y los traducen a estilo en el hilo de UI. El guion vive
 * en `stage.tsx`; aquí sólo hay forma.
 *
 * Todo es vectorial —degradados, vistas y glifos de fuente—, que es lo que
 * deja escalar y voltear la carta sin que nada se vea pixelado.
 */

type Gradient = readonly [string, string, ...string[]];

/** Superficie interior de las dos caras: casi negra, con un punto de azul frío. */
const FACE_INK = '#0C0D12';

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
          backgroundColor: '#FFFFFF',
          shadowColor: '#FFFFFF',
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

const RAINBOW = ['#FF7AB6', '#FFD84D', '#6BFFB8', '#5CC8FF', '#B98CFF'] as const;

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
    tier.holo === 'rainbow' ? RAINBOW : [tier.glow, '#FFFFFF', tier.frame[0]];
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

/* ─── Brillo holográfico ─────────────────────────────────────────────────── */

function sheenColors(mode: CardTier['holo'], tint: string): Gradient {
  if (mode === 'rainbow') {
    return [
      'rgba(255,255,255,0)',
      'rgba(255,122,182,0.28)',
      'rgba(255,216,77,0.34)',
      'rgba(255,255,255,0.5)',
      'rgba(107,255,184,0.32)',
      'rgba(92,200,255,0.3)',
      'rgba(185,140,255,0.26)',
      'rgba(255,255,255,0)',
    ];
  }
  if (mode === 'soft') {
    return ['rgba(255,255,255,0)', withAlpha(tint, 0.3), 'rgba(255,255,255,0.45)', withAlpha(tint, 0.3), 'rgba(255,255,255,0)'];
  }
  return ['rgba(255,255,255,0)', 'rgba(255,255,255,0.3)', 'rgba(255,255,255,0)'];
}

function HoloSheen({
  width,
  height,
  mode,
  tint,
  sweep,
}: {
  width: number;
  height: number;
  mode: CardTier['holo'];
  tint: string;
  sweep: SharedValue<number>;
}) {
  const band = width * 0.62;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -band * 1.6 + sweep.value * (width + band * 2.2) }, { rotate: '18deg' }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', top: -height * 0.3, height: height * 1.6, width: band }, style]}
    >
      <LinearGradient
        colors={sheenColors(mode, tint)}
        end={{ x: 1, y: 0.5 }}
        start={{ x: 0, y: 0.5 }}
        style={{ flex: 1 }}
      />
    </Animated.View>
  );
}

/* ─── Caras ──────────────────────────────────────────────────────────────── */

const FRAME_PADDING = 5;

function Frame({ tier, children }: { tier: CardTier; children: ReactNode }) {
  return (
    <LinearGradient
      colors={tier.frame}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={{ flex: 1, borderRadius: radii.lg, padding: FRAME_PADDING }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: radii.md,
          backgroundColor: FACE_INK,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

/** Dorso: la marca, un patrón de rombos y el marco de la rareza que se intuye. */
export function CardBack({ width, tier }: { width: number; tier: CardTier }) {
  const medal = width * 0.44;
  return (
    <Frame tier={tier}>
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'space-around',
            alignContent: 'space-around',
            padding: spacing.sm,
          },
        ]}
      >
        {Array.from({ length: 42 }, (_, index) => (
          <View
            key={index}
            style={{
              width: 9,
              height: 9,
              margin: 4,
              borderWidth: 1,
              borderColor: withAlpha(tier.frame[1], 0.2),
              transform: [{ rotate: '45deg' }],
            }}
          />
        ))}
      </View>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          bottom: 8,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: withAlpha(tier.frame[0], 0.28),
        }}
      />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: medal,
            height: medal,
            borderRadius: medal / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: tier.frame[1],
            backgroundColor: withAlpha(tier.frame[2], 0.45),
          }}
        >
          <Ionicons color={tier.frame[0]} name="barbell" size={medal * 0.46} />
        </View>
        <Text
          style={{
            color: withAlpha(tier.frame[0], 0.85),
            fontSize: fontSizes.xs,
            fontWeight: semibold,
            letterSpacing: fontSizes.xs * 0.3,
          }}
        >
          GYMSHEET
        </Text>
      </View>
    </Frame>
  );
}

/** Frente: el arte con el icono, y la banda con rareza, nombre y puntos. */
export function CardFront({
  width,
  height,
  scene,
  sweep,
  pointsDelayMs,
}: {
  width: number;
  height: number;
  scene: CardScene;
  sweep: SharedValue<number>;
  pointsDelayMs: number;
}) {
  const { tier } = scene;
  const disc = width * 0.54;
  return (
    <Frame tier={tier}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient
          colors={[withAlpha(scene.tint, 0.5), withAlpha(scene.tint, 0.04)]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={{
            width: disc,
            height: disc,
            borderRadius: disc / 2,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: withAlpha(scene.tint, 0.75),
            backgroundColor: withAlpha(scene.tint, 0.18),
            shadowColor: scene.tint,
            shadowOpacity: 0.8,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Ionicons color={scene.ink} name={scene.icon} size={disc * 0.5} />
        </View>
      </View>

      <View
        style={{
          alignItems: 'center',
          gap: 2,
          paddingHorizontal: spacing.sm,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm + 2,
          borderTopWidth: 1,
          borderTopColor: withAlpha(tier.frame[1], 0.6),
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      >
        {scene.rarityLabel ? (
          <Text
            style={{
              color: tier.frame[0],
              fontSize: 11,
              fontWeight: semibold,
              letterSpacing: 11 * 0.18,
              textTransform: 'uppercase',
            }}
          >
            {scene.rarityLabel}
          </Text>
        ) : null}
        <Text
          numberOfLines={2}
          style={{ color: '#FFFFFF', fontSize: fontSizes.md, fontWeight: semibold, textAlign: 'center' }}
        >
          {scene.title}
        </Text>
        {scene.points > 0 ? (
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ color: scene.ink, fontSize: fontSizes.sm, fontWeight: semibold }}>+</Text>
            <CountUpText
              delayMs={pointsDelayMs}
              style={{ color: scene.ink, fontSize: fontSizes.sm, fontWeight: semibold, fontVariant: ['tabular-nums'] }}
              value={scene.points}
            />
            <Text style={{ color: scene.ink, fontSize: fontSizes.sm, fontWeight: semibold }}> pts</Text>
          </View>
        ) : null}
      </View>

      <HoloSheen height={height} mode={tier.holo} sweep={sweep} tint={scene.tint} width={width} />
    </Frame>
  );
}

/* ─── Sello ──────────────────────────────────────────────────────────────── */

/** Cae grande y se clava: la escala baja de 1,6 a 1 con un muelle que rebasa. */
export function Stamp({ label, tier, progress }: { label: string; tier: CardTier; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, progress.value * 3),
    transform: [{ rotate: '-9deg' }, { scale: 1.6 - 0.6 * progress.value }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', top: -16, right: -22 }, style]}>
      <LinearGradient
        colors={[tier.frame[0], tier.frame[1]]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={{
          borderRadius: radii.full,
          paddingHorizontal: spacing.md,
          paddingVertical: 6,
          borderWidth: 2,
          borderColor: '#FFFFFF',
        }}
      >
        <Text style={{ color: '#111216', fontSize: fontSizes.sm, fontWeight: '800', letterSpacing: 0.8 }}>
          {label}
        </Text>
      </LinearGradient>
    </Animated.View>
  );
}
