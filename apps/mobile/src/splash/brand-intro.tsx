import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { PREMIUM_EASING } from '@/components/motion';
import { colors, getActiveTenant, radii, spacing } from '@/theme';
import {
  BAR_LOADS,
  SPLASH_TIMING,
  barFrame,
  initialClock,
  monogramFrame,
  rulingFrame,
  shouldHandOff,
  wordmarkFrame,
} from './sequence';

/**
 * Medidas de la marca en el arranque, en puntos independientes de densidad.
 *
 * Todo se dibuja con vistas y texto del sistema, sin imágenes: es nítido en
 * cualquier densidad de pantalla y no añade peso al paquete.
 */
const METRICS = {
  /** Lado del recuadro de marca. Doble del de la web (36), misma proporción. */
  tile: 72,
  /** Radio 6 sobre 36 en la web → 12 sobre 72. */
  tileRadius: radii.md * 2,
  monogramSize: 30,
  monogramTracking: -1,
  wordmarkSize: 17,
  wordmarkTracking: 5,
  /** Altura de la ventana por la que sube el nombre; también lo que recorre. */
  wordmarkLine: 24,
  /** Ancho máximo del nombre: una marca más larga se ajusta, no se parte. */
  wordmarkMaxWidth: 260,
  rulingWidth: 148,
  rulingThickness: 1,
  /** Al entregar, la marca sube esto mientras se desvanece. */
  exitLift: 12,
} as const;

const BAR_WIDTH = METRICS.tile / BAR_LOADS.length;

/**
 * Una serie: columna que sube desde la base del recuadro.
 *
 * La base se mantiene fija compensando la escala con un desplazamiento, en vez
 * de depender de `transformOrigin`: son dos transformaciones, las dos en el
 * hilo de interfaz, y se comportan igual en cualquier versión de Android.
 */
function LoadBar({
  clock,
  index,
  color,
}: {
  clock: SharedValue<number>;
  index: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const frame = barFrame(clock.value, index);
    return {
      opacity: frame.opacity,
      transform: [
        { translateY: (METRICS.tile * (1 - frame.scaleY)) / 2 },
        { scaleX: frame.scaleX },
        { scaleY: frame.scaleY },
      ],
    };
  });
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

/**
 * Entrada de marca: lo que se ve entre el splash nativo y la primera pantalla.
 *
 * Se monta encima de la aplicación, no en su lugar: la sesión se restaura y las
 * rutas se resuelven por debajo mientras tanto, así que esta capa no retrasa
 * nada. Su primer cuadro es el fondo liso del splash nativo, sin nada dibujado,
 * de modo que el relevo entre nativo y JavaScript no se nota.
 *
 * La coreografía completa está en `./sequence`; aquí solo se dibuja. Un único
 * reloj corre en el hilo de interfaz y cada pieza deriva de él su `transform` y
 * su `opacity` —nada de diseño animado, sombras ni desenfoques—, así que la
 * secuencia mantiene el ritmo aunque el hilo de JavaScript esté ocupado
 * montando la aplicación.
 */
