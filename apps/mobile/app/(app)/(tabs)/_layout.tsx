import { useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import ReAnimated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAuthStore } from '@/state/auth-store';
import { useTourStore } from '@/state/tour-store';
import { TourOverlay } from '@/components/tour';
import {
  formatBadgeCount,
  interactionsAlertTotal,
  useInteractionCounts,
} from '@/components/interactions-counts';
import { accentContrast, colors, fontSizes, iconSizes, semibold } from '@/theme';

/** Outline when resting, filled when active — the platform convention. */
const ICONS = {
  home: ['home-outline', 'home'],
  routines: ['albums-outline', 'albums'],
  exercises: ['barbell-outline', 'barbell'],
  comunidad: ['people-outline', 'people'],
  profile: ['person-outline', 'person'],
} as const satisfies Record<
  string,
  readonly [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]
>;

/**
 * How far a scene travels on a tab change. Small on purpose: the tab bar is a
 * lateral switch, not a push, so the movement should read as the content
 * settling into place rather than as navigating somewhere else.
 */
const SCENE_TRAVEL = 28;

/**
 * Directional tab transition.
 *
 * `progress` is -1 when a screen sits to the left of the active tab, +1 when it
 * sits to the right. Feeding that straight into translateX means each section
 * enters from the side its own icon occupies in the bar: tapping Perfil (last)
 * brings it in from the right, tapping Inicio (first) from the left. The stock
 * `shift` preset moves everything the same way regardless, which is what makes
 * the bar feel like five unrelated screens rather than one strip you slide along.
 *
 * Fade and a slight scale ride along so the change still registers when two
 * sections look alike; travel alone would be nearly invisible between, say,
 * Rutinas and Ejercicios.
 */
const sceneStyleInterpolator = ({ current }: { current: { progress: Animated.Value } }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
    transform: [
      {
        translateX: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [-SCENE_TRAVEL, 0, SCENE_TRAVEL],
        }),
      },
      {
        scale: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0.96, 1, 0.96],
        }),
      },
    ],
  },
});

/**
 * The icon answers the tap before the screen does. A tab bar where only the
 * fill changes gives no physical feedback, so the press reads as if nothing
 * happened until the content catches up.
 *
 * A spring rather than a timing curve: the settle is the whole point, and its
 * overshoot is what makes the bar feel responsive instead of merely correct.
 */
function tabIcon(screen: keyof typeof ICONS) {
  return function TabIcon({ color, focused }: { color: string; focused: boolean }) {
    const reduceMotion = useReducedMotion();
    const scale = useSharedValue(focused ? 1 : 0.9);

    useEffect(() => {
      const target = focused ? 1 : 0.9;
      if (reduceMotion) {
        scale.value = target;
        return;
      }
      // `damping: 11` rebotaba a ojo. La identidad de movimiento de esta app
      // está escrita en `motion.tsx` y dice lo contrario — «Premium: se asienta,
      // no rebota», con `overshootClamping` en el muelle de pulsación—, así que
      // el único elemento permanentemente en pantalla era justo el que no la
      // seguía. Mismos valores que `PRESS_SPRING`.
      scale.value = withSpring(target, {
        damping: 26,
        stiffness: 340,
        mass: 0.5,
        overshootClamping: true,
      });

      // Aquí vivía un latido infinito en el icono activo, «para que la barra no
      // se sintiera parada». Se ha quitado, por dos motivos:
      //
      // 1. Es decoración. El skill de dirección de arte que gobierna este
      //    rediseño pide movimiento que comunique estado y causalidad, y lista
      //    «motion on every hover» y «simultaneous unrelated animations» entre
      //    lo que hay que evitar. Qué pestaña está activa ya lo dicen el relleno
      //    del icono y el color; el latido no añade información, sólo compite
      //    con el contenido por la mirada, de forma permanente.
      // 2. Es una animación que nunca termina en el elemento que nunca se
      //    desmonta — el coste no lo paga una pantalla, lo paga la sesión
      //    entera.
      return () => {
        // Cancelar al desmontar es obligatorio en esta rama («limpieza de
        // efectos en unmount, obligatoria») y no se estaba haciendo en ninguna
        // de las animaciones de la app.
        cancelAnimation(scale);
      };
    }, [focused, reduceMotion, scale]);

    const style = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <ReAnimated.View style={style}>
        <Ionicons color={color} name={ICONS[screen][focused ? 1 : 0]} size={iconSizes.lg} />
      </ReAnimated.View>
    );
  };
}

