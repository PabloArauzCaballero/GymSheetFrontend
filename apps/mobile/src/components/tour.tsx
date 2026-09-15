import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Button } from '@/components/ui';
import { PressableScale } from '@/components/motion';
import { useTourStore, type TargetRect, type TourKey } from '@/state/tour-store';
import { colors, fontSizes, iconSizes, radii, spacing, useActiveTenant } from '@/theme';

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
};

/**
 * What the app is, in the order someone actually meets it.
 *
 * Each step names a tab and says what it is *for*, not what it contains: "aquí
 * están tus rutinas" describes a screen, "esto responde qué te toca hoy"
 * describes a reason to open it. The difference is whether the tour teaches the
 * product or merely narrates the navigation bar.
 */
/**
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
    icon: 'albums-outline',
    title: 'Rutinas',
    body: 'Tu semana de un vistazo: qué toca hoy y qué días entrenas. Toca un día para abrir su rutina.',
  },
  {
    icon: 'barbell-outline',
    title: 'Ejercicios',
    body: 'El catálogo por zona del cuerpo y músculo, con la lámina de cada ejercicio para reconocerlo al instante.',
  },
  {
    icon: 'flame-outline',
    title: 'Entrenos',
    body: 'Registra series con un toque: repite la anterior o supera la de la semana pasada. El descanso arranca solo.',
  },
  {
    icon: 'person-outline',
    title: 'Tu perfil',
    body: 'Tus datos, tu membresía y la descarga de tu avance. Desde aquí puedes repetir todos estos tutoriales.',
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

/** Breathing room between the highlighted element and the hole cut around it. */
const HALO = 8;

/**
 * Marks an element as a tour anchor.
 *
 * Measurement is in window coordinates rather than layout coordinates because
 * the overlay is a `Modal`, which has its own coordinate space: a rect relative
 * to a scroll view would place the spotlight somewhere else entirely once the
 * user had scrolled.
 */
export function TourTarget({ id, children }: { id: string; children: ReactNode }) {
  const measure = useTourStore((state) => state.measure);
  const forget = useTourStore((state) => state.forget);
  const active = useTourStore((state) => state.active);
  const nonce = useTourStore((state) => state.nonce);
  const ref = useRef<View | null>(null);

  useEffect(() => () => forget(id), [forget, id]);

  const onLayout = useCallback(() => {
    // `measureInWindow` has to run after layout has been committed; calling it
    // inside onLayout itself returns the pre-commit frame on iOS.
    requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) measure(id, { x, y, width, height });
      });
    });
  }, [id, measure]);

  /**
   * Measure again when a tour opens.
   *
   * Layout is not the last word on where something is: the screen's entrance
   * animation, an image resolving, or a card appearing above this one all move
   * it after `onLayout` has already fired, and a spotlight drawn on the stale
   * rect lands next to the thing it means to point at. The moment the tour
   * opens is the only moment the position is guaranteed to matter, so that is
   * when it is read.
   */
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        if (width > 0 && height > 0) measure(id, { x, y, width, height });
      });
    }, 120);
    return () => clearTimeout(timer);
  }, [active, id, measure, nonce]);

  return (
    <View collapsable={false} onLayout={onLayout} ref={ref}>
      {children}
    </View>
  );
}

/**
 * Opens a screen's tour the first time that screen is reached.
 *
 * Deliberately not tied to focus events: re-entering a screen is not a new
 * first impression, and a tour that replays on every visit is the single most
 * effective way to make people stop reading tours.
 */
export function useScreenTour(key: Exclude<TourKey, 'welcome'>): void {
  const openOnce = useTourStore((state) => state.openOnce);
  const seen = useTourStore((state) => state.seen);
  useEffect(() => {
    if (seen === null) return;
    let retry: ReturnType<typeof setTimeout> | null = null;
    // A beat after mount so the screen's own entrance animation and the first
    // layout pass are done: highlighting a rect that is still moving reads as
    // a misaligned overlay rather than as a spotlight.
    const timer = setTimeout(() => {
      // El intento puede rebotar porque otro tour acaba de cerrarse —el caso
      // del arranque en frío, donde la bienvenida termina justo antes de que
      // esta pantalla monte—. Se vuelve a intentar una vez pasado el descanso
      // en lugar de perder el tutorial de la pantalla para siempre.
      if (openOnce(key)) return;
      retry = setTimeout(() => openOnce(key), 1400);
    }, 650);
    return () => {
      clearTimeout(timer);
      if (retry) clearTimeout(retry);
    };
  }, [key, openOnce, seen]);
}