export function BrandIntro({
  appReady,
  onFirstFrame,
  onDone,
}: {
  /** Hay una primera pantalla lista debajo. */
  appReady: boolean;
  /** El primer cuadro ya está en pantalla: se puede soltar el splash nativo. */
  onFirstFrame: () => void;
  /** La capa se desvaneció del todo y puede desmontarse. */
  onDone: () => void;
}) {
  // La marca se fija al montar: si la sesión restaurada cambia de gimnasio a
  // mitad de la entrada, el recuadro no debe cambiar de color en marcha.
  const [tenant] = useState(getActiveTenant);
  const reduceMotion = useReducedMotion();

  const clock = useSharedValue(initialClock(reduceMotion));
  const exit = useSharedValue(0);

  const [introDone, setIntroDone] = useState(false);
  const [capReached, setCapReached] = useState(false);
  const [exiting, setExiting] = useState(false);
  const started = useRef(false);

  const markIntroDone = useCallback(() => setIntroDone(true), []);

  const start = useCallback(() => {
    if (started.current) return;
    started.current = true;
    onFirstFrame();
    if (reduceMotion) return;
    clock.value = withTiming(
      SPLASH_TIMING.introEnd,
      { duration: SPLASH_TIMING.introEnd, easing: Easing.linear },
      (finished) => {
        if (finished) runOnJS(markIntroDone)();
      },
    );
  }, [clock, markIntroDone, onFirstFrame, reduceMotion]);

  // Con «reducir movimiento» no hay secuencia que esperar: solo una pausa corta
  // con la marca quieta.
  useEffect(() => {
    if (!reduceMotion) return;
    const hold = setTimeout(markIntroDone, SPLASH_TIMING.reducedHold);
    return () => clearTimeout(hold);
  }, [markIntroDone, reduceMotion]);

  useEffect(() => {
    const cap = setTimeout(() => setCapReached(true), SPLASH_TIMING.handoffCap);
    return () => clearTimeout(cap);
  }, []);

  useEffect(() => {
    if (exiting || !shouldHandOff({ introDone, appReady, capReached })) return;
    setExiting(true);
    exit.value = withTiming(
      1,
      {
        duration: reduceMotion ? SPLASH_TIMING.reducedExitDuration : SPLASH_TIMING.exitDuration,
        easing: PREMIUM_EASING,
        // Un fundido de opacidad no es movimiento: se conserva también con
        // «reducir movimiento» para que el relevo no sea un corte seco.
        reduceMotion: ReduceMotion.Never,
      },
      (finished) => {
        if (finished) runOnJS(onDone)();
      },
    );
  }, [appReady, capReached, exit, exiting, introDone, onDone, reduceMotion]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));

  const lockupStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : -METRICS.exitLift * exit.value }],
  }));

  const monogramStyle = useAnimatedStyle(() => {
    const frame = monogramFrame(clock.value);
    return { opacity: frame.opacity, transform: [{ scale: frame.scale }] };
  });

  const wordmarkStyle = useAnimatedStyle(() => {
    const frame = wordmarkFrame(clock.value);
    return {
      opacity: frame.opacity,
      transform: [{ translateY: METRICS.wordmarkLine * frame.sunk }],
    };
  });

  const rulingStyle = useAnimatedStyle(() => {
    const frame = rulingFrame(clock.value);
    return { opacity: frame.opacity, transform: [{ scaleX: frame.scaleX }] };
  });

  return (
    <Animated.View
      accessibilityLabel={tenant.name}
      accessibilityRole="image"
      accessible
      onLayout={start}
      // Mientras se desvanece ya no intercepta toques: la pantalla de debajo
      // responde desde el primer instante en que se ve.
      pointerEvents={exiting ? 'none' : 'auto'}
      style={[styles.overlay, overlayStyle]}
    >
      <Animated.View style={[styles.lockup, lockupStyle]}>
        <View style={styles.tile}>
          {BAR_LOADS.map((_, index) => (
            <LoadBar clock={clock} color={tenant.colors.accent} index={index} key={index} />
          ))}
          <Animated.View style={[styles.monogramLayer, monogramStyle]}>
            <Text
              allowFontScaling={false}
              style={[styles.monogram, { color: tenant.colors.accentContrast }]}
            >
              {tenant.monogram}
            </Text>
          </Animated.View>
        </View>

        <View style={styles.wordmarkWindow}>
          <Animated.View style={wordmarkStyle}>
            <Text
              adjustsFontSizeToFit
              allowFontScaling={false}
              numberOfLines={1}
              style={styles.wordmark}
            >
              {tenant.wordmark}
            </Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.ruling, rulingStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // El mismo valor que `splash.backgroundColor` en app.json (hay una prueba
    // que lo exige): el primer cuadro de JavaScript es el del splash nativo.
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockup: {
    alignItems: 'center',
  },
  tile: {
    width: METRICS.tile,
    height: METRICS.tile,
    borderRadius: METRICS.tileRadius,
    flexDirection: 'row',
    // Recorta las columnas a la forma del recuadro: al cerrarse, el bloque ya
    // tiene las esquinas de la marca sin dibujar una vista más.
    overflow: 'hidden',
  },
  bar: {
    width: BAR_WIDTH,
    height: METRICS.tile,
  },
  monogramLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    fontSize: METRICS.monogramSize,
    fontWeight: '800',
    letterSpacing: METRICS.monogramTracking,
    includeFontPadding: false,
  },
  wordmarkWindow: {
    height: METRICS.wordmarkLine,
    maxWidth: METRICS.wordmarkMaxWidth,
    marginTop: spacing.lg,
    justifyContent: 'center',
    // El nombre sube desde debajo de este borde, que coincide con el renglón.
    overflow: 'hidden',
  },
  wordmark: {
    color: colors.text,
    fontSize: METRICS.wordmarkSize,
    lineHeight: METRICS.wordmarkLine,
    fontWeight: '800',
    letterSpacing: METRICS.wordmarkTracking,
    // El espaciado se añade también tras la última letra; este margen devuelve
    // el nombre a su centro óptico.
    paddingLeft: METRICS.wordmarkTracking,
    textAlign: 'center',
    includeFontPadding: false,
  },
  ruling: {
    width: METRICS.rulingWidth,
    height: METRICS.rulingThickness,
    marginTop: spacing.sm,
    backgroundColor: colors.border,
  },
});
