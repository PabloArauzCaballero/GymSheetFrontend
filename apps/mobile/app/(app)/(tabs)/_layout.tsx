import { use, useCallback, useEffect, useState } from 'react';
import { Animated, Easing, StyleSheet, View, useWindowDimensions, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  BottomTabBar,
  BottomTabBarHeightCallbackContext,
  type BottomTabBarButtonProps,
  type BottomTabBarProps,
} from 'expo-router/build/react-navigation/bottom-tabs';
import { PlatformPressable } from 'expo-router/build/react-navigation/elements';
import ReAnimated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  interactionsAlertTotal,
  useInteractionCounts,
} from '@/components/interactions-counts';
import { TourTarget } from '@/components/tour';
import { socialService } from '@/api/services';
import { ACTIVE_BAR_SPACE, ActiveWorkoutBar, useActiveWorkout } from '@/features/workout/active-workout-bar';
import { accentContrast, alpha, colors, fontSizes, iconSizes, overlay, radii, semibold, shadows, spacing } from '@/theme';

/** Outline when resting, filled when active — the platform convention. */
const ICONS = {
  mensajes: ['chatbubbles-outline', 'chatbubbles'],
  comunidad: ['people-outline', 'people'],
  marketplace: ['storefront-outline', 'storefront'],
  routines: ['albums-outline', 'albums'],
  profile: ['person-outline', 'person'],
} as const satisfies Record<
  string,
  readonly [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]
>;

/**
 * El número en la barra: hasta 9, y «9+» a partir de ahí. La insignia vive
 * dentro del hueco del icono (31 pt) y recorta lo que no cabe: con 120
 * solicitudes «99+» se leía «9…». Mismo tope que el selector de Mensajes.
 */
function tabBadge(count: number): string {
  return count > 9 ? '9+' : String(count);
}

/** Alto de la cápsula flotante (área táctil de 48 + aire). */
const FLOATING_BAR_HEIGHT = 64;
/** Ancho máximo de la cápsula: en tableta no se estira de borde a borde. */
const FLOATING_BAR_MAX_WIDTH = 440;

/**
 * Dónde flota la barra: separada de los lados y del borde inferior, por encima
 * del indicador de inicio. `offset` es el hueco bajo la cápsula; las pantallas
 * reservan `offset + alto` (ver `TabBarWithWorkout`).
 */
function useFloatingTabBar() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const side = Math.max(spacing.mdl, (width - FLOATING_BAR_MAX_WIDTH) / 2);
  // Con indicador de inicio (34 pt) la cápsula se apoya justo encima; sin él,
  // un margen propio para que no toque el borde.
  const offset = insets.bottom > 0 ? Math.max(insets.bottom - spacing.smd, spacing.sm) : spacing.smd;
  return { side, offset, height: FLOATING_BAR_HEIGHT };
}

/**
 * Cambio de pestaña: un fundido corto, sin viaje ni escala.
 *
 * Antes la escena entera se deslizaba, se escalaba y se fundía a la vez que su
 * contenido hacía su propia entrada escalonada (`EnterUp`/`Reveal`): dos
 * animaciones encima de otra, y en iPhone se leía como un tirón. Una barra de
 * pestañas es un interruptor lateral, no una navegación: lo que cambia es el
 * contenido, y el fundido basta para que el ojo lo registre.
 */
const sceneStyleInterpolator = ({ current }: { current: { progress: Animated.Value } }) => ({
  sceneStyle: {
    opacity: current.progress.interpolate({
      inputRange: [-1, 0, 1],
      outputRange: [0, 1, 0],
    }),
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
  return function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
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
    // La píldora del destino activo: se abre desde el centro del icono (0.9 → 1
    // de 0 a 1 en opacidad, más rápido el ancho que el alto). Dice «estás aquí»
    // con un solo relleno jade suave, sin latir ni moverse sola.
    const pill = useAnimatedStyle(() => {
      const on = (scale.value - 0.9) / 0.1;
      return { opacity: on, transform: [{ scaleX: 0.55 + on * 0.45 }, { scaleY: 0.8 + on * 0.2 }] };
    });

    return (
      // El icono es el ancla del tutorial de bienvenida: la tarjeta que habla de
      // «Rutinas» señala el botón real de Rutinas, no una lista abstracta.
      <TourTarget grow={10} id={`tab.${screen}`}>
        <ReAnimated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: -8, bottom: -8, left: -18, right: -18, borderRadius: radii.full, backgroundColor: alpha(colors.volt, 0.22) },
            pill,
          ]}
        />
        <ReAnimated.View style={style}>
          <Ionicons color={color} name={ICONS[screen][focused ? 1 : 0]} size={iconSizes.lg} />
        </ReAnimated.View>
      </TourTarget>
    );
  };
}

