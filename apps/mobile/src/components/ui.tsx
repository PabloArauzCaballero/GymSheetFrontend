import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AmbientBackground } from '@/components/ambient';
import { accentContrast, accentPolicy, colors, fontSizes, iconSizes, maxContentWidth, minTouchTarget, radii, semibold, spacing } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Full-screen container that respects the safe area and applies the base background. */
export function Screen({ children }: { children: ReactNode }) {
  const { width } = useWindowDimensions();
  // The auth forms are short. Left at full width and pinned to the top they
  // occupy the first third of a tablet and leave the rest black, so the column
  // is capped and the whole block is centred.
  const gutter = Math.max(spacing.lg, (width - maxContentWidth) / 2);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* The auth screens used to be the only ones without it, which made the
          very first screen of the app the flattest one — plain black behind a
          form, while every screen after it was lit. */}
      <AmbientBackground />
      {/* The form is vertically centred, so on iOS the keyboard opens straight
          over the password field and the «Iniciar sesión» button — the two things
          the screen exists for. Android resizes the window itself
          (`adjustResize`), which is why `behavior` is left undefined there:
          setting it would make the layout jump twice for one keyboard. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            paddingHorizontal: gutter,
            paddingVertical: spacing.lg,
            gap: spacing.md,
          }}
        >
          {children}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Los enlaces de texto de las pantallas de sesión.
 *
 * Dos defectos que en el fondo son la misma decisión mal tomada:
 *
 * - **Color.** Iban en el acento, el mismo del botón que tienen justo encima.
 *   La política de acento de este proyecto lo reserva para *una* acción
 *   dominante por región; con el botón y dos enlaces vestidos igual, ninguno de
 *   los tres dice «yo soy lo que has venido a pulsar». Pasan al tono tranquilo
 *   que `accentPolicy` define precisamente para enlaces secundarios.
 * - **Tamaño del objetivo.** `Link` pinta un `Text`, y un `Text` mide lo que
 *   mide su línea: unos 20pt de alto, frente a los 44 que fija `minTouchTarget`
 *   y que respetan todos los demás controles de la app. El relleno vertical los
 *   sube a 44 sin mover nada de sitio.
 *
 * Es una función y no una constante porque el tono depende del gimnasio activo,
 * que se resuelve al iniciar sesión: una constante se quedaría con el primero
 * que cargara el módulo.
 */
export function textLinkStyle() {
  return {
    color: accentPolicy.quietLink,
    fontSize: fontSizes.sm,
    // 20 de línea + 12 + 12 = 44.
    paddingVertical: spacing.sm + spacing.xs,
  } as const;
}

export function AppText({
  children,
  variant = 'body',
}: {
  children: ReactNode;
  variant?: 'title' | 'body' | 'muted';
}) {
  const style = {
    // Misma regla que `ScreenHeader`: cuanto mayor el tamaño, menor el peso.
    title: { color: colors.text, fontSize: fontSizes.xl, fontWeight: semibold },
    body: { color: colors.text, fontSize: fontSizes.md },
    muted: { color: colors.textMuted, fontSize: fontSizes.sm },
  }[variant];
  return <Text style={style}>{children}</Text>;
}

export type ButtonVariant = 'primary' | 'danger' | 'ghost';

/**
 * Fill per variant — un color plano por variante, sin degradados.
 *
 * Antes cada botón lleno era un degradado de dos paradas con un velo blanco
 * animado encima. Tres capas para pintar un rectángulo. El degradado no se
 * leía como volumen sino como una superficie sucia, porque la rampa iba de un
 * volt más claro que la marca a uno más apagado: el color del botón principal
 * no era el color de la marca en ningún punto de su cara.
 *
 * Un relleno plano en el volt exacto es más limpio, se lee mejor sobre negro y
 * es lo que hace un botón nativo. La respuesta al toque la sigue dando la
 * escala, que es háptica y no decorativa.
 */
/**
 * Relleno por variante. Plano, no degradado.
 *
 * `dev` los traía en degradado; se mantiene la decisión de esta rama de dejarlos
 * planos, porque el degradado sobre un acento saturado a tamaño de botón lee
 * como un adorno de plantilla y no como una marca. Lo que sí se conserva de
 * `dev` es de dónde salen los colores: el acento y su contraste los fija el
 * inquilino, así que un gimnasio con marca clara no acaba con texto blanco
 * ilegible sobre su propio color.
 *
 * Es una función y no una constante porque el inquilino se resuelve en tiempo
 * de ejecución: una constante congelaría los colores del primero que cargara.
 */
function buttonTone(variant: ButtonVariant): {
  background: string;
  ink: string;
  border: string;
} {
  if (variant === 'primary') {
    return { background: colors.volt, ink: accentContrast(), border: colors.volt };
  }
  if (variant === 'danger') {
    return { background: colors.danger, ink: colors.background, border: colors.danger };
  }
  return { background: 'transparent', ink: colors.text, border: colors.border };
}

/**
 * Press spring for the primary action surface. Slightly livelier than the one
 * used for cards: a button is the thing the user came to hit, so it may answer
 * with more energy than a row that merely happens to be tappable. Still clamped
 * against overshoot, so it stays inside the app's Premium motion identity.
 */
const BUTTON_SPRING = { damping: 22, stiffness: 380, mass: 0.5, overshootClamping: true } as const;

/**
 * The action surface. Dos cosas responden al toque: la escala y un tic háptico.
 * Ambas son de compositor o fuera del hilo de JS, así que ninguna mueve el
 * layout de alrededor.
 */
export function Button({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  /**
   * Glifo antes de la etiqueta.
   *
   * Opcional y decorativo: el texto es el que nombra la acción, y el icono sólo
   * la hace reconocible de un vistazo cuando hay dos botones seguidos que
   * hacen cosas distintas —exportar en PDF frente a exportar en CSV—, que es
   * justo donde leer dos etiquetas parecidas cuesta más que ver dos formas
   * distintas. Un botón que se explica solo por su texto no necesita ninguno.
   */
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const tone = buttonTone(variant);
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - pressed.value * 0.04 }],
  }));

  const ink = isDisabled ? colors.textDisabled : tone.ink;
  const content = loading ? (
    <ActivityIndicator color={tone.ink} />
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {icon ? (
        <Ionicons
          // Oculto para lectores de pantalla: la etiqueta de al lado ya se
          // anuncia, y repetir el nombre del glifo sólo alarga el anuncio.
          accessibilityElementsHidden
          color={ink}
          importantForAccessibility="no-hide-descendants"
          name={icon}
          size={iconSizes.md}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={{
          color: ink,
          fontSize: fontSizes.md,
          fontWeight: '700',
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        if (isDisabled) return;
        pressed.value = withSpring(1, BUTTON_SPRING);
        // Fired on contact, not on release: the phone should answer the finger
        // at the moment of touch, not after the action resolves.
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, BUTTON_SPRING);
      }}
      style={[
        {
          minHeight: minTouchTarget,
          borderRadius: radii.md,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: isDisabled ? colors.surfaceHigh : tone.border,
          backgroundColor: isDisabled ? colors.surfaceHigh : tone.background,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: spacing.lg,
        },
        animated,
        style,
      ]}
    >
      {content}
    </AnimatedPressable>
  );
}

