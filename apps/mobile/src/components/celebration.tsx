import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BadgeRarity, ProgressionBadge, ProgressionLevel } from '@gymsheet/schemas';
import { DURATION, PREMIUM_EASING } from '@/components/motion';
import { withAlpha } from '@/components/progression';
import {
  accentPolicy,
  colors,
  fontSizes,
  iconSizes,
  minTouchTarget,
  radii,
  semibold,
  spacing,
} from '@/theme';

/**
 * La celebración: luz cenital, brillo, botes y empuje de cámara.
 *
 * Es la única pieza de la aplicación que se permite ser teatral, y lo es por
 * una razón concreta: conseguir una insignia o subir de rango es el único
 * momento en el que la aplicación tiene algo que *dar*, y una línea de texto
 * nueva en una lista no se lee como un premio. El resto de la app sigue siendo
 * contenida; esto es la excepción declarada, no una licencia general.
 *
 * **Se dispara al pulsar, nunca sola.** Un modal que salta encima de lo que
 * estabas haciendo interrumpe; uno que espera a que lo toques es un regalo que
 * se abre cuando uno quiere. Por eso la pantalla marca lo que es pulsable y la
 * celebración no aparece hasta que alguien decide verla.
 *
 * **«Ultra HD» aquí significa vectorial.** No hay un solo píxel rasterizado: la
 * luz y el halo son degradados con capas de opacidad, el emblema es un icono de
 * fuente y las sombras usan un `shadowRadius` ancho en vez de bordes duros. Lo
 * que se escala por encima de 1 —hasta 2,6×— es tipografía e iconos, que no
 * pierden filo; una imagen habría llegado ahí hecha una pasta.
 */

/** Lo que se celebra. Dos casos, y sólo dos. */
export type CelebrationSubject =
  | { kind: 'badge'; badge: ProgressionBadge }
  | { kind: 'level'; level: ProgressionLevel };

/**
 * Fondo del escenario: **casi** negro, no negro.
 *
 * El lienzo de la app es `#000000` puro. Un haz de luz sobre negro puro no
 * tiene dónde apoyarse —no hay aire que iluminar— y el degradado se corta con
 * un borde visible en los paneles OLED. Tres puntos por encima del negro bastan
 * para que la luz parezca atravesar algo.
 */
const STAGE_BACKGROUND = '#050505';

/** Lado del emblema. El icono ocupa la mitad; el resto es aire. */
const EMBLEM = 128;

/**
 * Escala en la que el empuje de cámara se queda.
 *
 * El empuje llega hasta 1,9-2,6× según la rareza y **vuelve** aquí. Terminar en
 * el pico dejaría el emblema tapando la pantalla justo cuando entra el texto;
 * volver del todo a 1 tiraría por tierra el remate. 1,22 es la composición
 * final: el objeto sigue siendo más grande de lo que era y hay sitio debajo.
 */
const SETTLE_SCALE = 1.22;

/** Cada bote sube un 58 % de lo que subió el anterior. */
const HOP_DECAY = 0.58;

/* -------------------------------------------------------------------------- */
/* Cronología                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Todas las duraciones salen de la paleta del proyecto (`DURATION`) y todas las
 * curvas son `PREMIUM_EASING`. La identidad de movimiento no cambia porque la
 * escena sea más larga: lo que cambia es cuántos actos tiene.
 */

