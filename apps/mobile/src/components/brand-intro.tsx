import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { DURATION, PREMIUM_EASING } from '@/components/motion';
import { accentContrast, accentGradient, colors, fontSizes, useActiveTenant } from '@/theme';

/**
 * La cortinilla de marca del arranque.
 *
 * El hueco que rellena existía y era feo: arrancar la aplicación daba splash
 * nativo → pantalla negra muda (mientras carga la fuente de los iconos) →
 * `ActivityIndicator` genérico (mientras se resuelve la sesión) → pantalla. Tres
 * estados sin identidad, uno detrás de otro, en el momento en que la aplicación
 * tiene toda la atención de quien la abre. Esto convierte esa espera en la
 * presentación de la marca.
 *
 * **Corre *durante* el arranque, no después.** Es la regla que decide todo lo
 * demás: este componente no depende de la fuente de iconos, ni de los
 * proveedores, ni de la sesión — sólo de Reanimated y de `expo-linear-gradient`,
 * que ya están en el paquete nativo desde el primer fotograma. Por eso se monta
 * en la raíz *fuera* de `AppProviders` y se pinta mientras el resto se prepara
 * detrás. La cortinilla no añade tiempo al arranque: ocupa el que ya se perdía.
 *
 * **«Ultra HD» aquí significa vectorial**, igual que en `celebration.tsx`: el
 * emblema es un degradado con tipografía encima, el haz son columnas de
 * degradado giradas y el halo son capas de opacidad. No hay un solo píxel
 * rasterizado, que es justo lo que exige el remate: el zoom final escala el
 * conjunto un 55 %, y un PNG habría llegado ahí hecho una pasta.
 *
 * Las técnicas —haz cenital de listones girados desde `transformOrigin: 'top
 * center'`, barrido blanco inclinado, empuje de cámara— son deliberadamente las
 * mismas que las de la celebración: dos escenas teatrales en la misma
 * aplicación que se movieran distinto se leerían como dos productos.
 */

/* -------------------------------------------------------------------------- */
/* Una sola vez por arranque en frío                                           */
/* -------------------------------------------------------------------------- */

/**
 * El estado vive en el **módulo**, no en un componente ni en almacenamiento.
 *
 * Esa elección es exactamente la condición que pide el encargo. Una variable de
 * módulo se inicializa cuando se evalúa el paquete de JavaScript y muere con él,
 * así que:
 *
 * - **Navegar** no la toca: no hay desmontaje de la raíz.
 * - **Remontar por cambio de inquilino** tampoco: la `key={tenant.id}` de la
 *   raíz destruye el árbol de React, y este valor no está en el árbol.
 * - **Volver de segundo plano** tampoco: iOS y Android suspenden el proceso, no
 *   recargan el paquete, de modo que el módulo sigue cargado y la bandera sigue
 *   en «ya se vio».
 * - Un **arranque en frío** sí la reinicia, porque es la única situación en la
 *   que el paquete se evalúa de nuevo. Que es la definición de lo pedido.
 *
 * Guardarlo en `SecureStore` o en un estado de React habría fallado en uno de
 * los cuatro casos: el almacenamiento persiste entre arranques (no se vería
 * nunca más) y el estado de React no sobrevive al remontaje por inquilino (se
 * vería dos veces al iniciar sesión en un gimnasio de otra marca).
 */
let pending = true;

const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): boolean {
  return pending;
}

function finish(): void {
  if (!pending) return;
  pending = false;
  for (const listener of listeners) listener();
}

