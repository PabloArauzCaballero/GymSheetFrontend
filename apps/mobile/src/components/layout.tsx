import { Children, useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AmbientBackground } from '@/components/ambient';
import { useTourStore, type TourKey } from '@/state/tour-store';
import { CountUpText, EnterUp, Heartbeat, PressableScale } from '@/components/motion';
import { accentPolicy, cardGap, cardPadding, colors, fontSizes, iconSizes, maxContentWidth, maxWideContentWidth, minTouchTarget, radii, screenGap, sectionGap, semibold, spacing, tabletBreakpoint, tones } from '@/theme';

/**
 * One place decides what "wide" means, so a tablet layout cannot drift between
 * screens. Reads live dimensions rather than a device flag: a tablet in
 * portrait is narrow, and split-screen makes any device narrow.
 */
export function useResponsive(): { wide: boolean; width: number } {
  const { width } = useWindowDimensions();
  return { wide: width >= tabletBreakpoint, width };
}

/**
 * Side-by-side on a wide screen, stacked on a phone. The point is not symmetry
 * for its own sake: on a tablet a single column leaves most of the screen black
 * and the page reads as unfinished.
 */
export function Columns({ children }: { children: ReactNode }) {
  const { wide } = useResponsive();
  const items = Children.toArray(children).filter(Boolean);
  if (!wide || items.length < 2) return <>{children}</>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg }}>
      {items.map((child, index) => (
        // eslint-disable-next-line react/no-array-index-key -- positional slots
        <View key={index} style={{ flex: 1 }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * Screen chrome shared by every tab. Scrolls by default (a phone list always
 * outgrows the viewport), honours the notch through the top inset and leaves
 * room above the tab bar so the last card is never trapped under it.
 *
 * Horizontal insets follow the safe area too: in landscape on a notched device
 * the cutout eats into the side, and a fixed gutter would run content under it.
 * Past {@link maxContentWidth} the extra width becomes gutter instead of longer
 * lines, so text stays readable on a tablet.
 */
export function ScrollScreen({
  children,
  center = false,
  onRefresh,
  overlay,
  refreshing = false,
}: {
  children: ReactNode;
  /**
   * Centres content vertically when it is shorter than the viewport. For pages
   * that are a single short form — on a tablet those otherwise sit in the top
   * third with two thirds of empty screen under them.
   */
  center?: boolean;
  onRefresh?: () => void;
  /**
   * Pinned just above the tab bar, on top of the scrolling content. For state
   * that must stay reachable however far down the list the user has scrolled —
   * a running rest timer is useless if finding it costs a dozen swipes.
   */
  overlay?: ReactNode;
  refreshing?: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { wide, width } = useResponsive();
  const scrollRef = useRef<ScrollView | null>(null);
  const offsetRef = useRef(0);
  const registerScroller = useTourStore((state) => state.registerScroller);

  // Lets the guided tour bring an anchor into view.
  const scroller = useMemo(
    () => ({
      scrollBy: (deltaY: number) => {
        const next = Math.max(0, offsetRef.current + deltaY);
        offsetRef.current = next;
        scrollRef.current?.scrollTo({ y: next, animated: true });
      },
      scrollTo: (y: number) => {
        offsetRef.current = Math.max(0, y);
        scrollRef.current?.scrollTo({ y: offsetRef.current, animated: true });
      },
      getOffset: () => offsetRef.current,
    }),
    [],
  );
  /**
   * Se registra al RECIBIR EL FOCO, no al montar.
   *
   * Montar y estar a la vista no son lo mismo aquí. Las pestañas se quedan
   * montadas para siempre tras la primera visita, asi que registrar en el
   * montaje dejaba al tour moviendo la lista de la ultima pestaña *estrenada*
   * en vez de la que la persona tiene delante; y al cerrar una pantalla de la
   * pila, su desmontaje ponia el registro a `null` y la pestaña de debajo
   * —visible y montada, pero sin volver a montarse— se quedaba sin forma de
   * desplazarse. En ambos casos el foco del tutorial acababa señalando a un
   * sitio donde no habia nada.
   *
   * La limpieza solo borra lo que es suyo: al navegar, el foco de la pantalla
   * nueva y el desenfoque de la vieja no llegan en un orden garantizado, y sin
   * esta comprobacion la que se va puede borrar el registro que la que llega
   * acaba de dejar.
   */
  useFocusEffect(
    useCallback(() => {
      registerScroller(scroller);
      return () => {
        if (useTourStore.getState().scroller === scroller) registerScroller(null);
      };
    }, [registerScroller, scroller]),
  );
  // A two-column page needs room for two columns; keeping the phone cap on a
  // tablet is what leaves a narrow strip of content framed by black.
  const gutter = Math.max(spacing.lg, (width - (wide ? maxWideContentWidth : maxContentWidth)) / 2);
  // On Android the safe-area inset can come back shorter than the drawn status
  // bar, which left scrolled content half-visible under the clock.
  const topInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <AmbientBackground />
      <ScrollView
        // El desplazamiento se anota al terminar el gesto, no en cada
        // fotograma. `onScroll` con `scrollEventThrottle` instala un evento
        // animado en el puente, y coexistir con las animaciones nativas que ya
        // hay en pantalla hacía saltar «Sending `onAnimatedValueUpdate` with no
        // listeners registered» en cada scroll. El tour sólo necesita saber
        // dónde está la lista cuando va a moverla, no mientras el dedo viaja.
        onMomentumScrollEnd={(event) => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        onScrollEndDrag={(event) => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
        }}
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: topInset + spacing.xl,
          paddingBottom: insets.bottom + spacing['2xl'],
          paddingLeft: gutter + insets.left,
          paddingRight: gutter + insets.right,
          gap: screenGap,
          // flexGrow lets a short page fill the viewport so it can centre; a
          // tall one still scrolls normally because the content wins over it.
          ...(center ? { flexGrow: 1, justifyContent: 'center' as const } : null),
        }}
        // iOS does not resize the window when the keyboard opens the way
        // Android's `adjustResize` does, so a field in the lower half of a
        // scrolling form ends up behind the keyboard with no way to reach it.
        // This adds the keyboard's height as a content inset, which is the
        // native behaviour Android already had for free.
        automaticallyAdjustKeyboardInsets
        // Dragging the list down closes the keyboard, following the finger.
        keyboardDismissMode="interactive"
        // A tap on a button while the keyboard is open must hit the button,
        // not merely dismiss the keyboard and be swallowed.
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh
            ? // Volt spinner on black: the default is invisible on this theme.
              <RefreshControl
                colors={[colors.volt]}
                onRefresh={onRefresh}
                progressBackgroundColor={colors.surface}
                refreshing={refreshing}
                tintColor={colors.volt}
              />
            : undefined
        }
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>

      {overlay ? (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + spacing.md,
            left: gutter + insets.left,
            right: gutter + insets.right,
          }}
        >
          {overlay}
        </View>
      ) : null}

      {/* Opaque band over the status bar: without it, scrolled content slides
          under the clock and battery and the two become unreadable. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: topInset,
          backgroundColor: colors.background,
        }}
      />
    </View>
  );
}

/** Page title plus an optional line of context underneath. */
/**
 * Reabre la guía de una pantalla.
 *
 * Los tours se muestran solos una vez; este botón es el camino para volver a
 * verlos sin pasar por Perfil ni reiniciar todos. Vive en la cabecera porque es
 * donde se busca la ayuda de «esta» pantalla, y es discreto —glifo apagado
 * sobre superficie— para no competir con la acción principal.
 */
export function TourHelpButton({ tourKey }: { tourKey: Exclude<TourKey, 'welcome'> }) {
  const open = useTourStore((state) => state.open);
  return (
    <PressableScale
      accessibilityLabel="Ver la guía de esta pantalla"
      onPress={() => open(tourKey)}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surfaceHigh,
      }}
    >
      <Ionicons color={colors.textMuted} name="help" size={iconSizes.md} />
    </PressableScale>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  tourKey,
}: {
  title: string;
  subtitle?: string;
  /** Si se pasa, la cabecera ofrece «?» para repetir la guía de la pantalla. */
  tourKey?: Exclude<TourKey, 'welcome'>;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
      <Text
        accessibilityRole="header"
        // Caps the title at two lines: at the largest system text size a long
        // name would otherwise push the whole screen down.
        numberOfLines={2}
        style={{
          flex: 1,
          color: colors.text,
          // The one place the display size is used. A title only reads as a
          // title when the step down to body text is unmistakable; at 32 against
          // a 16 body it was merely "bigger", and the page leaned on colour for
          // hierarchy instead of on type.
          fontSize: fontSizes.display,
          // 600, no 800. Al tamaño de display el peso ya no aporta jerarquía —
          // la aporta el salto de tamaño— y lo que añade es densidad: la letra
          // se cierra sobre sí misma y la página se lee pesada. Un display
          // grande y ligero es lo que separa un titular compuesto de uno que
          // sólo es texto grande en negrita.
          fontWeight: semibold,
          // Optical tracking: large type set at default spacing looks loose and
          // amateur. Negative tracking is most of what separates a display face
          // from body text scaled up.
          letterSpacing: fontSizes.display * -0.03,
          lineHeight: fontSizes.display * 1.05,
        }}
      >
        {title}
      </Text>
      {tourKey ? <TourHelpButton tourKey={tourKey} /> : null}
      </View>
      {subtitle ? (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm, lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Groups related rows under a label, the way a settings list reads.
 *
 * `index` drives the entrance cascade: sections arrive in reading order so the
 * eye is led down the screen once, instead of everything landing at once.
 */
export function Section({
  title,
  children,
  icon,
  index = 0,
}: {
  title: string;
  children: ReactNode;
  /**
   * Glyph for the section label. A screen made of five identical grey
   * all-caps strings gives the eye nothing to aim at; a shape per section is
   * what lets someone find «Renovar» without reading the whole page. Optional
   * because a section whose icon would be arbitrary is better without one.
   */
  icon?: keyof typeof Ionicons.glyphMap;
  index?: number;
}) {
  return (
    <EnterUp index={index} style={{ gap: sectionGap }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        {icon ? (
          <Ionicons
            // Decorative: the label right next to it already says this.
            accessibilityElementsHidden
            color={accentPolicy.glyph}
            importantForAccessibility="no-hide-descendants"
            name={icon}
            size={iconSizes.sm}
          />
        ) : null}
        <Text
          accessibilityRole="header"
          style={{
            color: colors.textMuted,
            fontSize: fontSizes.xs,
            // La versalita ya destaca por forma y color; a 700 competía con los
            // títulos de las tarjetas que etiqueta.
            fontWeight: semibold,
            letterSpacing: fontSizes.xs * 0.1,
            textTransform: 'uppercase',
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </EnterUp>
  );
}

/**
 * Elevated surface. Pass `onPress` and it becomes tactile: the whole card
 * springs under the finger instead of only a child row reacting, which is what
 * made taps feel unanswered.
 */
export function Card({
  children,
  accent,
  onPress,
  accessibilityLabel,
  style,
}: {
  children: ReactNode;
  accent?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Escape hatch for a card that carries a whole screen, not a summary. */
  style?: StyleProp<ViewStyle>;
}) {
  const surface = {
    gap: cardGap,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderLeftWidth: accent ? 2 : 1,
    borderLeftColor: accent ?? colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
    padding: cardPadding,
  } as const;

  // Lo que había aquí y ya no está, y por qué:
  //
  // - Una sombra negra sobre un fondo negro. El comentario original lo admitía
  //   («shadows do nothing on black») y aun así declaraba cuatro propiedades
  //   de sombra. Código que no dibuja nada, mantenido como si dibujara.
  // - Un `borderTopColor` más claro que el resto del borde, para simular una
  //   arista iluminada. Ese truco pertenece a las interfaces que imitan
  //   materiales; aquí sólo desalineaba el contorno, porque un lado del marco
  //   no coincidía con los otros tres.
  //
  // La separación la da la luminancia de la superficie contra el fondo, que es
  // como se resuelve en un tema oscuro. Un borde de un solo tono, y ya.

  if (onPress) {
    return (
      <PressableScale
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={[surface, style]}
      >
        {children}
      </PressableScale>
    );
  }

  return <View style={[surface, style]}>{children}</View>;
}

/** Label on the left, value on the right — the workhorse of profile/settings. */
export function Row({
  label,
  value,
  icon,
  count,
  countSuffix = '',
}: {
  label: string;
  value: string;
  /**
   * Si llega, el valor se pinta contando desde 0 hasta `count` con
   * `countSuffix` detrás, en vez de `value`. `value` sigue siendo obligatorio:
   * es el texto final completo para quien no ve la cuenta.
   */
  count?: number;
  countSuffix?: string;
  /**
   * Glyph before the label. A stack of six label/value rows is the densest
   * thing in the app and the hardest to scan, because every line has the same
   * silhouette; a glyph gives each row an anchor the eye can return to.
   */
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        // 28 packed the rows tight enough that the dividers between them were
        // doing all the separating. At the touch-target height the row has its
        // own vertical space and the card reads as a list, not as a table.
        minHeight: minTouchTarget,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 }}>
        {icon ? (
          <Ionicons
            accessibilityElementsHidden
            color={accentPolicy.glyph}
            importantForAccessibility="no-hide-descendants"
            name={icon}
            size={iconSizes.sm}
          />
        ) : null}
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      </View>
      {typeof count === 'number' ? (
        <CountUpText
          style={{
            color: colors.text,
            fontSize: fontSizes.sm,
            fontWeight: semibold,
            textAlign: 'right',
            fontVariant: ['tabular-nums'],
          }}
          suffix={countSuffix}
          value={count}
        />
      ) : (
        <Text
          style={{
            color: colors.text,
            fontSize: fontSizes.sm,
            fontWeight: semibold,
            flexShrink: 1,
            textAlign: 'right',
          }}
        >
          {value}
        </Text>
      )}
    </View>
  );
}

/**
 * One number that matters, with its caption. Used in a row of three.
 *
 * The figure is the largest type in the app on purpose — in a training app the
 * number is the content. Tabular figures keep the three tiles optically aligned
 * whatever the digits are.
 */
export function StatTile({
  value,
  label,
  icon,
  delta,
  rate,
}: {
  value: string;
  label: string;
  /**
   * Cuánto aporta esta cifra a tus puntos, ya redactado («+50 c/u»). Solo en
   * las cifras que suman: una tarifa en todas diría que todo cuenta, y no.
   */
  rate?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /**
   * Change against the comparable previous period, already formatted. A number
   * with no direction is trivia; the same number with «+12 %» underneath is the
   * reason the tile exists. `null` when there is nothing to compare against —
   * which is different from a change of zero and must not render as one.
   */
  delta?: { label: string; direction: 'up' | 'down' | 'flat' } | null;
}) {
  const deltaTone =
    delta?.direction === 'up'
      ? tones.dark.success.text
      : delta?.direction === 'down'
        ? tones.dark.warning.text
        : colors.textMuted;
  return (
    <View
      style={{
        flex: 1,
        gap: spacing.xs,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        backgroundColor: colors.surface,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.md,
      }}
    >
      {icon ? (
        <Ionicons
          accessibilityElementsHidden
          color={accentPolicy.glyph}
          importantForAccessibility="no-hide-descendants"
          name={icon}
          size={iconSizes.sm}
        />
      ) : null}
      <Text
        adjustsFontSizeToFit
        // Without a floor, shrink-to-fit keeps going: a long value like a full
        // date would end up smaller than its own caption, which reads as a bug
        // rather than as a long value. Below this it truncates instead.
        minimumFontScale={0.55}
        numberOfLines={1}
        style={{
          // Near-white, not volt. Three tiles in a row all shouting in the
          // brand colour is what made these screens feel loud: the accent stops
          // meaning "look here" when everything wears it. Size and weight carry
          // the emphasis instead, and volt is left for the primary action.
          color: colors.text,
          fontSize: fontSizes['2xl'],
          fontWeight: semibold,
          fontVariant: ['tabular-nums'],
          letterSpacing: fontSizes['2xl'] * -0.045,
        }}
      >
        {value}
      </Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>{label}</Text>
      {rate ? (
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: spacing.xs,
            paddingVertical: 2,
            borderRadius: radii.full,
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <Text style={{ color: accentPolicy.ink, fontSize: fontSizes.xs, fontWeight: semibold }}>
            {rate}
          </Text>
        </View>
      ) : null}
      {delta ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
          <Ionicons
            accessibilityElementsHidden
            color={deltaTone}
            importantForAccessibility="no-hide-descendants"
            name={
              delta.direction === 'up'
                ? 'trending-up'
                : delta.direction === 'down'
                  ? 'trending-down'
                  : 'remove'
            }
            size={12}
          />
          <Text style={{ color: deltaTone, fontSize: fontSizes.xs, fontWeight: semibold }}>
            {delta.label}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export type BadgeTone = keyof typeof tones.dark;

/**
 * El chip late, y late aqui.
 *
 * Va en el componente compartido y no repetido en cada pantalla: es lo unico
 * que hace que «los chips laten en toda la aplicacion» siga siendo cierto
 * dentro de seis meses, cuando alguien añada el chip numero veinte sin haber
 * leido esto. Es el mismo latido que la web (`@keyframes chip-heartbeat`).
 *
 * `latido={false}` para el chip que ya vive dentro de algo que se mueve —una
 * tarjeta que entra, una baraja que se arrastra—: dos movimientos superpuestos
 * no suman, se pelean.
 */
export function Badge({
  label,
  tone = 'info',
  latido = true,
}: {
  label: string;
  tone?: BadgeTone;
  latido?: boolean;
}) {
  const palette = tones.dark[tone];
  const chip = (
    <View
      style={{
        alignSelf: 'flex-start',
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.bg,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
      }}
    >
      <Text style={{ color: palette.text, fontSize: fontSizes.xs, fontWeight: semibold }}>
        {label}
      </Text>
    </View>
  );
  return latido ? <Heartbeat>{chip}</Heartbeat> : chip;
}

/** Thin divider for stacked rows inside one card. */
export function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />;
}