/** 1. La luz baja. Es lo primero que se ve, sobre el fondo casi negro. */
const BEAM_IN = DURATION.slow;
/** 2. El objeto se enciende. Empieza antes de que la luz acabe de bajar: la luz *causa* el brillo, y un hueco entre ambos rompería la causalidad. */
const GLOW_AT = DURATION.slow - 80;
const GLOW_IN = DURATION.standard;
/** 2b. El barrido cruza el objeto, ya encendido. */
const SWEEP_AT = GLOW_AT + DURATION.quick;
const SWEEP_IN = DURATION.slow + DURATION.standard;
/** 3. Los botes, cuando el barrido ya ha salido por el otro lado. */
const BOUNCE_AT = SWEEP_AT + DURATION.standard;
/** Subida y caída de un bote. La subida dura más: lo que se ve es la suspensión en el aire. */
const HOP_UP = DURATION.quick + 40;
const HOP_DOWN = DURATION.quick;
/** Lo que tarda el muelle del aterrizaje en asentarse, para poder encadenar lo siguiente. */
const LANDING_MS = 320;
/** 4. El empuje de cámara. */
const ZOOM_IN = DURATION.slow + 100;
/** 5. El texto, cuando el empuje ya vuelve. */
const TEXT_AFTER_ZOOM = DURATION.slow;
const TEXT_STAGGER = 90;

/**
 * Muelle del aterrizaje.
 *
 * Deliberadamente **sin** `overshootClamping`, al revés que el muelle de
 * pulsación del proyecto: aquí el rebasamiento es el efecto, no el defecto. Un
 * objeto que cae y se para en seco no pesa nada; uno que se hunde un instante
 * bajo su propia inercia y vuelve, sí.
 */
const LANDING_SPRING = { damping: 11, stiffness: 210, mass: 0.8 } as const;

/** Muelle del retroceso de cámara: firme, sin rebote, la cámara no es elástica. */
const CAMERA_SPRING = { damping: 24, stiffness: 180, mass: 0.9, overshootClamping: true } as const;

/* -------------------------------------------------------------------------- */
/* Escala de rareza                                                            */
/* -------------------------------------------------------------------------- */

interface CelebrationTier {
  /** Número de botes. Una legendaria bota el doble que una común. */
  hops: number;
  /** Altura del primer bote, en puntos; los siguientes decrecen. */
  hopHeight: number;
  /** Opacidad máxima del halo. */
  glow: number;
  /** Opacidad máxima de la luz cenital. */
  beam: number;
  /** Pico del empuje de cámara. */
  zoom: number;
  /** Golpe háptico de cada aterrizaje. */
  impact: Haptics.ImpactFeedbackStyle;
}

/**
 * La rareza se nota, y se nota en las cuatro dimensiones a la vez: **más luz,
 * más botes, más halo y más empuje**. Subir sólo una —por ejemplo el brillo—
 * habría dado cuatro celebraciones que se parecen demasiado entre sí.
 *
 * | Rareza     | Botes | Altura | Halo | Luz  | Zoom |
 * |------------|-------|--------|------|------|------|
 * | COMUN      | 2     | 16     | 0,38 | 0,22 | 1,9× |
 * | RARA       | 2     | 22     | 0,50 | 0,30 | 2,1× |
 * | EPICA      | 3     | 28     | 0,66 | 0,40 | 2,35×|
 * | LEGENDARIA | 4     | 34     | 0,82 | 0,52 | 2,6× |
 *
 * La escala no es lineal por arriba a propósito: entre común y rara la
 * diferencia es de grado, y entre épica y legendaria es de categoría. El salto
 * de 3 a 4 botes es lo que hace que una legendaria se recuerde.
 */
const RARITY_TIERS: Record<BadgeRarity, CelebrationTier> = {
  COMUN: {
    hops: 2,
    hopHeight: 16,
    glow: 0.38,
    beam: 0.22,
    zoom: 1.9,
    impact: Haptics.ImpactFeedbackStyle.Light,
  },
  RARA: {
    hops: 2,
    hopHeight: 22,
    glow: 0.5,
    beam: 0.3,
    zoom: 2.1,
    impact: Haptics.ImpactFeedbackStyle.Light,
  },
  EPICA: {
    hops: 3,
    hopHeight: 28,
    glow: 0.66,
    beam: 0.4,
    zoom: 2.35,
    impact: Haptics.ImpactFeedbackStyle.Medium,
  },
  LEGENDARIA: {
    hops: 4,
    hopHeight: 34,
    glow: 0.82,
    beam: 0.52,
    zoom: 2.6,
    impact: Haptics.ImpactFeedbackStyle.Heavy,
  },
};