/** The dimmed area, drawn as four rectangles around the hole. */
function Scrim({ hole }: { hole: TargetRect | null }) {
  const { width, height } = useWindowDimensions();
  const dim = 'rgba(0,0,0,0.86)';
  if (!hole) return <View style={{ position: 'absolute', inset: 0, backgroundColor: dim }} />;

  const top = Math.max(0, hole.y - HALO);
  const bottom = Math.min(height, hole.y + hole.height + HALO);
  const left = Math.max(0, hole.x - HALO);
  const right = Math.min(width, hole.x + hole.width + HALO);

  // Four solid bands rather than an SVG mask: no extra dependency, no
  // per-frame path, and on a dark theme the seams are invisible because every
  // band is the same colour.
  return (
    <>
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: top, backgroundColor: dim }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: bottom, bottom: 0, backgroundColor: dim }} />
      <View style={{ position: 'absolute', left: 0, width: left, top, height: bottom - top, backgroundColor: dim }} />
      <View style={{ position: 'absolute', left: right, right: 0, top, height: bottom - top, backgroundColor: dim }} />
      {/* The ring is what turns "a gap in the dimming" into "this thing here". */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left,
          top,
          width: right - left,
          height: bottom - top,
          borderRadius: radii.lg,
          borderWidth: 2,
          borderColor: colors.volt,
        }}
      />
    </>
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
 */
