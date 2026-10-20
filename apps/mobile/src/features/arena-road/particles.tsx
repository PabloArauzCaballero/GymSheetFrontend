import { memo, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * Partículas del camino de arenas: chispas que estallan, brasas que suben y
 * ondas expansivas.
 *
 * Todo corre en el hilo de UI y con `transform`/`opacity`: ni un render de
 * React por fotograma. Cada estallido lo mueve **un solo** valor compartido
 * (0 → 1); cada chispa calcula su trayectoria a partir de él con su ángulo y
 * su distancia, así que veinte chispas no son veinte animaciones que se puedan
 * desincronizar.
 *
 * Solo se usan en momentos raros (el desbloqueo, la caída del marcador) o en
 * cantidades pequeñas (una arena a la vez): son el presupuesto de deleite, no
 * decoración permanente.
 */

/** Pseudoaleatorio estable: el mismo estallido sale igual en cada render. */
function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

type Spark = { angle: number; distance: number; size: number; color: string; spin: number; long: boolean };

/**
 * Un estallido de chispas desde un punto. Se monta en la posición del centro
 * (un `View` de tamaño cero) y dispara a los `delay` ms.
 */
export const SparkBurst = memo(function SparkBurst({
  delay,
  count,
  colors,
  minDistance,
  maxDistance,
  duration = 900,
  gravity = 60,
  seed = 7,
}: {
  delay: number;
  count: number;
  colors: readonly string[];
  minDistance: number;
  maxDistance: number;
  duration?: number;
  /** Puntos que cae cada chispa al final: el estallido pesa. */
  gravity?: number;
  seed?: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.cubic) }));
  }, [delay, duration, progress]);

  const sparks = useMemo<Spark[]>(() => {
    const random = seeded(seed);
    return Array.from({ length: count }, (_, index) => ({
      angle: (index / count) * Math.PI * 2 + (random() - 0.5) * 0.5,
      distance: minDistance + random() * (maxDistance - minDistance),
      size: 3 + random() * 5,
      color: colors[index % colors.length] ?? colors[0] ?? '',
      spin: (random() - 0.5) * 540,
      long: random() > 0.55,
    }));
  }, [colors, count, maxDistance, minDistance, seed]);

  return (
    <View pointerEvents="none" style={styles.origin}>
      {sparks.map((spark, index) => (
        <SparkDot gravity={gravity} key={index} progress={progress} spark={spark} />
      ))}
    </View>
  );
});

function SparkDot({ spark, progress, gravity }: { spark: Spark; progress: SharedValue<number>; gravity: number }) {
  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const travel = spark.distance * p;
    return {
      opacity: p <= 0 ? 0 : Math.min(1, (1 - p) * 2.2),
      transform: [
        { translateX: Math.cos(spark.angle) * travel },
        { translateY: Math.sin(spark.angle) * travel + gravity * p * p },
        { rotate: `${(spark.angle * 180) / Math.PI + 90 + spark.spin * p}deg` },
        { scale: 1.2 - p * 0.7 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.spark,
        {
          width: spark.long ? spark.size * 0.6 : spark.size,
          height: spark.long ? spark.size * 2.6 : spark.size,
          borderRadius: spark.size,
          backgroundColor: spark.color,
          shadowColor: spark.color,
        },
        style,
      ]}
    />
  );
}

/**
 * Una onda expansiva: un anillo que crece y se apaga. Se monta centrada en un
 * punto (`View` de tamaño cero).
 */
export const Shockwave = memo(function Shockwave({
  delay,
  color,
  size,
  to = 3.6,
  duration = 650,
  thickness = 3,
}: {
  delay: number;
  color: string;
  size: number;
  to?: number;
  duration?: number;
  thickness?: number;
}) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(delay, withTiming(1, { duration, easing: Easing.out(Easing.quad) }));
  }, [delay, duration, progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value <= 0 ? 0 : 1 - progress.value,
    transform: [{ scale: 0.25 + progress.value * (to - 0.25) }],
  }));
  return (
    <View pointerEvents="none" style={styles.origin}>
      <Animated.View
        style={[
          styles.ring,
          { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, borderRadius: size / 2, borderColor: color, borderWidth: thickness },
          style,
        ]}
      />
    </View>
  );
});

type Ember = { x: number; size: number; color: string; duration: number; offset: number; drift: number };

/**
 * Brasas que suben sin parar dentro de una caja: el aire de la escena. Cada
 * una con su propio ritmo para que no se lean como una fila.
 */
export const Embers = memo(function Embers({
  width,
  height,
  count,
  colors,
  delay = 0,
  seed = 11,
}: {
  width: number;
  height: number;
  count: number;
  colors: readonly string[];
  delay?: number;
  seed?: number;
}) {
  const embers = useMemo<Ember[]>(() => {
    const random = seeded(seed);
    return Array.from({ length: count }, (_, index) => ({
      x: random() * width,
      size: 2 + random() * 3.5,
      color: colors[index % colors.length] ?? colors[0] ?? '',
      duration: 2600 + random() * 2600,
      offset: random() * 2400,
      drift: (random() - 0.5) * 40,
    }));
  }, [colors, count, seed, width]);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {embers.map((ember, index) => (
        <EmberDot delay={delay} ember={ember} height={height} key={index} />
      ))}
    </View>
  );
});

function EmberDot({ ember, height, delay }: { ember: Ember; height: number; delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(
      delay + ember.offset,
      withRepeat(withTiming(1, { duration: ember.duration, easing: Easing.linear }), -1, false),
    );
  }, [delay, ember.duration, ember.offset, t]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.sin(Math.PI * t.value) * 0.9,
    transform: [
      { translateX: ember.x + Math.sin(t.value * Math.PI * 2) * ember.drift * 0.5 },
      { translateY: height - t.value * (height + 20) },
      { scale: 0.6 + Math.sin(Math.PI * t.value) * 0.6 },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.ember,
        { width: ember.size, height: ember.size, borderRadius: ember.size, backgroundColor: ember.color, shadowColor: ember.color },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  origin: {
    position: 'absolute',
    width: 0,
    height: 0,
  },
  spark: {
    position: 'absolute',
    shadowOpacity: 0.9,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  ring: {
    position: 'absolute',
  },
  ember: {
    position: 'absolute',
    left: 0,
    top: 0,
    shadowOpacity: 1,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
});