const RARITY_LABEL: Record<BadgeRarity, string> = {
  COMUN: 'Común',
  RARA: 'Rara',
  EPICA: 'Épica',
  LEGENDARIA: 'Legendaria',
};

/**
 * Subir de rango se celebra **siempre** al nivel de una legendaria.
 *
 * No hay una rareza que consultar —el catálogo de niveles no la tiene— y
 * tampoco hace falta: un rango se cruza ocho veces en la vida de una cuenta y
 * una insignia común se consigue la primera semana.
 */
const LEVEL_TIER = RARITY_TIERS.LEGENDARIA;

/**
 * Lo que hay que pintar, resuelto una sola vez desde el sujeto.
 *
 * Existe para que el resto del componente no vuelva a preguntar «¿es insignia o
 * es nivel?» en cada línea: esa pregunta se contesta aquí y abajo sólo hay una
 * escena.
 */
interface Scene {
  tier: CelebrationTier;
  /** El color de la **luz**: haz, halo y borde del emblema. */
  tint: string;
  /** El color del **icono** dentro del emblema. */
  ink: string;
  /** El color del antetítulo. */
  eyebrowColor: string;
  eyebrow: string;
  title: string;
  flavor: string;
  icon: keyof typeof Ionicons.glyphMap;
  /** Lo que se anuncia a un lector de pantalla al abrirse. */
  announcement: string;
}

function sceneOf(subject: CelebrationSubject): Scene {
  if (subject.kind === 'badge') {
    const { badge } = subject;
    const rarity = RARITY_LABEL[badge.rarity];
    const flavor = badge.flavorText ?? badge.description;
    return {
      tier: RARITY_TIERS[badge.rarity],
      // El color del catálogo es el de la insignia: es lo que la distingue de
      // las otras treinta, y apagarlo aquí sería celebrar todas igual.
      tint: badge.color,
      ink: badge.color,
      eyebrowColor: badge.color,
      eyebrow: `Insignia conseguida · ${rarity}`,
      title: badge.name,
      flavor,
      icon: badge.icon as keyof typeof Ionicons.glyphMap,
      announcement: `Insignia conseguida. ${badge.name}. Rareza ${rarity}. ${flavor}`,
    };
  }

  const { level } = subject;
  return {
    tier: LEVEL_TIER,
    /**
     * Acento del gimnasio, **no** `level.color`.
     *
     * Es la misma decisión que ya documenta `RankHero`, y por el mismo motivo:
     * la rampa de ocho tonos del catálogo de niveles se escribió en el backend
     * sin saber que habría inquilinos, así que celebrar un ascenso con ella
     * metía un azul `#5aa9e6` a pantalla completa en un gimnasio de marca roja.
     * La rampa sigue significando algo donde los niveles se comparan entre sí
     * —la lista de hitos—, y aquí sólo hay uno.
     */
    tint: colors.volt,
    // Relleno → `colors.volt`; icono fino sobre superficie oscura →
    // `accentPolicy.ink`. El acento puro como tinta se queda por debajo de AA
    // en la marca roja.
    ink: accentPolicy.ink,
    eyebrowColor: accentPolicy.ink,
    eyebrow: 'Nuevo rango',
    title: level.name,
    flavor: level.tagline,
    icon: level.icon as keyof typeof Ionicons.glyphMap,
    announcement: `Has subido de rango. Ahora eres ${level.name}. ${level.tagline}`,
  };
}

/** Identidad del sujeto: remonta el escenario para que la escena vuelva a empezar. */
function keyOf(subject: CelebrationSubject): string {
  return subject.kind === 'badge' ? `badge:${subject.badge.code}` : `level:${subject.level.code}`;
}