/**
 * Six destinations. Settings is reachable from Profile instead of taking a
 * slot of its own — it is visited rarely and belongs to the account.
 *
 * Comunidad used to be a stack sibling reached only through a NavRow buried
 * at the bottom of Perfil — invisible unless someone scrolled there on
 * purpose, which is not how a social feature earns first use. Pablo asked
 * for it where a dating app puts Discovery: in the bar, always one tap away.
 * That meant moving the screen itself into this folder, not just adding an
 * icon — a `Tabs.Screen` has to resolve to a real file here.
 *
 * The rest used to share this navigator with four more (Ajustes, Editar
 * perfil, Membresía, Notificaciones) hidden behind `href: null`. Hiding a tab
 * removes its button but not its membership: VoiceOver still announced
 * «Inicio, pestaña, 1 de 9» over a bar with fewer reachable destinations.
 * Those four live as siblings in the parent stack (`../_layout.tsx`), which
 * is where a pushed screen belongs anyway.
 */
export default function TabsLayout() {
  /**
   * El badge de Comunidad.
   *
   * Mismo total que el icono de Interacciones de la cabecera de Comunidad —
   * likes recibidos más visitas nuevas— y la misma consulta: una sola clave
   * con un minuto de frescura, compartida por los dos sitios. Sin eso, la
   * barra de pestañas, que vive toda la sesión, pediría los contadores en cada
   * cambio de pantalla y los dos números podrían no coincidir.
   */
  const counts = useInteractionCounts();
  const alerts = interactionsAlertTotal(counts.data);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        sceneStyleInterpolator,
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 280,
            // Decelerating curve: the incoming section arrives quickly and
            // settles, instead of drifting in at a constant rate.
            easing: Easing.bezier(0.2, 0, 0, 1),
          },
        },
        tabBarActiveTintColor: colors.volt,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSizes.xs, fontWeight: semibold },
        // Cinco pestañas, no seis. Es el techo que este proyecto ya se había
        // fijado —«cinco es el techo de una barra inferior antes de que las
        // etiquetas empiecen a truncarse», en `(app)/_layout.tsx`— y la regla
        // por la que Trayectoria y Descubrir viven en el stack y no aquí.
        // Comunidad entró como sexta saltándosela.
        //
        // El síntoma se veía en el simulador: «Comunidad» no cabe en 1/6 del
        // ancho de un iPhone y se leía «Comuni…». Los puntos suspensivos acaban
        // además en el árbol de accesibilidad, así que VoiceOver anunciaba el
        // nombre cortado y un selector que buscara «Comunidad» no encontraba
        // nada.
        //
        // Las dos salidas puramente técnicas se probaron y ninguna vale: bajar
        // el cuerpo de letra no resuelve (a 11pt y a 10pt sigue cortándose,
        // porque lo que manda es el ancho del ítem), y cambiar la etiqueta por
        // un componente que encoja le quita al navegador la cadena con la que
        // nombra el botón — el árbol pasaba de «Rutinas, tab, 2 of 6» a un
        // simple «Rutinas», sin rol ni posición. Las dos hacen que el problema
        // deje de verse; ninguna lo arregla.
        //
        // La causa era el número de destinos, así que se corrige ahí.
        tabBarStyle: { backgroundColor: colors.surfaceLow, borderTopColor: colors.borderSubtle },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Inicio', tabBarIcon: tabIcon('home') }} />
      <Tabs.Screen
        name="routines"
        options={{ title: 'Rutinas', tabBarIcon: tabIcon('routines') }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ title: 'Ejercicios', tabBarIcon: tabIcon('exercises') }}
      />
      <Tabs.Screen
        name="comunidad"
        options={{
          title: 'Comunidad',
          // El badge es una vista que pinta el navegador: VoiceOver lo
          // anunciaría como un número suelto detrás del nombre, sin decir de
          // qué es. Por eso la cuenta va en la etiqueta.
          //
          // Pero sólo cuando hay algo que contar. Fijar una etiqueta propia
          // **sustituye** a la que iOS compone —«Comunidad, tab, 4 of 5»—, y
          // esa cuenta de posición es justamente lo que orienta a quien navega
          // por voz. Sin novedades no hay nada que añadir, así que se deja la
          // nativa; con ellas se antepone el aviso y se conserva el resto.
          tabBarAccessibilityLabel:
            alerts > 0
              ? `Comunidad, ${alerts} ${alerts === 1 ? 'novedad' : 'novedades'}, tab`
              : undefined,
          tabBarBadge: alerts > 0 ? formatBadgeCount(alerts) : undefined,
          // Relleno de acento con la tinta de contraste de la marca. El rojo
          // por defecto de React Navigation significa «error» en el resto de
          // la app, y aquí no hay nada roto: hay gente esperando.
          tabBarBadgeStyle: {
            backgroundColor: colors.volt,
            color: accentContrast(),
            fontSize: fontSizes.xs,
            fontWeight: semibold,
          },
          tabBarIcon: tabIcon('comunidad'),
        }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: tabIcon('profile') }} />
    </Tabs>
  );
}