/**
 * El vidrio de la cápsula. El recorte va aquí y no en la barra: con
 * `overflow: 'hidden'` en la barra se perdería su sombra. El velo tintado
 * garantiza contraste para los iconos donde no hay desenfoque (Android viejo,
 * web) y con «Reducir transparencia».
 */
/**
 * El botón de cada pestaña, centrado. El de la librería alinea su contenido
 * arriba (deja sitio a la etiqueta de debajo); sin etiqueta, el icono quedaba
 * pegado al techo de la cápsula.
 */
function TabBarButton(props: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} style={[props.style, { justifyContent: 'center' }]} />;
}

function TabBarBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { borderRadius: radii.full, overflow: 'hidden' }]}>
      <BlurView intensity={60} style={StyleSheet.absoluteFill} tint="systemChromeMaterialDark" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: alpha(colors.surfaceHigh, 0.9) }]} />
    </View>
  );
}

/**
 * La barra de pestañas con la mini-barra del entreno abierto encima (C8.3.9).
 * Intercepta el alto que la barra comunica al navegador y le suma el de la
 * mini-barra: así las pantallas (`ScrollScreen`, sus pies fijos) reservan los
 * dos y nada queda debajo.
 */
function TabBarWithWorkout(props: BottomTabBarProps) {
  const report = use(BottomTabBarHeightCallbackContext);
  const [height, setHeight] = useState(0);
  const active = useActiveWorkout();
  const floating = useFloatingTabBar();
  const extra = active ? ACTIVE_BAR_SPACE : 0;
  const onHeight = useCallback((next: number) => setHeight(next), []);
  // La barra flota: lo que tapa es su alto MÁS el hueco que la separa del
  // borde. Sin sumarlo, la última fila de cada lista quedaba bajo la cápsula.
  useEffect(() => {
    if (height > 0) report?.(height + floating.offset + extra);
  }, [extra, floating.offset, height, report]);
  return (
    <>
      <BottomTabBarHeightCallbackContext.Provider value={onHeight}>
        <BottomTabBar {...props} />
      </BottomTabBarHeightCallbackContext.Provider>
      {active && height > 0 ? (
        <ActiveWorkoutBar active={active} bottom={height + floating.offset} side={floating.side} />
      ) : null}
    </>
  );
}