/* -------------------------------------------------------------------------- */
/* La luz cenital                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Listones del haz, anclados arriba y girados desde ahí.
 *
 * Un cono que se abre hacia abajo no se dibuja en React Native: no hay
 * trapecios, no hay máscaras y una pila de rectángulos de anchura creciente se
 * ve escalonada. Lo que sí se dibuja es esto — tres columnas de degradado
 * giradas unos grados alrededor de su **borde superior** (`transformOrigin`).
 * Su unión se abre hacia abajo como un haz real, y donde se solapan el centro
 * queda más brillante, que es exactamente lo que hace la luz volumétrica. Todo
 * vectorial: ni un píxel que estirar.
 *
 * El cuarto listón es el derrame: muy ancho y muy tenue, lo que evita que el
 * haz parezca recortado contra el fondo.
 */
const BEAM_SLATS: ReadonlyArray<{ angle: number; width: number; alpha: number }> = [
  { angle: -7, width: 0.3, alpha: 0.62 },
  { angle: 0, width: 0.36, alpha: 1 },
  { angle: 7, width: 0.3, alpha: 0.62 },
  { angle: 0, width: 0.78, alpha: 0.3 },
];

/** El degradado se apaga antes de llegar abajo: la luz se disuelve, no se corta. */
const BEAM_LOCATIONS: readonly [number, number, number] = [0, 0.42, 0.86];

