import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui';
import { DURATION, PREMIUM_EASING, PressableScale, SETTLE_SPRING } from '@/components/motion';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import {
  ANCHOR_WAIT_MS,
  decideTourOpen,
  HALO,
  placeCard,
  scrollDeltaFor,
} from '@/state/tour-queue';
import { useTourStore, type TargetRect, type TourKey } from '@/state/tour-store';
import { colors, fontSizes, iconSizes, radii, spacing, useActiveTenant } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type TourStep = {
  readonly icon: keyof typeof Ionicons.glyphMap;
  /** `null` = se sustituye por el nombre del gimnasio activo. */
  readonly title: string | null;
  readonly body: string;
  /**
   * Which on-screen element this step is about. A step with no target is a
   * plain card in the middle — right for «here is what this screen is for»,
   * wrong for anything that refers to a specific control.
   */
  readonly target?: string;
  /**
   * El elemento puede no estar en pantalla y el paso sigue teniendo sentido: se
   * muestra como tarjeta central. Sin esto, un paso cuyo elemento no aparece se
   * salta, porque explicar un control que no se ve es peor que no explicarlo.
   */
  readonly optional?: boolean;
  /**
   * El elemento no pertenece a la lista que se desplaza —la barra de pestañas—,
   * así que traerlo «a la vista» sólo movería, sin motivo, la pantalla de detrás.
   */
  readonly fixed?: boolean;
};

/**
 * What the app is, in the order someone actually meets it.
 *
 * Cada paso nombra una pestaña y dice para qué SIRVE, no qué contiene, y señala
 * su icono real de la barra: «aquí están tus rutinas» describe una pantalla,
 * «esto responde qué te toca hoy» describe una razón para abrirla. Son las cuatro
 * pestañas que hay —Entrenos ya no es una: se alcanza desde Inicio y Perfil; y
 * Ejercicios tampoco desde C4: el catálogo se abre desde Rutinas y Perfil y
 * tiene su propio tour (`exercises`) la primera vez que se entra al buscador—.
 *
 * `null` en el título significa «rellénalo con el nombre del gimnasio al
 * pintar». Es el único paso que lo menciona, así que no compensa convertir todo
 * el arreglo en una función solo por este título.
 */
const WELCOME: readonly TourStep[] = [
  {
    icon: 'sparkles-outline',
    title: null,
    body: 'Tu entrenamiento, tus cargas y tu progreso en un solo sitio. Cada pantalla se explica sola la primera vez que entras.',
  },
  {
    icon: 'home-outline',
    title: 'Inicio',
    body: 'Lo que has movido esta semana, qué músculos trabajaste y tus últimas sesiones.',
    target: 'tab.home',
    optional: true,
    fixed: true,
  },
  {
    icon: 'albums-outline',
    title: 'Rutinas',
    body: 'Tu semana de un vistazo: qué toca hoy y qué días entrenas. Desde aquí también exploras el catálogo de ejercicios.',
    target: 'tab.routines',
    optional: true,
    fixed: true,
  },
  {
    icon: 'people-outline',
    title: 'Comunidad',
    body: 'Conoce a otros socios, mira el podio de tu gimnasio y escribe a quienes aceptaron tu conexión.',
    target: 'tab.comunidad',
    optional: true,
    fixed: true,
  },
  {
    icon: 'person-outline',
    title: 'Tu perfil',
    body: 'Tus datos, tu membresía y la descarga de tu avance. Desde aquí puedes repetir todos estos tutoriales.',
    target: 'tab.profile',
    optional: true,
    fixed: true,
  },
];

/**
 * The per-screen tours.
 *
 * These fire the first time a screen is opened and point at real controls, so
 * the explanation arrives with the thing it explains under the user's thumb.
 * Kept to two or three steps each: a tour that has to be *endured* teaches
 * nothing, and anything longer belongs in the screen's own empty states.
 */