/**
 * Campo de texto del producto.
 *
 * Tres cosas se añadieron aquí para que el móvil y la web se comporten igual en
 * las pantallas de sesión:
 *
 * - `icon`: un glifo de cabecera dentro de la caja. Es **decorativo** y así se
 *   declara; el campo ya se anuncia por su etiqueta, y leer «sobre» antes de
 *   «Correo electrónico» sería leer el adorno.
 * - `revealable`: el interruptor del ojo, que sustituye a la casilla «Mostrar
 *   contraseña» suelta debajo del formulario. En el alta hay **dos** campos de
 *   contraseña y aquella casilla sólo revelaba el primero, justo el caso —que
 *   no coinciden— en el que hace falta ver los dos.
 * - El foco pinta el borde en el acento, no en blanco: es el mismo color con el
 *   que la web señala el campo activo.
 *
 * La visibilidad arranca siempre oculta y no se recuerda: revelar es una acción
 * sobre este formulario y este momento, no una preferencia que deba sobrevivir
 * a la siguiente sesión.
 */
export function Input({
  label,
  error,
  icon,
  revealable = false,
  revealLabel = 'Mostrar contraseña',
  hideLabel = 'Ocultar contraseña',
  onBlur,
  onFocus,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Añade el ojo y gestiona `secureTextEntry` por su cuenta. */
  revealable?: boolean;
  revealLabel?: string;
  hideLabel?: string;
}) {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // El orden importa: el error gana al foco. Un campo enfocado y a la vez
  // inválido tiene que seguir diciendo que está mal — si ganara el foco, el
  // único aviso desaparecería justo al ir a corregirlo.
  const borderColor = error ? colors.danger : focused ? colors.volt : colors.border;
  const glyphColor = error ? colors.danger : focused ? colors.accentInk : colors.textMuted;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        {icon ? (
          <Ionicons
            // Decorativo: el campo ya lleva su `accessibilityLabel`.
            accessibilityElementsHidden
            color={glyphColor}
            importantForAccessibility="no-hide-descendants"
            name={icon}
            size={iconSizes.md}
            style={{ position: 'absolute', left: spacing.md, zIndex: 1 }}
          />
        ) : null}
        <TextInput
          // La etiqueta de arriba es un `Text` hermano, y en React Native eso no
          // nombra al campo: VoiceOver anunciaba «campo de texto» a secas y había
          // que deducir cuál de los dos era por el orden de recorrido.
          accessibilityLabel={label}
          // iOS draws a light keyboard by default; against a black screen the
          // slab of white is the brightest thing in the app. Android ignores it.
          keyboardAppearance="dark"
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          // `textDisabled` daba 2,06:1 contra esta superficie, menos de la mitad
          // del 4,5:1 de AA. El marcador de posición es una instrucción («Nombre,
          // grupo muscular…»), no un adorno, y estaba más apagado que la propia
          // etiqueta del campo — al revés de como se lee un formulario.
          placeholderTextColor={colors.textMuted}
          style={{
            minHeight: minTouchTarget,
            borderRadius: radii.md,
            borderWidth: 1,
            // El campo no tenía **ningún** estado de foco: el borde en reposo da
            // 1,46:1 contra el relleno, así que un campo enfocado y uno inerte se
            // veían exactamente igual. La ADR-0003 §6 pide los siete estados.
            borderColor,
            backgroundColor: colors.surface,
            color: colors.text,
            paddingLeft: icon ? spacing.md * 2 + iconSizes.md : spacing.md,
            paddingRight: revealable ? spacing.md * 2 + iconSizes.md : spacing.md,
            fontSize: fontSizes.md,
          }}
          {...props}
          // Después de `props` a propósito: cuando el campo gestiona su propio
          // ojo, quien lo usa no debe poder fijar `secureTextEntry` por su
          // cuenta y dejar el interruptor mintiendo.
          {...(revealable ? { secureTextEntry: !revealed } : {})}
        />
        {revealable ? (
          <Pressable
            accessibilityHint="Alterna entre ocultar y mostrar lo que escribes"
            accessibilityLabel={revealed ? hideLabel : revealLabel}
            accessibilityRole="button"
            accessibilityState={{ selected: revealed }}
            hitSlop={spacing.sm}
            onPress={() => setRevealed((current) => !current)}
            style={{
              position: 'absolute',
              right: spacing.xs,
              height: minTouchTarget,
              width: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons
              color={revealed ? colors.accentInk : colors.textMuted}
              name={revealed ? 'eye-off-outline' : 'eye-outline'}
              size={iconSizes.md}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text
          // Sin esto el mensaje aparece pero no se anuncia: quien no ve la
          // pantalla pulsa «Iniciar sesión», no ocurre nada, y nada le dice por
          // qué.
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: fontSizes.xs }}
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