function Beam({ tint, tier }: { tint: string; tier: CelebrationTier }) {
  return (
    <>
      {BEAM_SLATS.map((slat) => {
        const alpha = tier.beam * slat.alpha;
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
              // Girar desde el borde de arriba es lo que convierte tres
              // columnas paralelas en un haz que se abre: el foco está en el
              // techo y no se mueve.
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

/* -------------------------------------------------------------------------- */
/* El escenario                                                                */
/* -------------------------------------------------------------------------- */

/** Barrido: blanco puro, transparente en los extremos. El destello que cruza el logo. */
const SWEEP_GRADIENT: readonly [string, string, string] = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.75)',
  'rgba(255,255,255,0)',
];

function CelebrationStage({
  subject,
  onClose,
}: {
  subject: CelebrationSubject;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const scene = sceneOf(subject);
  const { tier } = scene;

  /** 1. La luz que baja: `scaleY` desde el techo, más opacidad. */
  const beam = useSharedValue(0);
  /** El ambiente entero, que se apaga durante el empuje de cámara. */
  const ambient = useSharedValue(1);
  /** 2. El halo que enciende el objeto. */
  const glow = useSharedValue(0);
  /** 2b. El barrido, de 0 (fuera por la izquierda) a 1 (fuera por la derecha). */
  const sweep = useSharedValue(0);
  /** 3. Los botes. */
  const hop = useSharedValue(0);
  /** 4. El empuje de cámara. */
  const zoom = useSharedValue(1);
  /** 5. El texto, escalonado. */
  const titleIn = useSharedValue(0);
  const flavorIn = useSharedValue(0);

  /** Todo temporizador vive aquí para poder morir en el desmontaje. */
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const pending = timers.current;

    /**
     * Movimiento reducido: **al estado final, nunca al inicial**.
     *
     * La celebración sigue existiendo —se abre, el objeto está iluminado bajo
     * su luz y el texto se lee—, sólo que ya ha ocurrido. Lo único que
     * desaparece es el barrido: una banda blanca parada encima del emblema no
     * es un destello, es un defecto de pintado. La háptica también se omite:
     * el motor es movimiento, y quien pide menos movimiento no ha pedido que
     * el teléfono le golpee la mano cuatro veces.
     */
    if (reduceMotion) {
      beam.value = 1;
      glow.value = 1;
      zoom.value = 1;
      titleIn.value = 1;
      flavorIn.value = 1;
      return;
    }

    beam.value = withTiming(1, { duration: BEAM_IN, easing: PREMIUM_EASING });
    glow.value = withDelay(GLOW_AT, withTiming(1, { duration: GLOW_IN, easing: PREMIUM_EASING }));
    sweep.value = withDelay(
      SWEEP_AT,
      withTiming(1, { duration: SWEEP_IN, easing: PREMIUM_EASING }),
    );

    // Botes de amplitud decreciente. El último descenso es un muelle en vez de
    // una curva: dos botes con la misma caída exacta suenan a metrónomo, y lo
    // que se busca es un objeto con peso aterrizando.
    const heights = Array.from({ length: tier.hops }, (_, i) => tier.hopHeight * HOP_DECAY ** i);
    const steps: number[] = [];
    heights.forEach((height, index) => {
      steps.push(withTiming(-height, { duration: HOP_UP, easing: PREMIUM_EASING }));
      if (index < heights.length - 1) {
        steps.push(withTiming(0, { duration: HOP_DOWN, easing: PREMIUM_EASING }));
      }
    });
    steps.push(withSpring(0, LANDING_SPRING));
    hop.value = withDelay(BOUNCE_AT, withSequence(...steps));

    const bounceMs =
      heights.length * HOP_UP + (heights.length - 1) * HOP_DOWN + LANDING_MS;
    const zoomAt = BOUNCE_AT + bounceMs;

    // El remate: la cámara entra hasta el pico de la rareza y retrocede a la
    // composición final. Quedarse en el pico taparía el texto que viene detrás.
    zoom.value = withDelay(
      zoomAt,
      withSequence(
        withTiming(tier.zoom, { duration: ZOOM_IN, easing: PREMIUM_EASING }),
        withSpring(SETTLE_SCALE, CAMERA_SPRING),
      ),
    );
    // ...y mientras entra, el resto se desvanece. No a cero: un ambiente que
    // desaparece del todo deja el objeto flotando en el vacío.
    ambient.value = withDelay(
      zoomAt,
      withTiming(0.18, { duration: ZOOM_IN, easing: PREMIUM_EASING }),
    );

    const textAt = zoomAt + TEXT_AFTER_ZOOM;
    titleIn.value = withDelay(
      textAt,
      withTiming(1, { duration: DURATION.standard, easing: PREMIUM_EASING }),
    );
    flavorIn.value = withDelay(
      textAt + TEXT_STAGGER,
      withTiming(1, { duration: DURATION.standard, easing: PREMIUM_EASING }),
    );

    // Háptica atada a la escena, no a la apertura: un golpe por aterrizaje
    // —que es cuando el ojo espera sentir algo— y el acorde de éxito en el
    // instante del empuje de cámara.
    heights.forEach((_, index) => {
      const landingAt = BOUNCE_AT + (index + 1) * HOP_UP + index * HOP_DOWN;
      pending.push(
        setTimeout(() => {
          void Haptics.impactAsync(tier.impact);
        }, landingAt),
      );
    });
    pending.push(
      setTimeout(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, zoomAt),
    );

    return () => {
      cancelAnimation(beam);
      cancelAnimation(ambient);
      cancelAnimation(glow);
      cancelAnimation(sweep);
      cancelAnimation(hop);
      cancelAnimation(zoom);
      cancelAnimation(titleIn);
      cancelAnimation(flavorIn);
      pending.forEach(clearTimeout);
      pending.length = 0;
    };
  }, [ambient, beam, flavorIn, glow, hop, reduceMotion, sweep, tier, titleIn, zoom]);

  /**
   * Una celebración visual no existe para quien no la ve, así que se cuenta.
   *
   * Con un respiro: anunciar en el mismo fotograma en que se presenta el modal
   * compite con el propio cambio de foco del sistema y el mensaje se pierde.
   */
  useEffect(() => {
    const pending = timers.current;
    const timer = setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(scene.announcement);
    }, 350);
    pending.push(timer);
    return () => {
      clearTimeout(timer);
    };
  }, [scene.announcement]);

  const beamStyle = useAnimatedStyle(() => ({
    opacity: beam.value * ambient.value,
    transform: [{ scaleY: beam.value }],
  }));

  /**
   * Dos halos, dos estilos.
   *
   * No es duplicación por descuido: un mismo objeto de `useAnimatedStyle`
   * colgado de dos vistas comparte descriptores en Reanimated y es una fuente
   * conocida de rarezas. Además les conviene crecer distinto — el charco
   * exterior se abre más que el borde pegado al objeto, que es lo que da
   * profundidad en vez de un aro plano.
   */
  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.value * tier.glow,
    transform: [{ scale: 0.66 + glow.value * 0.34 }],
  }));

  const haloInnerStyle = useAnimatedStyle(() => ({
    opacity: glow.value * tier.glow,
    transform: [{ scale: 0.84 + glow.value * 0.16 }],
  }));

  const emblemStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: hop.value }, { scale: zoom.value }],
  }));

  const sweepStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(sweep.value, [0, 1], [-EMBLEM * 1.3, EMBLEM * 1.3]) },
      // Inclinado: un destello perpendicular parece una persiana; inclinado
      // parece luz resbalando sobre una superficie.
      { rotate: '18deg' },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleIn.value,
    transform: [{ translateY: (1 - titleIn.value) * 14 }],
  }));

  const flavorStyle = useAnimatedStyle(() => ({
    opacity: flavorIn.value,
    transform: [{ translateY: (1 - flavorIn.value) * 14 }],
  }));

  const haloOuter: readonly [string, string] = [
    withAlpha(scene.tint, 0.55),
    withAlpha(scene.tint, 0),
  ];
  const haloInner: readonly [string, string] = [
    withAlpha(scene.tint, 0.9),
    withAlpha(scene.tint, 0.05),
  ];

  return (
    <View accessibilityViewIsModal style={{ flex: 1, backgroundColor: STAGE_BACKGROUND }}>
      {/* Tocar fuera cierra. Oculto para lectores de pantalla a propósito: un
          botón del tamaño de la pantalla se leería antes que la propia
          celebración y la taparía. Quien navega con VoiceOver cierra con el
          botón de 44 pt de la esquina, que sí se anuncia. */}
      <Pressable
        accessibilityElementsHidden
        importantForAccessibility="no"
        onPress={onClose}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          // El haz cae desde el borde superior de la pantalla: el foco está en
          // el techo, fuera de cuadro.
          { transformOrigin: 'top center' },
          beamStyle,
        ]}
      >
        <Beam tier={tier} tint={scene.tint} />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        }}
      >
        {/* Traga los toques: dentro del objeto no se cierra, fuera sí. */}
        <View onStartShouldSetResponder={() => true} style={{ alignItems: 'center' }}>
          <Animated.View
            style={[{ alignItems: 'center', justifyContent: 'center' }, emblemStyle]}
          >
            {/* Halo exterior: el charco de luz en el que está el objeto. */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  width: EMBLEM * 2.6,
                  height: EMBLEM * 2.6,
                  borderRadius: EMBLEM * 1.3,
                  overflow: 'hidden',
                },
                haloStyle,
              ]}
            >
              <LinearGradient
                colors={haloOuter}
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>

            {/* Halo interior: el borde encendido, pegado al objeto. */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  width: EMBLEM * 1.62,
                  height: EMBLEM * 1.62,
                  borderRadius: EMBLEM * 0.81,
                  overflow: 'hidden',
                },
                haloInnerStyle,
              ]}
            >
              <LinearGradient
                colors={haloInner}
                end={{ x: 0.5, y: 1 }}
                start={{ x: 0.5, y: 0 }}
                style={{ flex: 1 }}
              />
            </Animated.View>

            {/* La sombra va en su propia capa: en la misma vista que el
                `overflow: hidden` del recorte, iOS la recorta con el contenido
                y Android no la dibuja en absoluto. */}
            <View
              style={{
                borderRadius: radii.xl,
                shadowColor: scene.tint,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.85,
                // Radio ancho, sin borde duro: es lo que separa un objeto
                // iluminado de una calcomanía con contorno.
                shadowRadius: 44,
                elevation: 24,
              }}
            >
              <View
                style={{
                  width: EMBLEM,
                  height: EMBLEM,
                  borderRadius: radii.xl,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: withAlpha(scene.tint, 0.55),
                  backgroundColor: withAlpha(scene.tint, 0.16),
                  // Recorta el barrido a la silueta del emblema.
                  overflow: 'hidden',
                }}
              >
                <Ionicons color={scene.ink} name={scene.icon} size={EMBLEM / 2} />

                {/* El destello que recorre el objeto. */}
                {reduceMotion ? null : (
                  <Animated.View
                    pointerEvents="none"
                    style={[
                      {
                        position: 'absolute',
                        top: -EMBLEM,
                        bottom: -EMBLEM,
                        width: EMBLEM * 0.5,
                      },
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

          {/* El emblema crece hasta 1,22× sin mover el layout, así que el texto
              necesita su propio aire o quedaría debajo del objeto asentado. */}
          <View style={{ alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl + EMBLEM * 0.2 }}>
            <Animated.View style={[{ alignItems: 'center', gap: spacing.xs }, titleStyle]}>
              <Text
                style={{
                  color: scene.eyebrowColor,
                  fontSize: fontSizes.xs,
                  fontWeight: semibold,
                  letterSpacing: fontSizes.xs * 0.14,
                  textTransform: 'uppercase',
                }}
              >
                {scene.eyebrow}
              </Text>
              <Text
                accessibilityRole="header"
                style={{
                  color: colors.text,
                  fontSize: fontSizes['2xl'],
                  fontWeight: semibold,
                  letterSpacing: fontSizes['2xl'] * -0.03,
                  textAlign: 'center',
                }}
              >
                {scene.title}
              </Text>
            </Animated.View>

            <Animated.View style={flavorStyle}>
              <Text
                style={{
                  color: colors.textMuted,
                  fontSize: fontSizes.md,
                  lineHeight: 24,
                  textAlign: 'center',
                  maxWidth: 340,
                }}
              >
                {scene.flavor}
              </Text>
            </Animated.View>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Cerrar la celebración"
        accessibilityRole="button"
        onPress={onClose}
        style={{
          position: 'absolute',
          top: insets.top + spacing.sm,
          right: spacing.md,
          width: minTouchTarget,
          height: minTouchTarget,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: radii.full,
        }}
      >
        <Ionicons color={colors.textMuted} name="close" size={iconSizes.lg} />
      </Pressable>
    </View>
  );
}

/**
 * La celebración a pantalla completa.
 *
 * El escenario se remonta con cada sujeto (`key`): una celebración es una
 * secuencia que empieza en el fotograma cero, y reutilizar el árbol dejaría la
 * segunda insignia ya iluminada y ya botada.
 */
export function CelebrationModal({
  subject,
  onClose,
}: {
  subject: CelebrationSubject | null;
  onClose: () => void;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <Modal
      // El fundido es de `Modal`, no de Reanimated: nadie lo apaga por su
      // cuenta, así que con movimiento reducido se pide explícitamente `none`.
      animationType={reduceMotion ? 'none' : 'fade'}
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={subject !== null}
    >
      {subject ? (
        <CelebrationStage key={keyOf(subject)} onClose={onClose} subject={subject} />
      ) : null}
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Detección de subida de nivel                                                */
/* -------------------------------------------------------------------------- */

/**
 * `gymsheet.progression.level.v1.<userId>` — el último rango visto.
 *
 * Por usuario, porque dos cuentas en el mismo teléfono no comparten senda, y
 * versionado, porque si algún día el formato cambia hay que poder ignorar lo
 * guardado sin celebrar ocho ascensos de golpe.
 */
const LEVEL_SEEN_PREFIX = 'gymsheet.progression.level.v1.';

interface SeenLevel {
  code: string;
  sortOrder: number;
}

/** Sin `any`: lo leído del almacén es `unknown` hasta que se demuestre lo contrario. */
function parseSeenLevel(raw: string): SeenLevel | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as Partial<Record<keyof SeenLevel, unknown>>;
    if (typeof candidate.code !== 'string' || typeof candidate.sortOrder !== 'number') return null;
    return { code: candidate.code, sortOrder: candidate.sortOrder };
  } catch {
    return null;
  }
}

/**
 * Detecta la subida de rango **en el cliente**, y conviene saber por qué.
 *
 * El contrato `progressionSchema` trae `unlockedNow` para las insignias: el
 * servidor sabe cuáles acabas de conseguir y el cliente las confirma con
 * `acknowledge`. Para los niveles no hay nada equivalente. `level` describe
 * dónde estás, no que acabes de llegar, así que desde la respuesta es
 * imposible distinguir «has subido a Intermedio ahora mismo» de «llevas tres
 * meses en Intermedio».
 *
 * Se resuelve aquí y no en el backend a propósito: hay un conflicto de ramas
 * abierto sobre ese contrato y ampliarlo ahora lo empeora. Así que se guarda en
 * SecureStore el último `code` visto por esa cuenta y se compara.
 *
 * **Lo que esto no puede hacer, y que el servidor sí haría:**
 *
 * - Reinstalar la aplicación o cambiar de teléfono borra el recuerdo, y el
 *   primer arranque no celebra nada (ver abajo). Un ascenso puede perderse.
 * - Sólo se entera el dispositivo que estaba abierto: si subes de rango y abres
 *   la senda en la tableta, el móvil no lo celebrará nunca.
 * - No sabe **cuándo** ocurrió, así que no puede decir «ayer subiste».
 *
 * Lo correcto en el servidor sería un `levelUnlockedNow: progressionLevelSchema
 * .nullable()` en `progressionSchema`, poblado igual que `unlockedNow` desde la
 * tabla de ascensos, y que la llamada `acknowledge` ya existente lo consuma.
 * Son dos campos y ninguna tabla nueva; sólo no es este el momento de tocarlo.
 *
 * **La primera vez no se celebra.** Se anota el rango actual y se calla. Alguien
 * que lleva medio año en la aplicación e instala esta versión no ha ascendido
 * hoy, y abrirle una celebración a pantalla completa por un rango que ya tenía
 * convertiría la función en una mentira desde el primer día.
 */
export function useLevelUpCelebration(
  level: ProgressionLevel | null,
  userId: string | null,
): { pendingLevel: ProgressionLevel | null; dismissLevelUp: () => void } {
  const [pendingLevel, setPendingLevel] = useState<ProgressionLevel | null>(null);

  // La consulta devuelve un objeto nuevo en cada refetch; lo que identifica un
  // rango es su código y su orden. El objeto se lee de la referencia para no
  // releer el Llavero cada vez que react-query refresca en segundo plano.
  const levelRef = useRef(level);
  levelRef.current = level;

  const code = level?.code ?? null;
  const sortOrder = level?.sortOrder ?? null;

  useEffect(() => {
    const current = levelRef.current;
    if (!current || code === null || sortOrder === null || !userId) return;

    let cancelled = false;
    const key = `${LEVEL_SEEN_PREFIX}${userId}`;

    void (async () => {
      try {
        const raw = await SecureStore.getItemAsync(key);
        // Se anota **antes** de decidir: si la persona cierra la aplicación con
        // la celebración en pantalla, ya la ha visto, y repetirla mañana la
        // convertiría en ruido. Es el mismo criterio que `acknowledge` usa para
        // las insignias.
        await SecureStore.setItemAsync(key, JSON.stringify({ code, sortOrder }));
        if (cancelled || raw === null) return;

        const seen = parseSeenLevel(raw);
        if (!seen || seen.code === code) return;
        // Sólo hacia arriba. Un rango distinto y **más bajo** no es un ascenso:
        // es que el gimnasio ha reordenado su catálogo, y celebrar un descenso
        // sería peor que no celebrar nada.
        if (sortOrder > seen.sortOrder) setPendingLevel(current);
      } catch {
        // El Llavero puede fallar (dispositivo bloqueado al arrancar). No
        // celebrar es el fallo seguro: lo contrario es celebrar en bucle.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, sortOrder, userId]);

  const dismissLevelUp = useCallback(() => setPendingLevel(null), []);

  return { pendingLevel, dismissLevelUp };
}