const SCREEN_TOURS: Record<Exclude<TourKey, 'welcome'>, readonly TourStep[]> = {
  home: [
    {
      icon: 'trending-up-outline',
      title: 'Tu evolución',
      body: 'La carga de esta semana con su comparación contra la anterior. Ese porcentaje es tu sobrecarga progresiva: si sube, estás moviendo más kilos que hace siete días.',
      target: 'home.progress',
    },
    {
      icon: 'body-outline',
      title: 'Qué has trabajado',
      body: 'El reparto de series por músculo en la semana. Sirve para ver de un vistazo lo que llevas descuidado.',
      target: 'home.muscles',
    },
  ],
  routines: [
    {
      icon: 'calendar-outline',
      title: 'Tu semana',
      body: 'Los días que entrenas, empezando en lunes. El día de hoy va marcado; toca cualquiera para abrir su rutina.',
      target: 'routines.week',
    },
    {
      icon: 'add-circle-outline',
      title: 'Rutinas propias',
      body: 'Además de las que te asigna tu entrenador, puedes crear las tuyas y programarlas en los días que quieras.',
      target: 'routines.create',
    },
  ],
  exercises: [
    {
      icon: 'grid-outline',
      title: 'Por zona del cuerpo',
      body: 'El catálogo se recorre por zona y luego por músculo. Cada lámina resalta en rojo el músculo que trabaja.',
      target: 'exercises.grid',
    },
    {
      icon: 'search-outline',
      title: 'O búscalo directo',
      body: 'Si ya sabes el nombre, el buscador va contra todo el catálogo sin pasar por la rejilla.',
      target: 'exercises.search',
    },
  ],
  workouts: [
    {
      icon: 'flame-outline',
      title: 'Tus sesiones',
      body: 'Cada entreno con sus ejercicios y series. Abre uno en curso para seguir registrando donde lo dejaste.',
      target: 'workouts.list',
    },
  ],
  profile: [
    {
      icon: 'person-circle-outline',
      title: 'Tus datos',
      body: 'Peso, estatura y objetivo se editan desde aquí. El resto de la pantalla es tu membresía y tus ajustes.',
      target: 'profile.identity',
    },
  ],
  trayectoria: [
    {
      icon: 'trophy-outline',
      title: 'Tu rango y tus puntos',
      body: 'Ganas puntos cada vez que entrenas, y nunca bajan. La barra te dice cuánto falta para el siguiente rango.',
      target: 'trayectoria.rank',
    },
    {
      icon: 'trail-sign-outline',
      title: 'El camino',
      body: 'Todos los rangos, también los que te quedan. Cada uno pide más puntos que el anterior.',
      target: 'trayectoria.path',
    },
    {
      icon: 'ribbon-outline',
      title: 'Insignias',
      body: 'Retos concretos que suman puntos extra. Toca una conseguida para ver su carta. La rareza dice lo difícil que es.',
      target: 'trayectoria.badges',
    },
  ],
  comunidad: [
    {
      icon: 'options-outline',
      title: 'Filtros, likes y mensajes',
      body: 'Arriba ajustas a quién ves, revisas quién te dio like y abres tus mensajes.',
      target: 'comunidad.actions',
    },
    {
      icon: 'podium-outline',
      title: 'El podio del gimnasio',
      body: 'Quién lleva más puntos en tu gimnasio. Tócalo para ver tu senda completa.',
      target: 'comunidad.podium',
    },
    {
      icon: 'flame-outline',
      title: 'Descubrir',
      body: 'Conoce socios uno a uno, una carta por persona. Se aplican los filtros que tengas puestos.',
      target: 'comunidad.discover',
    },
  ],
  descubrir: [
    {
      icon: 'albums-outline',
      title: 'Una carta por socio',
      body: 'Arrastra a la derecha si te interesa y a la izquierda si no. Toca la esquina de información para ver su ficha.',
    },
    {
      icon: 'heart-outline',
      title: 'O usa los botones',
      body: 'La cruz pasa y el corazón marca interés. La flecha deshace tu última decisión.',
      target: 'descubrir.actions',
    },
  ],
  interacciones: [
    {
      icon: 'people-outline',
      title: 'Cómo reaccionan a tu perfil',
      body: 'Aquí ves lo que hacen otros socios cuando te encuentran en Comunidad.',
    },
    {
      icon: 'heart-outline',
      title: 'Tres listas',
      body: 'Te gustan: quién te dio like. Visitas: quién vio tu perfil. Nexts: quién pasó de largo.',
      target: 'interacciones.tabs',
    },
  ],
  chat: [
    {
      icon: 'chatbubbles-outline',
      title: 'Solo con conexiones',
      body: 'Puedes escribir a los socios que aceptaron tu conexión. Las invitaciones se envían desde Comunidad.',
    },
    {
      icon: 'list-outline',
      title: 'Tus conversaciones',
      body: 'Toca una para abrirla. Desliza hacia abajo para traer los mensajes nuevos.',
      target: 'chat.list',
    },
  ],
  membership: [
    {
      icon: 'shield-checkmark-outline',
      title: 'Tu plan hoy',
      body: 'Si está vigente, cuántos días le quedan y cuándo vence.',
      target: 'membership.status',
    },
    {
      icon: 'refresh-outline',
      title: 'Renovar',
      body: 'Eliges el plan, confirmas y pagas con el código QR. Después envías el comprobante por WhatsApp.',
      target: 'membership.renew',
    },
    {
      icon: 'key-outline',
      title: 'Tus accesos',
      body: 'Cada entrada al gimnasio queda registrada aquí.',
      target: 'membership.accesses',
    },
  ],
  notifications: [
    {
      icon: 'notifications-outline',
      title: 'Avisos de vencimiento',
      body: 'Actívalos y te recordamos renovar antes de que venza tu membresía.',
      target: 'notifications.reminders',
    },
    {
      icon: 'moon-outline',
      title: 'Horario de silencio',
      body: 'Silencia los avisos por la noche para que no te molesten.',
      target: 'notifications.quiet',
    },
  ],
};