/**
 * Cinco destinos, en este orden por pedido de Pablo (08/11/2026):
 * Mensajes (historias y chats) · Comunidad · Marketplace · Rutinas · Perfil.
 * Inicio salió de la barra y vive en la pila padre (`../home.tsx`); la app
 * abre en Mensajes. Mensajes y Marketplace eran pantallas de la pila
 * (`comunidad-mensajes`, `directorio`) y se movieron a esta carpeta: un
 * `Tabs.Screen` tiene que resolver a un archivo de aquí. Las URLs no cambian
 * porque los grupos no aparecen en la ruta.
 *
 * Antes: Inicio · Rutinas · Comunidad · Perfil. Settings is reachable from Profile instead of taking a
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
  const floating = useFloatingTabBar();
  /**
   * Quien quiere conectar contigo, en el icono de Mensajes. Misma clave que la
   * vista de Solicitudes: el número sale de la caché que esa pantalla ya
   * mantiene, y una solicitud respondida lo baja en los dos sitios a la vez.
   * Sin él, con la barra solo de iconos, una solicitud nueva no se veía hasta
   * entrar a buscarla.
   */
  const pending = useQuery({
    queryKey: ['social', 'connections', 'PENDING'],
    queryFn: () => socialService.listConnections('PENDING'),
    staleTime: 60_000,
  });
  const requests = (pending.data ?? []).filter((connection) => connection.direction === 'RECEIVED').length;
  const badgeStyle = {
    backgroundColor: colors.volt,
    color: accentContrast(),
    fontSize: fontSizes.xs,
    fontWeight: semibold,
  } as const;

  return (
    <Tabs
      // Un toque de selección al cambiar de pestaña. Sólo cuando la pestaña
      // cambia de verdad: pulsar la que ya está activa no es una selección, y un
      // golpe ahí hace que la barra «vibre» sin que haya pasado nada.
      screenListeners={({ navigation }) => ({
        tabPress: () => {
          if (!navigation.isFocused()) void Haptics.selectionAsync();
        },
      })}
      tabBar={(props) => <TabBarWithWorkout {...props} />}
      screenOptions={{
        headerShown: false,
        // Una pestaña que no se ve no se vuelve a pintar (sus consultas siguen
        // llegando a la caché y se pintan al volver). Lo que corre en segundo
        // plano —el descanso, su háptico y su aviso— vive en el store, no aquí.
        freezeOnBlur: true,
        animation: 'fade',
        sceneStyleInterpolator,
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 180,
            easing: Easing.bezier(0.2, 0, 0, 1),
          },
        },
        // La tinta legible del acento, no el acento a pelo: el rojo de la marca
        // mide 4,22:1 sobre la barra (ver `theme/index.ts`) y la etiqueta activa
        // es texto de 10 pt, justo donde el contraste no se puede regatear.
        tabBarActiveTintColor: colors.accentInk,
        tabBarInactiveTintColor: colors.textMuted,
        // Solo iconos (pedido del 11/11/2026). El nombre sigue siendo la
        // etiqueta accesible que compone el navegador —«Rutinas, tab, 4 of 5»—,
        // así que VoiceOver y los selectores de prueba no pierden nada. Y se
        // acaba el «Marketpl…»: cinco etiquetas no cabían en un iPhone.
        tabBarShowLabel: false,
        // Una cápsula flotante encima del teclado tapa justo el campo en el que
        // se escribe: con el teclado abierto, la barra se aparta.
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: { fontSize: fontSizes.xs, fontWeight: semibold },
        tabBarItemStyle: { height: floating.height, justifyContent: 'center', paddingVertical: 0 },
        // Cinco pestañas desde el 08/11/2026 (en C4 eran cuatro; antes cinco, no seis). Cinco es el techo que este proyecto ya se había
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
        //
        // La barra flota sobre el contenido con un vidrio esmerilado: la lista
        // sigue viéndose, desenfocada, al pasar por debajo, que es lo que da
        // profundidad sin añadir ningún elemento. `Screen` reserva su altura
        // al final del scroll para que nada quede tapado.
        //
        // Desde el 11/11/2026 la barra es una cápsula flotante: separada de
        // los lados y del borde inferior, con radio completo y sombra e2. El
        // contenido pasa por debajo y alrededor, y la barra se lee como un
        // objeto sobre la pantalla en vez de como el suelo de la pantalla.
        tabBarStyle: {
          position: 'absolute',
          left: floating.side,
          right: floating.side,
          bottom: floating.offset,
          height: floating.height,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: spacing.sm,
          borderRadius: radii.full,
          borderCurve: 'continuous',
          borderWidth: StyleSheet.hairlineWidth,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: overlay.glass,
          borderTopColor: overlay.glass,
          backgroundColor: 'transparent',
          boxShadow: shadows.e2,
          elevation: 0,
        },
        tabBarBackground: TabBarBackground,
        tabBarButton: TabBarButton,
      }}
    >
      <Tabs.Screen
        name="comunidad-mensajes"
        options={{
          title: 'Mensajes',
          tabBarAccessibilityLabel:
            requests > 0
              ? `Mensajes, ${requests} ${requests === 1 ? 'solicitud' : 'solicitudes'} por responder, tab`
              : undefined,
          tabBarBadge: requests > 0 ? tabBadge(requests) : undefined,
          tabBarBadgeStyle: badgeStyle,
          tabBarIcon: tabIcon('mensajes'),
        }}
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
          tabBarBadge: alerts > 0 ? tabBadge(alerts) : undefined,
          // Relleno de acento con la tinta de contraste de la marca. El rojo
          // por defecto de React Navigation significa «error» en el resto de
          // la app, y aquí no hay nada roto: hay gente esperando.
          tabBarBadgeStyle: badgeStyle,
          tabBarIcon: tabIcon('comunidad'),
        }}
      />
      <Tabs.Screen
        name="directorio"
        options={{ title: 'Marketplace', tabBarIcon: tabIcon('marketplace') }}
      />
      <Tabs.Screen
        name="routines"
        options={{ title: 'Rutinas', tabBarIcon: tabIcon('routines') }}
      />
      <Tabs.Screen name="profile" options={{ title: 'Perfil', tabBarIcon: tabIcon('profile') }} />
    </Tabs>
  );
}