export function TourOverlay() {
  const active = useTourStore((state) => state.active);
  const step = useTourStore((state) => state.step);
  const setStep = useTourStore((state) => state.setStep);
  const complete = useTourStore((state) => state.complete);
  const targets = useTourStore((state) => state.targets);
  const scroller = useTourStore((state) => state.scroller);
  const { height } = useWindowDimensions();
  const tenant = useActiveTenant();
  const reduceMotion = useReducedMotion();

  const scale = useSharedValue(reduceMotion ? 1 : 0.86);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);

  const steps = active === 'welcome' ? WELCOME : active ? SCREEN_TOURS[active] : [];
  const rawStep = steps[step];
  // La bienvenida saluda con el nombre del gimnasio, no con el del producto: la
  // persona instaló la aplicación de su gimnasio y eso es lo que espera leer.
  const current = rawStep
    ? { ...rawStep, title: rawStep.title ?? `Bienvenido a ${tenant.name}` }
    : undefined;
  const isLast = step === steps.length - 1;
  const hole = current?.target ? (targets[current.target] ?? null) : null;

  useEffect(() => {
    if (!active) return;
    if (reduceMotion) {
      scale.value = 1;
      opacity.value = 1;
      return;
    }
    // Restart from slightly small on every step so the zoom is the transition,
    // not just the entrance.
    scale.value = 0.86;
    opacity.value = 0;
    scale.value = withSpring(1, { damping: 14, stiffness: 170, mass: 0.7 });
    opacity.value = withTiming(1, { duration: 220 });
  }, [active, opacity, reduceMotion, scale, step]);

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  /**
   * Bring the anchor into the band the spotlight can actually use.
   *
   * A tour that highlights something below the fold is worse than no tour: the
   * ring lands on the tab bar and the card explains a control the user cannot
   * see. The safe band excludes the top and bottom fifths — the callout card
   * occupies one of them, and which one depends on where the anchor sits — so
   * the target is nudged to sit comfortably inside it rather than merely
   * on-screen. The anchor's own re-measure then corrects the rect.
   */
  const targetId = current?.target ?? null;
  const anchor = targetId ? (targets[targetId] ?? null) : null;
  const anchorTop = anchor?.y ?? 0;
  const anchorHeight = anchor?.height ?? 0;
  /**
   * Which step has already been scrolled to.
   *
   * Without this the effect is a loop with the measurement it triggers:
   * scrolling moves the anchor, the new rect re-runs the effect, and if the
   * list cannot travel far enough — a target near the end of a short page —
   * the delta never falls under the threshold and the screen keeps jumping
   * under the user. One scroll per step, and the step is done.
   */
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!active) scrolledFor.current = null;
  }, [active]);
  useEffect(() => {
    if (!active || !anchor || !scroller) return;
    const stepKey = `${active}:${step}`;
    if (scrolledFor.current === stepKey) return;
    const safeTop = height * 0.22;
    const safeBottom = height * 0.78;
    const bottom = anchorTop + anchorHeight;
    const delta =
      bottom > safeBottom
        ? bottom - safeBottom
        : anchorTop < safeTop
          ? anchorTop - safeTop
          : 0;
    // A pixel or two of drift is not worth a scroll animation under the user.
    if (Math.abs(delta) < 12) {
      scrolledFor.current = stepKey;
      return;
    }
    scrolledFor.current = stepKey;
    // Antes del primer desplazamiento se anota dónde estaba la lista, para
    // devolverla ahí al cerrar el tour.
    useTourStore.getState().rememberOffset();
    scroller.scrollBy(delta);
    // The scroll is animated, so the anchor is still moving; read it again once
    // it has landed or the ring stays where the element used to be.
    //
    // The timers deliberately outlive this effect instead of being cleared by
    // its cleanup. Scrolling changes `anchorTop`, which re-runs the effect,
    // and a cleanup here would cancel the very re-measure the scroll just
    // made necessary — leaving the ring drawn around wherever the element used
    // to be, which is what makes a spotlight point at the wrong card. Two
    // readings rather than one because the settle time depends on the travel
    // distance and the device, and a stale ring is worse than a redundant
    // measurement. `remeasure` is a no-op when the rect has not changed.
    settleTimers.current.forEach(clearTimeout);
    settleTimers.current = [
      setTimeout(() => useTourStore.getState().remeasure(), 260),
      setTimeout(() => useTourStore.getState().remeasure(), 700),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps -- position only
  }, [active, anchorHeight, anchorTop, height, scroller, step]);

  // Pending re-measures are only abandoned when the tour itself goes away.
  const settleTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (active) return;
    settleTimers.current.forEach(clearTimeout);
    settleTimers.current = [];
  }, [active]);
  useEffect(
    () => () => {
      settleTimers.current.forEach(clearTimeout);
    },
    [],
  );

  /**
   * Which side of the hole the callout sits on.
   *
   * Not «the opposite half of the screen» — that rule put the card below a
   * target sitting just above centre, and on a shorter phone the card then ran
   * off the bottom with its own button unreachable. What decides it is which
   * gap is actually bigger: the space above the hole or the space below it.
   * The card goes in the roomier one, whatever half the target is in.
   */
  const spaceAbove = hole ? hole.y - HALO : 0;
  const spaceBelow = hole ? height - (hole.y + hole.height + HALO) : 0;
  /** True cuando cabe mejor encima del elemento. */
  const cardAbove = hole ? spaceAbove > spaceBelow : false;

  const close = () => void complete();
  const advance = () => (isLast ? close() : setStep(step + 1));
  const visible = active !== null && current !== undefined;

  return (
    <Modal
      animationType="fade"
      // Android: sin esto el boton fisico de atras no hace nada y el tutorial
      // se convierte en la trampa que este componente existe para evitar.
      onRequestClose={close}
      // Android: el Modal es una ventana aparte y, sin esto, empieza bajo la
      // barra de estado. Las posiciones que miden los anclajes son de la
      // ventana de la app, asi que el foco se dibujaria desplazado justo esa
      // altura. Con la ventana translucida ambos espacios coinciden.
      statusBarTranslucent
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
      <View style={{ flex: 1 }}>
        {/* Tocar fuera cierra. Un tutorial a pantalla completa que sólo se deja
            salir por su propio botón es indistinguible de una app colgada, y
            quien lo sufre no vuelve a leer ninguno. */}
        {current === undefined ? null : (
          <>
        <Pressable
          accessibilityLabel="Cerrar tutorial"
          onPress={close}
          style={StyleSheet.absoluteFill}
        >
          <Scrim hole={hole} />
        </Pressable>

        <View
          style={{
            flex: 1,
            padding: spacing.lg,
            alignItems: 'center',
            justifyContent: hole ? (cardAbove ? 'flex-start' : 'flex-end') : 'center',
          }}
        >
          <Animated.View
            style={[
              {
                width: '100%',
                maxWidth: 420,
                // Techo real: si el hueco junto al elemento no da para toda la
                // tarjeta, ésta se queda dentro y su contenido se desplaza, en
                // vez de salirse de la pantalla llevándose el botón con ella.
                maxHeight: hole
                  ? Math.max(220, (cardAbove ? spaceAbove : spaceBelow) - spacing.lg)
                  : undefined,
                gap: spacing.md,
                alignItems: hole ? 'flex-start' : 'center',
                padding: hole ? spacing.lg : spacing.xl,
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
              },
              animated,
            ]}
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
            {steps.length > 1 ? (
              <View style={{ flexDirection: 'row', gap: spacing.xs, paddingVertical: spacing.xs }}>
                {steps.map((item, index) => (
                  <View
                    key={item.title ?? index}
                    style={{
                      width: index === step ? 18 : 6,
                      height: 6,
                      borderRadius: radii.full,
                      backgroundColor: index === step ? colors.volt : colors.surfaceHighest,
                    }}
                  />
                ))}
              </View>
            ) : null}

            <View style={{ width: '100%', gap: spacing.sm }}>
              <Button label={isLast ? 'Entendido' : 'Siguiente'} onPress={advance} />
              {!isLast ? (
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
        </View>
          </>
        )}
      </View>
    </Modal>
  );
}