/** Cuánto se espera un elemento «opcional» antes de explicar el paso sin él. */
const OPTIONAL_WAIT_MS = 900;

/**
 * Marks an element as a tour anchor.
 *
 * Measurement is in window coordinates rather than layout coordinates because
 * the overlay is a `Modal`, which has its own coordinate space: a rect relative
 * to a scroll view would place the spotlight somewhere else entirely once the
 * user had scrolled.
 *
 * `grow` ensancha el hueco: un icono de la barra mide 24 px y rodearlo tal cual
 * da un anillo apretado que parece un error.
 */
export function TourTarget({
  id,
  children,
  grow = 0,
}: {
  id: string;
  children: ReactNode;
  grow?: number;
}) {
  const measure = useTourStore((state) => state.measure);
  const forget = useTourStore((state) => state.forget);
  const active = useTourStore((state) => state.active);
  const nonce = useTourStore((state) => state.nonce);
  const ref = useRef<View | null>(null);

  useEffect(() => () => forget(id), [forget, id]);

  const read = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        measure(id, {
          x: x - grow,
          y: y - grow,
          width: width + grow * 2,
          height: height + grow * 2,
        });
      }
    });
  }, [grow, id, measure]);

  const onLayout = useCallback(() => {
    // `measureInWindow` has to run after layout has been committed; calling it
    // inside onLayout itself returns the pre-commit frame on iOS.
    requestAnimationFrame(read);
  }, [read]);

  /**
   * Measure again whenever someone asks for it.
   *
   * Layout is not the last word on where something is: `onLayout` no se dispara
   * cuando se mueve un ANCESTRO —un esqueleto que se sustituye por datos, una
   * entrada animada, una cifra que cambia de ancho— ni al desplazar la lista. El
   * `nonce` es la forma de decir «vuelve a leer ya»: lo sube el overlay al
   * cambiar de paso, al terminar un desplazamiento y al girar el teléfono, y lo
   * sube `useScreenTour` mientras espera que este elemento exista.
   */
  useEffect(() => {
    if (nonce === 0 && !active) return;
    const timer = setTimeout(read, 60);
    return () => clearTimeout(timer);
  }, [active, nonce, read]);

  return (
    <View collapsable={false} onLayout={onLayout} ref={ref}>
      {children}
    </View>
  );
}

/**
 * Opens a screen's tour the first time that screen is reached.
 *
 * Deliberately not tied to remount: re-entering a screen is not a new first
 * impression, and a tour that replays on every visit is the single most
 * effective way to make people stop reading tours.
 *
 * Pero SÍ está atado al foco. Las pestañas se quedan montadas para siempre, así
 * que un temporizador desde el montaje podía disparar el tour de una pestaña que
 * la persona ya no tenía delante —sobre otra pantalla, con rectángulos de la
 * primera—. Aquí la pantalla declara cuándo recibe el foco y `decideTourOpen`
 * decide el resto (ver `tour-queue.ts`).
 *
 * `enabled` deja a la pantalla vetar la apertura: Trayectoria abre sola una carta
 * de recompensa, y dos modales a la vez dejan a iOS con uno que no llega a
 * presentarse y el tour «activo» sin nada a la vista.
 */