/** `true` mientras la cortinilla deba estar en pantalla. */
export function useBrandIntroPending(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/* -------------------------------------------------------------------------- */
/* Cronología                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Todas las duraciones salen de `DURATION` y todas las curvas son
 * `PREMIUM_EASING`. La identidad de movimiento no cambia porque la escena sea la
 * primera: cambia cuántos actos tiene.
 *
 * | t (ms) | Acto                                              |
 * |--------|---------------------------------------------------|
 * | 0      | 1. El haz cenital baja (420 ms)                   |
 * | 340    | 2. El emblema se enciende (280 ms) → 620          |
 * | 520    | 3. El barrido cruza el emblema (420 ms) → 940     |
 * | 730    | 4. El wordmark se revela letra a letra → 1310     |
 * | 1310   |    Reposo legible (190 ms)                        |
 * | 1500   | 5. Empuje de cámara y disolución (420 ms) → 1920  |
 *
 * **Total nominal: 1,92 s**, dentro del objetivo de 1,6–2,2 s.
 */

/** 1. El haz baja. Es lo primero que se ve sobre el fondo casi negro. */
const BEAM_IN = DURATION.slow;
/**
 * 2. El emblema enciende **antes** de que la luz acabe de bajar: la luz *causa*
 * el encendido, y un hueco entre ambos rompería la causalidad.
 */
const IGNITE_AT = DURATION.slow - 80;
const IGNITE_IN = DURATION.standard;
/** 3. El barrido, sobre el emblema ya encendido. */
const SWEEP_AT = IGNITE_AT + DURATION.quick + 40;
const SWEEP_IN = DURATION.slow;
/**
 * 4. El wordmark empieza cuando el barrido va por el centro del emblema: la luz
 * que pasa es lo que «descubre» el nombre.
 */
const WORDMARK_AT = SWEEP_AT + 210;
/**
 * Ventana total del escalonado, **repartida** entre las letras en vez de un
 * retardo fijo por letra. Con un retardo fijo, `GYMSHEET` (8) y `TOP FITNESS`
 * (11) tendrían revelados de duración distinta y la cortinilla duraría más en
 * un gimnasio que en otro. Así el acto dura lo mismo para cualquier marca.
 */
const WORDMARK_WINDOW = 300;
const WORDMARK_IN = DURATION.standard;
/** Un respiro para que la composición se lea antes de irse. */
const SETTLE_HOLD = 190;

const MAIN_TIMELINE = WORDMARK_AT + WORDMARK_WINDOW + WORDMARK_IN + SETTLE_HOLD;

/** 5. El remate. */
const EXIT_IN = DURATION.slow;

/**
 * Techo absoluto de la cortinilla: 2,5 s.
 *
 * Si la sesión no ha resuelto cuando termina la parte animada, la cortinilla
 * **espera** —con el halo respirando, para que no parezca colgada— porque cortar
 * a una pantalla que aún no existe es peor que esperar medio segundo. Pero
 * espera con presupuesto: pasado este margen se va igualmente. La entrega es
 * continua de todos modos, porque lo que hay debajo es el mismo negro del que
 * sale la escena, no un indicador de carga.
 */
const TOTAL_BUDGET = 2500;
const HOLD_CAP = TOTAL_BUDGET - MAIN_TIMELINE - EXIT_IN;

/**
 * Movimiento reducido: la cortinilla **sigue existiendo**, pero ya ha ocurrido.
 *
 * No se salta la marca —quien pide menos movimiento no ha pedido menos
 * identidad—: se salta al estado final y se sostiene lo justo para leerla. Sin
 * haz que baje, sin barrido, sin zoom y sin háptica.
 */
const REDUCED_HOLD = 620;
const REDUCED_EXIT = DURATION.exit;
const REDUCED_HOLD_CAP = 400;

/* -------------------------------------------------------------------------- */
/* Escenario                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Fondo: **casi** negro, no negro.
 *
 * Misma razón que en la celebración: un haz de luz sobre `#000000` no tiene aire
 * que iluminar y el degradado se corta con un borde visible en los paneles
 * OLED. Tres puntos por encima bastan para que la luz parezca atravesar algo, y
 * la diferencia con el `colors.background` de la aplicación es invisible, así
 * que la disolución final no tiene escalón.
 */
const STAGE_BACKGROUND = '#050505';

/** Lado del emblema. */
const EMBLEM = 112;

/**
 * `#rrggbb` → `#rrggbbaa`.
 *
 * Duplica a propósito el `withAlpha` de `progression.tsx` en vez de importarlo.
 * Este componente se pinta en el **primer fotograma del arranque**, y ese import
 * arrastraría todo el grafo de módulos de la progresión —esquemas, iconos,
 * tarjetas— al arranque para usar cuatro líneas. La cortinilla no puede pagar
 * eso: su única obligación es no retrasar nada.
 */
function withAlpha(hex: string, alpha: number): string {
  const clamped = Math.round(Math.min(1, Math.max(0, alpha)) * 255);
  return `${hex}${clamped.toString(16).padStart(2, '0')}`;
}

/**
 * Listones del haz cenital, anclados arriba y girados desde ahí.
 *
 * La técnica es la de `celebration.tsx` y no se reinventa: React Native no
 * dibuja trapecios ni máscaras, así que un cono se construye con columnas de
 * degradado giradas unos grados alrededor de su **borde superior**. Su unión se
 * abre hacia abajo como un haz real y donde se solapan el centro queda más
 * brillante, que es lo que hace la luz volumétrica. El cuarto listón es el
 * derrame: el aire tenue alrededor de los haces, sin el cual éstos parecen
 * columnas recortadas contra el fondo.
 *
 * El derrame mide **170 % del ancho de la pantalla** a propósito. A 78 % —como
 * en la celebración, que se pinta dentro de un modal más pequeño— sus dos
 * cantos verticales caían dentro del cuadro y se veían: dos líneas rectas de
 * arriba abajo que delataban que la «luz» eran rectángulos. Sacándolos fuera de
 * la pantalla el derrame no tiene borde que enseñar.
 */
const BEAM_SLATS: ReadonlyArray<{ angle: number; width: number; alpha: number }> = [
  { angle: -7, width: 0.3, alpha: 0.62 },
  { angle: 0, width: 0.36, alpha: 1 },
  { angle: 7, width: 0.3, alpha: 0.62 },
  { angle: 0, width: 1.7, alpha: 0.26 },
];

/** El degradado se apaga antes de llegar abajo: la luz se disuelve, no se corta. */
const BEAM_LOCATIONS: readonly [number, number, number] = [0, 0.42, 0.86];

/** Opacidad máxima del haz. Es ambiente, no protagonista. */
const BEAM_PEAK = 0.27;

function Beam({ tint }: { tint: string }) {
  return (
    <>
      {BEAM_SLATS.map((slat) => {
        const alpha = BEAM_PEAK * slat.alpha;
        const gradient: readonly [string, string, string] = [
          withAlpha(tint, alpha),
          withAlpha(tint, alpha * 0.4),
          withAlpha(tint, 0),
        ];
        return (
          <View
            key={`${slat.angle}-${slat.width}`}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${50 - (slat.width * 100) / 2}%`,
              width: `${slat.width * 100}%`,
              // Girar desde el borde de arriba convierte columnas paralelas en
              // un haz que se abre: el foco está en el techo y no se mueve.
              transformOrigin: 'top center',
              transform: [{ rotate: `${slat.angle}deg` }],
            }}
          >
            <LinearGradient
              colors={gradient}
              end={{ x: 0.5, y: 1 }}
              locations={BEAM_LOCATIONS}
              start={{ x: 0.5, y: 0 }}
              style={{ flex: 1 }}
            />
          </View>
        );
      })}
    </>
  );
}

/**
 * El halo: anillos concéntricos, **no** un degradado recortado en círculo.
 *
 * El truco de la celebración —un `LinearGradient` vertical dentro de una vista
 * con `borderRadius`— funciona ahí porque el halo es pequeño y va teñido del
 * color de una insignia. A tamaño de cortinilla no: el degradado sólo se apaga
 * de arriba abajo, así que a media altura los flancos del círculo llegan al
 * borde con la opacidad todavía alta y se ve **un disco con contorno** en vez de
 * un charco de luz. En el simulador era lo primero que delataba la escena.
 *
 * Un degradado radial no existe en React Native. Lo que sí se puede es sumarlo:
 * círculos concéntricos con una opacidad muy baja cada uno se acumulan hacia el
 * centro y dan una caída radial real, vectorial y sin una sola textura.
 *
 * El número y la opacidad de los anillos se midieron en el simulador, no se
 * eligieron de memoria: con siete anillos al 5 % los escalones se veían —salían
 * circunferencias concéntricas dibujadas sobre el lima—. A trece anillos al
 * 2,7 % el escalón cae por debajo del umbral en que el ojo lo distingue y el
 * conjunto sigue llegando al centro en torno a 0,30.
 *
 * El exponente del reparto es menor que uno para **apretar los anillos hacia
 * dentro**: así el núcleo acumula más capas por milímetro y el brillo cae rápido
 * al alejarse, que es como se comporta la luz. Un reparto lineal daba un cono
 * plano, no un charco.
 *
 * El brillo apretado contra el emblema no está aquí: lo pone la sombra de iOS
 * (`shadowRadius: 40`), que sí es un desenfoque de verdad.
 */
const HALO_RING_COUNT = 13;
const HALO_RING_ALPHA = 0.027;
const HALO_RINGS: readonly number[] = Array.from({ length: HALO_RING_COUNT }, (_, index) => {
  const t = index / (HALO_RING_COUNT - 1);
  return 2.5 - 1.5 * t ** 0.8;
});

/** Barrido: blanco puro, transparente en los extremos. */
const SWEEP_GRADIENT: readonly [string, string, string] = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.8)',
  'rgba(255,255,255,0)',
];

/** Tracking del wordmark, como fracción del tamaño de letra. */
const WORDMARK_TRACKING = 0.3;

/* -------------------------------------------------------------------------- */
/* La cortinilla                                                               */
/* -------------------------------------------------------------------------- */

export function BrandIntro({ ready }: { ready: boolean }) {
  const tenant = useActiveTenant();
  const reduceMotion = useReducedMotion();

  /** 1. La luz que baja: `scaleY` desde el techo, más opacidad. */
  const beam = useSharedValue(0);
  /** 2. El emblema encendiéndose. */
  const ignite = useSharedValue(0);
  /** 3. El barrido: 0 fuera por la izquierda, 1 fuera por la derecha. */
  const sweep = useSharedValue(0);
  /** 4. El wordmark, una posición por letra. */
  const letters = useSharedValue(0);
  /** Respiración del halo mientras se espera a la sesión. */
  const breathe = useSharedValue(0);
  /** 5. El empuje de cámara y la disolución. */
  const exit = useSharedValue(0);

  /** Se ha consumido la parte animada y sólo falta el remate. */
  const [timelineDone, setTimelineDone] = useState(false);
  /** Se acabó el presupuesto de espera: hay que irse aunque la sesión no esté. */
  const [overBudget, setOverBudget] = useState(false);

  /** Todo temporizador vive aquí para poder morir en el desmontaje. */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* --- Actos 1 a 4 ------------------------------------------------------- */
  useEffect(() => {
    const pendingTimers = timers.current;
    const mainMs = reduceMotion ? REDUCED_HOLD : MAIN_TIMELINE;
    const capMs = reduceMotion ? REDUCED_HOLD_CAP : HOLD_CAP;

    if (reduceMotion) {
      // Al estado final, nunca al inicial. El barrido no se salta al final: se
      // omite entero, porque una banda blanca parada encima del emblema no es
      // un destello, es un defecto de pintado (el `sweep` se queda en 0 y la
      // capa ni se monta).
      beam.value = 1;
      ignite.value = 1;
      letters.value = 1;
    } else {
      beam.value = withTiming(1, { duration: BEAM_IN, easing: PREMIUM_EASING });
      ignite.value = withDelay(
        IGNITE_AT,
        withTiming(1, { duration: IGNITE_IN, easing: PREMIUM_EASING }),
      );
      sweep.value = withDelay(
        SWEEP_AT,
        withTiming(1, { duration: SWEEP_IN, easing: PREMIUM_EASING }),
      );
      letters.value = withDelay(
        WORDMARK_AT,
        withTiming(1, { duration: WORDMARK_WINDOW + WORDMARK_IN, easing: PREMIUM_EASING }),
      );

      // Dos golpes en dos segundos, atados a los dos instantes que el ojo ya
      // está mirando: el encendido de la marca y el empuje de cámara. Más sería
      // ruido; ninguno dejaría la escena sin cuerpo.
      pendingTimers.push(
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, IGNITE_AT + IGNITE_IN),
      );
      pendingTimers.push(
        setTimeout(() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, MAIN_TIMELINE),
      );
    }

    pendingTimers.push(setTimeout(() => setTimelineDone(true), mainMs));
    pendingTimers.push(setTimeout(() => setOverBudget(true), mainMs + capMs));

    return () => {
      cancelAnimation(beam);
      cancelAnimation(ignite);
      cancelAnimation(sweep);
      cancelAnimation(letters);
      pendingTimers.forEach(clearTimeout);
      pendingTimers.length = 0;
    };
  }, [beam, ignite, letters, reduceMotion, sweep]);

  /* --- La espera, si la sesión aún no está ------------------------------- */
  useEffect(() => {
    // Respirar, no congelarse. Es la diferencia entre «la aplicación está
    // arrancando» y «la aplicación se ha quedado colgada», y cuesta una
    // interpolación de opacidad.
    if (reduceMotion || !timelineDone || ready) return;
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: PREMIUM_EASING }),
        withTiming(0, { duration: 900, easing: PREMIUM_EASING }),
      ),
      -1,
      false,
    );
    return () => {
      cancelAnimation(breathe);
      // Se apaga con una curva, no de golpe: al llegar la sesión la respiración
      // se corta y el remate arranca en el mismo fotograma, y un salto de
      // opacidad del halo justo ahí se ve como un parpadeo.
      breathe.value = withTiming(0, { duration: DURATION.exit, easing: PREMIUM_EASING });
    };
  }, [breathe, ready, reduceMotion, timelineDone]);

  /* --- Acto 5: el remate -------------------------------------------------- */

  /**
   * La condición de salida, **derivada y monótona**, no leída suelta dentro del
   * efecto.
   *
   * La diferencia importa y estuvo a punto de costar un defecto de los que dejan
   * la aplicación inutilizable. Con `ready` y `overBudget` en las dependencias,
   * esta secuencia bloqueaba el arranque: se agota el presupuesto → arranca el
   * remate → la sesión resuelve medio segundo después → el efecto se reevalúa →
   * su limpieza **cancela el remate a medias** → y la guarda de «una sola vez»
   * impide relanzarlo. Resultado: la cortinilla congelada encima de la
   * aplicación, para siempre.
   *
   * Con la condición reducida a un booleano que sólo puede ir de falso a
   * verdadero —`timelineDone` no vuelve atrás, `ready` tampoco y `overBudget`
   * tampoco—, React no reejecuta nada cuando cambia la parte que ya no decide
   * nada, y la limpieza queda donde debe estar: sólo en el desmontaje.
   */
  const shouldExit = timelineDone && (ready || overBudget);

  useEffect(() => {
    // Se sale cuando la aplicación está lista **o** cuando se agota el
    // presupuesto. Lo primero es lo normal: la sesión suele resolver antes de
    // que acabe la animación, y entonces el remate encadena sin pausa.
    if (!shouldExit) return;

    exit.value = withTiming(
      1,
      { duration: reduceMotion ? REDUCED_EXIT : EXIT_IN, easing: PREMIUM_EASING },
      (finished) => {
        // `cancelAnimation` en el desmontaje también invoca esto, con
        // `finished` en falso: sin la guarda se retiraría la cortinilla desde un
        // árbol que ya no existe.
        if (finished === true) runOnJS(finish)();
      },
    );

    return () => {
      cancelAnimation(exit);
    };
  }, [exit, reduceMotion, shouldExit]);

  /* --- Accesibilidad ------------------------------------------------------ */
  useEffect(() => {
    // Se anuncia el nombre de la aplicación una vez y se deja pasar: la
    // cortinilla no ofrece nada que tocar, así que está oculta al lector de
    // pantalla (más abajo) y el foco cae en la pantalla real que hay debajo.
    // Con un respiro, porque anunciar en el mismo fotograma del montaje compite
    // con el propio cambio de foco del sistema y el mensaje se pierde.
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(tenant.name);
    }, 250);
    return () => clearTimeout(timer);
  }, [tenant.name]);

  /* --- Estilos ------------------------------------------------------------ */

  const stageStyle = useAnimatedStyle(() => ({
    // La opacidad aguanta el primer tercio del empuje y luego cae: lo que se ve
    // es la cámara entrando *y después* la marca disolviéndose, no las dos cosas
    // a la vez, que se leería como un simple fundido.
    opacity: interpolate(exit.value, [0, 0.35, 1], [1, 0.92, 0]),
  }));

  const beamStyle = useAnimatedStyle(() => ({
    opacity: beam.value * (1 - exit.value),
    transform: [{ scaleY: beam.value }],
  }));

  /**
   * El empuje de cámara: el conjunto entero crece hacia el espectador.
   *
   * Un 55 % es suficiente para que se lea como un acercamiento y poco bastante
   * para que el emblema no desborde la pantalla antes de desvanecerse. Todo lo
   * que crece aquí es tipografía y degradados, así que el filo se mantiene a
   * cualquier escala.
   */
  const cameraStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + exit.value * 0.55 }],
  }));

  const emblemStyle = useAnimatedStyle(() => ({
    opacity: ignite.value,
    // Entra ligeramente pequeño: el objeto llega hacia el espectador, no
    // aparece de la nada.
    transform: [{ scale: 0.88 + ignite.value * 0.12 + breathe.value * 0.012 }],
  }));

  const haloStyle = useAnimatedStyle(() => ({
    // El charco se abre más que el emblema al encenderse: la luz llega antes
    // que el objeto, que es lo que da profundidad en vez de un aro plano.
    opacity: ignite.value * (0.82 + breathe.value * 0.18),
    transform: [{ scale: 0.7 + ignite.value * 0.3 + breathe.value * 0.045 }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-EMBLEM * 1.35, EMBLEM * 1.35]) },
      // Inclinado: un destello perpendicular parece una persiana; inclinado
      // parece luz resbalando sobre una superficie.
      { rotate: '18deg' },
    ],
  }));

  const tint = colors.volt;
  const gradient = accentGradient();
  const ink = accentContrast();

  const wordmarkSize = fontSizes.lg;
  const tracking = wordmarkSize * WORDMARK_TRACKING;
  const glyphs = [...tenant.wordmark];

  return (
    <Animated.View
      // Oculta al lector de pantalla a propósito: no hay controles, y una capa a
      // pantalla completa que sí se anunciara atraparía el foco durante dos
      // segundos sin llevar a ninguna parte. El nombre se anuncia una vez, más
      // arriba, y el foco se queda en la pantalla real.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        StyleSheet.absoluteFill,
        { backgroundColor: STAGE_BACKGROUND, alignItems: 'center', justifyContent: 'center' },
        stageStyle,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          // El haz cae desde el borde superior: el foco está en el techo, fuera
          // de cuadro.
          { transformOrigin: 'top center' },
          beamStyle,
        ]}
      >
        <Beam tint={tint} />
      </Animated.View>

      <Animated.View style={[{ alignItems: 'center' }, cameraStyle]}>
        <Animated.View style={[{ alignItems: 'center', justifyContent: 'center' }, emblemStyle]}>
          {/* El charco de luz en el que está la marca. Un único grupo animado:
              dos objetos de `useAnimatedStyle` colgados de vistas hermanas
              comparten descriptores en Reanimated y son fuente conocida de
              rarezas. */}
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
              haloStyle,
            ]}
          >
            {HALO_RINGS.map((ring) => (
              <View
                key={ring}
                style={{
                  position: 'absolute',
                  width: EMBLEM * ring,
                  height: EMBLEM * ring,
                  borderRadius: (EMBLEM * ring) / 2,
                  backgroundColor: withAlpha(tint, HALO_RING_ALPHA),
                }}
              />
            ))}
          </Animated.View>

          {/* La sombra va en su propia capa: en la misma vista que el
              `overflow: hidden` del recorte, iOS la recorta con el contenido y
              Android no la dibuja en absoluto. */}
          <View
            style={{
              borderRadius: EMBLEM * 0.26,
              shadowColor: tint,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.75,
              // Radio ancho, sin borde duro: es lo que separa un objeto
              // iluminado de una calcomanía con contorno.
              shadowRadius: 40,
              elevation: 22,
            }}
          >
            <View
              style={{
                width: EMBLEM,
                height: EMBLEM,
                borderRadius: EMBLEM * 0.26,
                alignItems: 'center',
                justifyContent: 'center',
                // Recorta el barrido a la silueta del emblema.
                overflow: 'hidden',
              }}
            >
              {/* El relleno de marca, con su degradado declarado por inquilino:
                  el verde de GymSheet o el rojo de TOP Fitness, sin una sola
                  línea que sepa cuál de los dos es. */}
              <LinearGradient
                colors={gradient}
                end={{ x: 1, y: 1 }}
                start={{ x: 0, y: 0 }}
                style={StyleSheet.absoluteFill}
              />

              {/* El monograma. **Tipografía, no imagen**: es lo que permite que
                  el zoom final lo agrande un 55 % sin un solo borde dentado.
                  Va en `accentContrast()` porque está *encima* del relleno, que
                  es exactamente el caso que ese token resuelve — el negro sobre
                  el lima y el blanco sobre el rojo. */}
              <Text
                style={{
                  color: ink,
                  fontSize: EMBLEM * 0.46,
                  fontWeight: '800',
                  // Tracking negativo: dos letras sueltas leen como dos letras;
                  // apretadas leen como un monograma.
                  letterSpacing: -EMBLEM * 0.02,
                  includeFontPadding: false,
                }}
              >
                {tenant.monogram}
              </Text>

              {/* El destello que recorre el emblema. El momento reconocible. */}
              {reduceMotion ? null : (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    { position: 'absolute', top: -EMBLEM, bottom: -EMBLEM, width: EMBLEM * 0.46 },
                    sweepStyle,
                  ]}
                >
                  <LinearGradient
                    colors={SWEEP_GRADIENT}
                    end={{ x: 1, y: 0.5 }}
                    start={{ x: 0, y: 0.5 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* El wordmark, letra a letra. Blanco y no el acento: el emblema ya
            lleva el color de la marca, y repetirlo aquí saturaría la
            composición en vez de rematarla. */}
        <View
          style={{
            flexDirection: 'row',
            marginTop: EMBLEM * 0.42,
            // El tracking deja aire sobrante a la derecha de la última letra;
            // se compensa para que el conjunto quede centrado de verdad.
            marginLeft: tracking,
          }}
        >
          {glyphs.map((glyph, index) => (
            <Letter
              key={`${glyph}-${index}`}
              glyph={glyph}
              index={index}
              progress={letters}
              size={wordmarkSize}
              total={glyphs.length}
              tracking={tracking}
            />
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/**
 * Una letra del wordmark.
 *
 * Cada una es su propia vista animada porque el escalonado es lo que hace que el
 * nombre se «revele» en vez de aparecer: el ojo sigue la luz del barrido de
 * izquierda a derecha y las letras van encendiéndose a su paso.
 *
 * El reparto se calcula sobre `total`, no con un retardo fijo: ver
 * `WORDMARK_WINDOW`.
 */
function Letter({
  glyph,
  index,
  progress,
  size,
  total,
  tracking,
}: {
  glyph: string;
  index: number;
  progress: Animated.SharedValue<number>;
  size: number;
  total: number;
  tracking: number;
}) {
  // Fracción del progreso en la que arranca esta letra y en la que termina. El
  // último tramo (`WORDMARK_IN`) es lo que cada letra tarda en resolverse, y es
  // igual para todas.
  const span = WORDMARK_WINDOW + WORDMARK_IN;
  const from = ((index / Math.max(1, total - 1)) * WORDMARK_WINDOW) / span;
  const to = from + WORDMARK_IN / span;

  const style = useAnimatedStyle(() => {
    const local = interpolate(progress.value, [from, to], [0, 1], 'clamp');
    return {
      opacity: local,
      // Sube 10 pt: el mismo patrón de entrada del proyecto (elevarse y fundir),
      // sólo que a escala de letra.
      transform: [{ translateY: (1 - local) * 10 }],
    };
  });

  // Un espacio no se anima: se reserva su ancho. Un `<Text>` con un único
  // espacio y tracking se comporta distinto en cada plataforma, y lo que se
  // necesita aquí es simplemente un hueco.
  if (glyph === ' ') return <View style={{ width: size * 0.42 + tracking }} />;

  return (
    <Animated.View style={style}>
      <Text
        style={{
          color: colors.text,
          fontSize: size,
          fontWeight: '600',
          marginRight: tracking,
          includeFontPadding: false,
        }}
      >
        {glyph}
      </Text>
    </Animated.View>
  );
}
