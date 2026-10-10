import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text as RNText,
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
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { AmbientBackground } from '@/components/ambient';
import { DURATION, PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentContrast, accentPolicy, colors, comfortableTouchTarget, fontSizes, iconSizes, maxContentWidth, minTouchTarget, pressScale, pressSpring, radii, semibold, spacing, type TextVariant } from '@/theme';

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

/**
 * Alias de compatibilidad de `Text` (`components/text.tsx`). Acepta las
 * variantes antiguas (`title`, `body`, `muted`) y las de la rampa nueva.
 */
export function AppText({
  children,
  variant = 'body',
}: {
  children: ReactNode;
  variant?: 'muted' | TextVariant;
}) {
  if (variant === 'muted') {
    return (
      <Text tone="muted" variant="subhead">
        {children}
      </Text>
    );
  }
  return <Text variant={variant}>{children}</Text>;
}

/**
 * Variantes del botón (C8.2): `primary` (relleno de acento: una por pantalla),
 * `secondary` (relleno neutro), `ghost` (contorno de control ≥ 3:1) y
 * `destructive`. `danger` se mantiene como alias de `destructive`.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Tono por variante. Función y no constante: el acento depende del gimnasio,
 * que se resuelve en tiempo de ejecución.
 */
function buttonTone(variant: ButtonVariant): {
  background: string;
  ink: string;
  border: string;
} {
  switch (variant) {
    case 'primary':
      return { background: colors.volt, ink: accentContrast(), border: colors.volt };
    case 'secondary':
      return { background: colors.surfaceHighest, ink: colors.text, border: colors.surfaceHighest };
    case 'destructive':
    case 'danger':
      return { background: colors.danger, ink: colors.background, border: colors.danger };
    default:
      return { background: 'transparent', ink: colors.text, border: colors.borderControl };
  }
}

/** Alto mínimo 48 en todos los tamaños (C8.2): manos sudadas, en movimiento. */
const BUTTON_SIZES = {
  sm: { minHeight: comfortableTouchTarget, paddingHorizontal: spacing.md, fontSize: fontSizes.sm, radius: radii.md },
  md: { minHeight: 52, paddingHorizontal: spacing.mdl, fontSize: fontSizes.md, radius: radii.lg },
  lg: { minHeight: 56, paddingHorizontal: spacing.lg, fontSize: fontSizes.md, radius: radii.lg },
} as const;

/**
 * La superficie de acción. Responde al toque con un hundimiento a 0,97 (muelle
 * sin rebote; con «reducir movimiento», un cambio de opacidad).
 *
 * **Sin háptico por defecto** (C8.1): un Medium en cada botón deja de
 * significar nada. Los hápticos van donde dice el mapa: `selection` en
 * selectores, `light` al marcar una serie, `success` tras guardar (lo dispara
 * quien conoce el resultado) y `warning` en errores. `haptic` permite pedir uno
 * al contacto cuando la acción lo merece.
 */
export function Button({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  haptic = 'none',
  accessibilityHint,
  testID,
  style,
}: {
  label: string;
  onPress: () => void;
  /** Glifo antes de la etiqueta; decorativo (la etiqueta nombra la acción). */
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  haptic?: 'none' | 'selection' | 'light';
  accessibilityHint?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const tone = buttonTone(variant);
  const metrics = BUTTON_SIZES[size];
  const pressed = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animated = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pressed.value * 0.2 }
      : { transform: [{ scale: 1 - pressed.value * (1 - pressScale.button) }] },
  );

  const ink = isDisabled ? colors.textDisabled : tone.ink;
  const content = loading ? (
    <ActivityIndicator color={tone.ink} />
  ) : (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      {icon ? (
        <Ionicons
          accessibilityElementsHidden
          color={ink}
          importantForAccessibility="no-hide-descendants"
          name={icon}
          size={iconSizes.md}
        />
      ) : null}
      <RNText
        numberOfLines={1}
        style={{ color: ink, fontSize: metrics.fontSize, fontWeight: semibold }}
      >
        {label}
      </RNText>
    </View>
  );

  return (
    <AnimatedPressable
      accessibilityHint={accessibilityHint}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        if (isDisabled) return;
        pressed.value = withSpring(1, pressSpring);
        if (haptic === 'selection') void Haptics.selectionAsync();
        if (haptic === 'light') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, pressSpring);
      }}
      testID={testID}
      style={[
        {
          minHeight: metrics.minHeight,
          borderRadius: metrics.radius,
          borderCurve: 'continuous',
          overflow: 'hidden',
          borderWidth: variant === 'ghost' ? 1 : 0,
          borderColor: isDisabled ? colors.surfaceHigh : tone.border,
          backgroundColor: isDisabled ? colors.surfaceHigh : tone.background,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: metrics.paddingHorizontal,
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
  labelHidden = false,
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
  /**
   * Oculta la etiqueta visible y la deja solo para el lector de pantalla. Para
   * un buscador, donde la lupa y el texto de ayuda ya dicen qué es el campo y
   * una etiqueta «Buscar» encima sólo repetía lo mismo.
   */
  labelHidden?: boolean;
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
      {labelHidden ? null : (
        <RNText style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{label}</RNText>
      )}
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
          <PressableScale
            accessibilityHint="Alterna entre ocultar y mostrar lo que escribes"
            accessibilityLabel={revealed ? hideLabel : revealLabel}
            accessibilityState={{ selected: revealed }}
            haptic="none"
            hitSlop={spacing.sm}
            onPress={() => setRevealed((current) => !current)}
            scaleTo={0.9}
            style={{
              position: 'absolute',
              right: spacing.xs,
              height: minTouchTarget,
              width: minTouchTarget,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* El ojo se desvanece de un icono al otro: es el único indicio de
                que el campo cambió de estado sin leer lo que hay escrito. */}
            <Animated.View entering={FadeIn.duration(DURATION.quick)} key={revealed ? 'shown' : 'hidden'}>
              <Ionicons
                color={revealed ? colors.accentInk : colors.textMuted}
                name={revealed ? 'eye-off-outline' : 'eye-outline'}
                size={iconSizes.md}
              />
            </Animated.View>
          </PressableScale>
        ) : null}
      </View>
      {error ? (
        <RNText
          // Sin esto el mensaje aparece pero no se anuncia: quien no ve la
          // pantalla pulsa «Iniciar sesión», no ocurre nada, y nada le dice por
          // qué.
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={{ color: colors.danger, fontSize: fontSizes.xs }}
        >
          {error}
        </RNText>
      ) : null}
    </View>
  );
}