export function useScreenTour(key: Exclude<TourKey, 'welcome'>, enabled = true): void {
  const hydrated = useTourStore((state) => state.seen !== null);
  const done = useTourStore((state) => state.seen?.[key] === true);
  const anotherActive = useTourStore((state) => state.active !== null);
  const closedAt = useTourStore((state) => state.closedAt);
  const openOnce = useTourStore((state) => state.openOnce);
  const firstTarget = SCREEN_TOURS[key][0]?.target ?? null;
  const anchorMeasuredAt = useTourStore((state) =>
    firstTarget ? (state.measuredAt[firstTarget] ?? null) : null,
  );
  const [focusedAt, setFocusedAt] = useState<number | null>(null);
  const [tick, setTick] = useState(0);

  useFocusEffect(
    useCallback(() => {
      setFocusedAt(Date.now());
      return () => setFocusedAt(null);
    }, []),
  );

  useEffect(() => {
    if (!enabled) return;
    const decision = decideTourOpen({
      hydrated,
      done,
      anotherActive,
      focusedAt,
      closedAt,
      needsAnchor: firstTarget !== null,
      anchorMeasuredAt,
      now: Date.now(),
    });
    if (decision.kind === 'open') {
      openOnce(key);
      return;
    }
    if (decision.kind === 'wait') {
      const timer = setTimeout(() => {
        if (decision.remeasure) useTourStore.getState().remeasure();
        setTick((value) => value + 1);
      }, decision.retryInMs);
      return () => clearTimeout(timer);
    }
  }, [
    anchorMeasuredAt,
    anotherActive,
    closedAt,
    done,
    enabled,
    firstTarget,
    focusedAt,
    hydrated,
    key,
    openOnce,
    tick,
  ]);
}

/**
 * La parte oscurecida con el hueco recortado, y el anillo que lo rodea.
 *
 * Cuatro bandas alrededor del hueco, sin máscara SVG: ninguna dependencia, ningún
 * trazado por fotograma, y en un tema oscuro las costuras no se ven porque todas
 * son del mismo color. La diferencia con la versión anterior es que el hueco ES
 * ANIMADO: vive en valores compartidos y viaja de un paso al siguiente con el
 * mismo muelle que el resto de la app. Antes cada paso era un fotograma nuevo en
 * el que el anillo aparecía en otro sitio, que es lo que hacía parecer que el
 * tutorial «saltaba».
 *
 * Con «reducir movimiento» el hueco cambia de sitio sin viajar.
 */
function Spotlight({
  hole,
  stageWidth,
  stageHeight,
  reduceMotion,
}: {
  hole: TargetRect | null;
  stageWidth: number;
  stageHeight: number;
  reduceMotion: boolean;
}) {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);
  const present = useSharedValue(0);
  const placed = useRef(false);

  const holeX = hole?.x;
  const holeY = hole?.y;
  const holeW = hole?.width;
  const holeH = hole?.height;
  useEffect(() => {
    if (holeX === undefined || holeY === undefined || holeW === undefined || holeH === undefined) {
      placed.current = false;
      present.value = reduceMotion ? 0 : withTiming(0, { duration: DURATION.exit, easing: PREMIUM_EASING });
      return;
    }
    const next = { x: holeX - HALO, y: holeY - HALO, w: holeW + HALO * 2, h: holeH + HALO * 2 };
    if (!placed.current || reduceMotion) {
      // La primera vez no viaja desde (0, 0): aparece donde va.
      x.value = next.x;
      y.value = next.y;
      w.value = next.w;
      h.value = next.h;
      placed.current = true;
    } else {
      x.value = withSpring(next.x, SETTLE_SPRING);
      y.value = withSpring(next.y, SETTLE_SPRING);
      w.value = withSpring(next.w, SETTLE_SPRING);
      h.value = withSpring(next.h, SETTLE_SPRING);
    }
    present.value = reduceMotion
      ? 1
      : withTiming(1, { duration: DURATION.standard, easing: PREMIUM_EASING });
  }, [h, holeH, holeW, holeX, holeY, present, reduceMotion, w, x, y]);

  const dim = 'rgba(0,0,0,0.86)';
  const fullStyle = useAnimatedStyle(() => ({ opacity: 1 - present.value }));
  const topStyle = useAnimatedStyle(() => ({
    height: Math.max(0, y.value),
    opacity: present.value,
  }));
  const bottomStyle = useAnimatedStyle(() => ({
    top: Math.min(stageHeight, y.value + h.value),
    opacity: present.value,
  }));
  const leftStyle = useAnimatedStyle(() => {
    const top = Math.max(0, y.value);
    return {
      top,
      width: Math.max(0, x.value),
      height: Math.max(0, Math.min(stageHeight, y.value + h.value) - top),
      opacity: present.value,
    };
  });
  const rightStyle = useAnimatedStyle(() => {
    const top = Math.max(0, y.value);
    return {
      top,
      left: Math.min(stageWidth, x.value + w.value),
      height: Math.max(0, Math.min(stageHeight, y.value + h.value) - top),
      opacity: present.value,
    };
  });
  const ringStyle = useAnimatedStyle(() => ({
    left: x.value,
    top: y.value,
    width: w.value,
    height: h.value,
    opacity: present.value,
  }));

  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: dim }, fullStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 0, right: 0, top: 0, backgroundColor: dim }, topStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: dim }, bottomStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', left: 0, backgroundColor: dim }, leftStyle]}
      />
      <Animated.View
        pointerEvents="none"
        style={[{ position: 'absolute', right: 0, backgroundColor: dim }, rightStyle]}
      />
      {/* The ring is what turns "a gap in the dimming" into "this thing here". */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            borderRadius: radii.lg,
            borderWidth: 2,
            borderColor: colors.volt,
          },
          ringStyle,
        ]}
      />
    </>
  );
}

/** Un punto del indicador de pasos: el activo se ensancha en vez de cambiar de golpe. */
function StepDot({ active, reduceMotion }: { active: boolean; reduceMotion: boolean }) {
  const width = useSharedValue(active ? 18 : 6);
  useEffect(() => {
    const target = active ? 18 : 6;
    width.value = reduceMotion
      ? target
      : withTiming(target, { duration: DURATION.quick, easing: PREMIUM_EASING });
  }, [active, reduceMotion, width]);
  const style = useAnimatedStyle(() => ({ width: width.value }));
  return (
    <Animated.View
      style={[
        {
          height: 6,
          borderRadius: radii.full,
          backgroundColor: active ? colors.volt : colors.surfaceHighest,
        },
        style,
      ]}
    />
  );
}

/**
 * Guided tour: the welcome deck and the per-screen spotlights, one component.
 *
 * The card zooms in rather than sliding: a step that scales up reads as
 * something being *presented*, while a slide reads as one more screen in a
 * stack the user is trying to get through. Each step re-runs the zoom, so
 * advancing feels like a new card is handed over instead of text swapping in
 * place — which at this size is nearly invisible.
 *
 * Tocar DENTRO del hueco avanza al siguiente paso; tocar fuera cierra. Antes todo
 * cerraba, incluido el elemento que el propio texto invitaba a tocar.
 */
export function TourOverlay() {
  const active = useTourStore((state) => state.active);
  const step = useTourStore((state) => state.step);
  const setStep = useTourStore((state) => state.setStep);
  const complete = useTourStore((state) => state.complete);
  const targets = useTourStore((state) => state.targets);
  const scroller = useTourStore((state) => state.scroller);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tenant = useActiveTenant();
  const reduceMotion = useReduceMotion();

  /**
   * El tamaño REAL del escenario, medido en el propio Modal. `useWindowDimensions`
   * sale de las métricas del recurso y en Android con borde a borde puede no
   * incluir la barra de gestos, mientras que las posiciones de los anclajes sí
   * cuentan la ventana entera: mezclarlas desplazaba la tarjeta inferior.
   */
  const [stage, setStage] = useState<{ width: number; height: number } | null>(null);
  const stageWidth = stage?.width ?? window.width;
  const stageHeight = stage?.height ?? window.height;
  const onStageLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setStage((previous) =>
      previous && previous.width === width && previous.height === height
        ? previous
        : { width, height },
    );
  }, []);

  const scale = useSharedValue(reduceMotion ? 1 : 0.9);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  const steps = active === 'welcome' ? WELCOME : active ? SCREEN_TOURS[active] : [];
  const rawStep = steps[step];
  // La bienvenida saluda con el nombre del gimnasio, no con el del producto: la
  // persona instaló la aplicación de su gimnasio y eso es lo que espera leer.
  const live = rawStep
    ? { ...rawStep, title: rawStep.title ?? `Bienvenido a ${tenant.name}` }
    : undefined;
  const isLast = step === steps.length - 1;
  const targetId = live?.target ?? null;
  const liveHole = targetId ? (targets[targetId] ?? null) : null;

  /**
   * Lo último que se mostró, para el desvanecimiento de salida. Al cerrar, el
   * paso pasa a `undefined` en el mismo render en que el Modal empieza a
   * ocultarse: sin esto el contenido desaparecía de golpe y lo que se
   * desvanecía era una ventana vacía que aún bloqueaba los toques.
   */
  const lastFrame = useRef<{
    step: NonNullable<typeof live>;
    hole: TargetRect | null;
    index: number;
    count: number;
    last: boolean;
  } | null>(null);
  if (live) {
    lastFrame.current = {
      step: live,
      hole: liveHole,
      index: step,
      count: steps.length,
      last: isLast,
    };
  }
  const frame = lastFrame.current;
  const current = frame?.step;
  const hole = live ? liveHole : (frame?.hole ?? null);

  // Un paso cuyo elemento aún no se ha medido no enseña la tarjeta: aparecería
  // suelta y luego saltaría al sitio. Se espera; si el elemento no llega, un paso
  // «opcional» se explica sin él y uno que no lo es se salta.
  const stepKey = active ? `${active}:${step}` : null;
  const missingAnchor = Boolean(live && targetId && !liveHole);
  const [givenUp, setGivenUp] = useState<string | null>(null);
  const waiting = missingAnchor && givenUp !== stepKey;

  const close = useCallback(() => void complete(), [complete]);
  const advance = useCallback(() => {
    if (isLast) close();
    else setStep(step + 1);
  }, [close, isLast, setStep, step]);

  useEffect(() => {
    if (!waiting || !live || !stepKey) return;
    const optional = live.optional === true;
    const timer = setTimeout(
      () => {
        if (optional) setGivenUp(stepKey);
        else advance();
      },
      optional ? OPTIONAL_WAIT_MS : ANCHOR_WAIT_MS,
    );
    return () => clearTimeout(timer);
  }, [advance, live, stepKey, waiting]);

  useEffect(() => {
    if (!active || waiting) return;
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    // Restart from slightly small on every step so the zoom is the transition,
    // not just the entrance.
    scale.value = 0.9;
    opacity.value = 0;
    scale.value = withSpring(1, SETTLE_SPRING);
    opacity.value = withTiming(1, { duration: DURATION.standard, easing: PREMIUM_EASING });
  }, [active, opacity, reduceMotion, scale, step, waiting]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  /**
   * Leer otra vez dónde están los elementos cuando algo ha podido moverlos: al
   * cambiar de paso, al girar el teléfono o al cambiar el tamaño del escenario.
   * Dos lecturas porque el viaje de una transición dura más que la primera.
   */
  useEffect(() => {
    if (!active) return;
    const timers = [
      setTimeout(() => useTourStore.getState().remeasure(), 80),
      setTimeout(() => useTourStore.getState().remeasure(), 420),
    ];
    return () => timers.forEach(clearTimeout);
  }, [active, stageHeight, stageWidth, step]);

  /**
   * Bring the anchor into the band the spotlight can actually use.
   *
   * A tour that highlights something below the fold is worse than no tour: the
   * ring lands on the tab bar and the card explains a control the user cannot
   * see. La cuenta está en `scrollDeltaFor` (probada aparte); aquí sólo se
   * decide cuándo.
   */
  const anchorTop = liveHole?.y ?? 0;
  const anchorHeight = liveHole?.height ?? 0;
  const anchorMeasuredAt = useTourStore((state) =>
    targetId ? (state.measuredAt[targetId] ?? 0) : 0,
  );
  /**
   * Cuándo y cuántas veces se ha desplazado la lista para este paso.
   *
   * La versión anterior daba el paso por «ya desplazado» en la PRIMERA lectura,
   * aunque fuese una medida vieja que caía dentro de la zona útil; cuando llegaba
   * la lectura buena —con el elemento ya fuera de pantalla— no volvía a mirar, y
   * el anillo se quedaba señalando una barra vacía. Ahora sólo se decide con una
   * lectura POSTERIOR a que el paso arranque o a que termine el desplazamiento
   * anterior, y el paso se da por hecho cuando esa lectura ya no pide mover nada
   * (o tras dos intentos, para no sacudir la pantalla en una lista corta).
   */
  const scroll = useRef({ stepKey: null as string | null, startedAt: 0, lastAt: 0, attempts: 0, done: false });
  const settleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (!active) {
      scroll.current = { stepKey: null, startedAt: 0, lastAt: 0, attempts: 0, done: false };
      settleTimers.current.forEach(clearTimeout);
      settleTimers.current = [];
    }
  }, [active]);
  useEffect(() => {
    if (!active || !stepKey) return;
    const state = scroll.current;
    if (state.stepKey !== stepKey) {
      scroll.current = { stepKey, startedAt: Date.now(), lastAt: 0, attempts: 0, done: false };
    }
  }, [active, stepKey]);
  useEffect(() => {
    if (!active || !liveHole || !scroller || !stepKey || live?.fixed) return;
    const state = scroll.current;
    if (state.stepKey !== stepKey || state.done) return;
    // Una lectura sólo vale si es posterior a que el paso se asentara y, tras un
    // desplazamiento, a que éste terminara (la lista viaja ~650 ms).
    const freshAfter = Math.max(state.startedAt + 120, state.lastAt > 0 ? state.lastAt + 650 : 0);
    if (anchorMeasuredAt < freshAfter) return;

    const delta = scrollDeltaFor({ anchorTop, anchorHeight, stageHeight });
    if (delta === 0 || state.attempts >= 2) {
      state.done = true;
      return;
    }
    state.attempts += 1;
    state.lastAt = Date.now();
    // Antes del primer desplazamiento se anota dónde estaba la lista, para
    // devolverla ahí al cerrar el tour.
    useTourStore.getState().rememberOffset();
    scroller.scrollBy(delta);
    // The scroll is animated, so the anchor is still moving; read it again once
    // it has landed or the ring stays where the element used to be.
    //
    // The timers deliberately outlive this effect instead of being cleared by
    // its cleanup: scrolling changes `anchorTop`, which re-runs the effect, and
    // a cleanup here would cancel the very re-measure the scroll just made
    // necessary. Dos lecturas porque lo que tarda en asentarse depende de la
    // distancia y del dispositivo; la segunda cae pasados los 650 ms.
    settleTimers.current.forEach(clearTimeout);
    settleTimers.current = [
      setTimeout(() => useTourStore.getState().remeasure(), 300),
      setTimeout(() => useTourStore.getState().remeasure(), 760),
    ];
  }, [active, anchorHeight, anchorMeasuredAt, anchorTop, live?.fixed, liveHole, scroller, stageHeight, stepKey]);
  useEffect(
    () => () => {
      settleTimers.current.forEach(clearTimeout);
    },
    [],
  );

  const visible = active !== null && live !== undefined;
  const placement = hole
    ? placeCard({
        hole,
        stageHeight,
        insetTop: insets.top,
        insetBottom: insets.bottom,
      })
    : null;

  const cardWidth = Math.min(420, stageWidth - spacing.lg * 2);
  const cardLeft = (stageWidth - cardWidth) / 2;
  const arrowX = hole
    ? Math.max(20, Math.min(cardWidth - 34, hole.x + hole.width / 2 - cardLeft - 7))
    : 0;

  const centeredMaxHeight = Math.max(
    220,
    stageHeight - insets.top - insets.bottom - spacing.lg * 2,
  );

  const content = current ? (
    <Animated.View
      accessibilityViewIsModal
      style={[
        {
          width: cardWidth,
          maxHeight: placement ? placement.maxHeight : centeredMaxHeight,
          gap: spacing.md,
          padding: hole ? spacing.lg : spacing.xl,
          borderRadius: radii.xl,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        },
        animated,
      ]}
    >
      {placement && placement.side !== 'floating' ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: arrowX,
            width: 14,
            height: 14,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            transform: [{ rotate: '45deg' }],
            ...(placement.side === 'below'
              ? { top: -8, borderTopWidth: 1, borderLeftWidth: 1 }
              : { bottom: -8, borderBottomWidth: 1, borderRightWidth: 1 }),
          }}
        />
      ) : null}

      {/* El texto se desplaza y los botones no: si el paso no cabe, lo que
          se recorta nunca es la salida. `key` devuelve el scroll arriba en
          cada paso nuevo. */}
      <ScrollView
        bounces={false}
        contentContainerStyle={{
          gap: spacing.md,
          alignItems: hole ? 'flex-start' : 'center',
        }}
        key={`${active ?? 'closing'}:${frame?.index ?? 0}`}
        persistentScrollbar
        style={{ flexGrow: 0, flexShrink: 1 }}
      >
        <View
          style={{
            width: hole ? 44 : 72,
            height: hole ? 44 : 72,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
            borderWidth: 1,
            borderColor: colors.volt,
          }}
        >
          <Ionicons
            color={colors.volt}
            name={current.icon}
            size={hole ? iconSizes.lg : iconSizes.xl}
          />
        </View>

        <Text
          style={{
            color: colors.text,
            fontSize: hole ? fontSizes.lg : fontSizes.xl,
            fontWeight: '700',
            textAlign: hole ? 'left' : 'center',
            letterSpacing: fontSizes.xl * -0.03,
          }}
        >
          {current.title}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.sm,
            lineHeight: 22,
            textAlign: hole ? 'left' : 'center',
          }}
        >
          {current.body}
        </Text>

        {/* Dots, not a numbered counter: the point is "almost done", and a
            shape communicates that faster than "4 de 5". */}
        {(frame?.count ?? 0) > 1 ? (
          <View style={{ flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs }}>
            {Array.from({ length: frame?.count ?? 0 }, (_, index) => (
              <StepDot active={index === frame?.index} key={index} reduceMotion={reduceMotion} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={{ width: '100%', gap: spacing.sm }}>
        <Button label={frame?.last ? 'Entendido' : 'Siguiente'} onPress={advance} />
        {!frame?.last ? (
          <PressableScale
            accessibilityLabel="Saltar tutorial"
            onPress={close}
            style={{ alignItems: 'center', paddingVertical: spacing.xs }}
          >
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>Saltar</Text>
          </PressableScale>
        ) : null}
      </View>
    </Animated.View>
  ) : null;

  return (
    <Modal
      animationType="fade"
      // Android: sin esto el boton fisico de atras no hace nada y el tutorial
      // se convierte en la trampa que este componente existe para evitar.
      onRequestClose={close}
      // Android: el Modal es una ventana aparte. Con borde a borde las dos
      // barras son translúcidas y el escenario coincide con la ventana de la
      // app, que es el espacio en el que miden los anclajes.
      navigationBarTranslucent
      statusBarTranslucent
      // Sin esto iOS fuerza vertical al abrir el Modal en un iPhone girado, y
      // todos los rectángulos medidos dejan de valer.
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
      transparent
      // `visible={false}` y no desmontar el Modal.
      //
      // Devolver `null` en cuanto el tour termina arranca la ventana modal en
      // mitad de su presentacion, y iOS se queda con ella como frontal: la
      // pantalla de debajo se ve perfectamente pero deja de existir en el arbol
      // de accesibilidad, asi que un lector de pantalla --y cualquier prueba
      // automatizada-- encuentra la nada. Dejarlo montado y decirle que se
      // oculte es lo que le permite retirarse por su cuenta.
      visible={visible}
    >
      <View onLayout={onStageLayout} style={{ flex: 1 }}>
        {current === undefined ? null : (
          <>
            {/* Tocar fuera cierra. Un tutorial a pantalla completa que sólo se deja
                salir por su propio botón es indistinguible de una app colgada, y
                quien lo sufre no vuelve a leer ninguno. */}
            <Pressable
              accessibilityLabel="Cerrar tutorial"
              onPress={close}
              style={StyleSheet.absoluteFill}
            >
              <Spotlight
                hole={waiting ? null : hole}
                reduceMotion={reduceMotion}
                stageHeight={stageHeight}
                stageWidth={stageWidth}
              />
            </Pressable>

            {/* Tocar el elemento resaltado avanza: el texto suele invitar a
                tocarlo y cerrar el tutorial ahí era lo contrario de lo pedido. */}
            {hole && !waiting ? (
              <AnimatedPressable
                accessibilityLabel={frame?.last ? 'Entendido' : 'Siguiente paso'}
                accessibilityRole="button"
                onPress={advance}
                style={{
                  position: 'absolute',
                  left: hole.x - HALO,
                  top: hole.y - HALO,
                  width: hole.width + HALO * 2,
                  height: hole.height + HALO * 2,
                  borderRadius: radii.lg,
                }}
              />
            ) : null}

            {waiting ? null : placement ? (
              <View
                pointerEvents="box-none"
                style={[
                  {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                  },
                  placement.side === 'below' ? { top: placement.top } : { bottom: placement.bottom },
                ]}
              >
                {content}
              </View>
            ) : (
              <View
                pointerEvents="box-none"
                style={{
                  ...StyleSheet.absoluteFill,
                  paddingTop: insets.top + spacing.lg,
                  paddingBottom: insets.bottom + spacing.lg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {content}
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
  );
}
