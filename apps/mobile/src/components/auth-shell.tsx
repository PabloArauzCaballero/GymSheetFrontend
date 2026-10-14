import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AmbientBackground } from '@/components/ambient';
import {
  accentContrast,
  accentGradient,
  brandNavy,
  onMedia,
  reppJade,
  alpha,
  colors,
  fontSizes,
  iconSizes,
  maxContentWidth,
  radii,
  semibold,
  spacing,
  useActiveTenant,
} from '@/theme';

const EMBLEM = 64;

function ReppWordmark({ width = 220 }: { width?: number }) {
  return (
    <Svg height={width * (230 / 700)} viewBox="0 0 700 230" width={width}>
      <Path
        d="M63 44 H139 C177 44 195 65 187 91 C182 109 167 120 147 126 L188 183 H142 L106 131 H83 L66 183 H22 L62 44 Z M91 76 L82 105 H121 C136 105 146 98 148 88 C150 80 143 76 131 76 Z"
        fill={onMedia.text}
      />
      <Path d="M62 119 L101 77 L126 77 L78 135 L45 183 L20 183 Z" fill={reppJade} />
      <Path
        d="M213 44 H337 L327 76 H245 L237 99 H309 L300 128 H228 L220 151 H303 L293 183 H169 Z"
        fill={onMedia.text}
      />
      <Path
        d="M357 44 H438 C476 44 494 63 485 94 C476 124 451 140 415 140 H379 L366 183 H326 Z M387 76 L378 109 H412 C427 109 438 101 441 89 C444 80 438 76 424 76 Z"
        fill={onMedia.text}
      />
      <Path
        d="M505 44 H586 C624 44 642 63 633 94 C624 124 599 140 563 140 H527 L514 183 H474 Z M535 76 L526 109 H560 C575 109 586 101 589 89 C592 80 586 76 572 76 Z"
        fill={onMedia.text}
      />
    </Svg>
  );
}

/**
 * La marca gráfica en pantalla.
 *
 * Es el mismo dibujo que la cortinilla de arranque —caja redondeada con el
 * degradado del acento, monograma en el color de contraste— reducido y sin
 * animación. Que coincidan importa: la cortinilla es lo primero que se ve al
 * abrir la aplicación y el acceso es lo segundo, así que cualquier diferencia
 * entre ambas se lee como un salto.
 *
 * El monograma es texto, no una imagen: hereda la tipografía y escala sin
 * bordes dentados.
 */
export function BrandEmblem({ size = EMBLEM }: { size?: number }) {
  const tenant = useActiveTenant();
  const gradient = accentGradient();
  const isRepp = tenant.name === 'REPP';

  return (
    <View
      // Decorativo: el nombre del gimnasio va justo debajo, en texto.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        borderRadius: size * 0.26,
        shadowColor: isRepp ? brandNavy : colors.volt,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: isRepp ? 0 : 0.55,
        shadowRadius: isRepp ? 0 : 26,
        elevation: isRepp ? 0 : 16,
      }}
    >
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.26,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: isRepp ? brandNavy : 'transparent',
        }}
      >
        {isRepp ? (
          <Svg height={size} viewBox="0 0 120 120" width={size}>
            <Path
              d="M25 19 H61 C82 19 94 31 88 48 C84 59 75 65 63 68 L88 101 H65 L42 70 H34 L24 101 H5 L25 19 Z M39 37 L34 54 H55 C64 54 70 50 71 43 C72 39 68 37 60 37 Z"
              fill={onMedia.text}
            />
            <Path d="M25 61 L48 37 H62 L34 71 L14 101 H3 Z" fill={reppJade} />
          </Svg>
        ) : (
          <>
            <LinearGradient
              colors={gradient}
              end={{ x: 1, y: 1 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
            <Text
              style={{
                color: accentContrast(),
                fontSize: size * 0.44,
                fontWeight: '800',
                letterSpacing: -size * 0.02,
                includeFontPadding: false,
              }}
            >
              {tenant.monogram}
            </Text>
          </>
        )}
      </View>
    </View>
  );
}

/**
 * El marco de las pantallas de sesión en el teléfono.
 *
 * Sustituye al `Screen` genérico en `(auth)`. Tres diferencias, todas por el
 * mismo motivo —que el acceso se parezca a lo que hace la web y a lo que
 * promete la cortinilla—:
 *
 * - **Emblema, título y descripción**, en vez de sólo el nombre del gimnasio y
 *   una línea suelta. Son los mismos textos que la web, servidos desde
 *   `@gymsheet/domain`.
 * - **Tarjeta** bajo la cabecera. El formulario tenía los campos flotando
 *   directamente sobre el fondo ambiental, que se mueve; un plano propio los
 *   separa por luminancia sin recurrir a sombras.
 * - **Scroll**. El alta tiene seis campos y no cabe en un teléfono pequeño con
 *   el teclado abierto: sin scroll, el botón «Crear cuenta» quedaba fuera de la
 *   pantalla y no había forma de llegar a él.
 */
export function AuthShell({
  title,
  description,
  eyebrow,
  children,
  footer,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const gutter = Math.max(spacing.lg, (width - maxContentWidth) / 2);
  const { wordmark } = useActiveTenant();
  const isRepp = wordmark === 'REPP';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <AmbientBackground />
      {/* Android redimensiona la ventana por su cuenta (`adjustResize`); fijar
          `behavior` allí haría que el layout saltara dos veces por un teclado. */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: gutter,
            paddingVertical: spacing.xl,
            gap: spacing.lg,
          }}
          keyboardDismissMode="on-drag"
          // Sin esto, el primer toque tras abrir el teclado sólo lo cierra: hay
          // que pulsar dos veces cada campo y cada botón.
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(320)} style={{ alignItems: 'center', gap: spacing.md }}>
            {isRepp ? (
              <ReppWordmark />
            ) : (
              <>
                <BrandEmblem />
                <Text
                  style={{
                    color: colors.text,
                    fontSize: fontSizes.sm,
                    fontWeight: semibold,
                    letterSpacing: 3,
                  }}
                >
                  {wordmark}
                </Text>
              </>
            )}
            {eyebrow ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <View
                  style={{
                    width: 3,
                    height: 12,
                    borderRadius: radii.full,
                    backgroundColor: colors.volt,
                  }}
                />
                <Text
                  style={{
                    color: colors.textMuted,
                    fontSize: fontSizes.xs,
                    fontWeight: semibold,
                    letterSpacing: 1.6,
                    textTransform: 'uppercase',
                  }}
                >
                  {eyebrow}
                </Text>
              </View>
            ) : null}
            <Text
              style={{
                color: colors.text,
                fontSize: fontSizes.xl,
                fontWeight: semibold,
                letterSpacing: -0.6,
                textAlign: 'center',
              }}
            >
              {title}
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                fontSize: fontSizes.sm,
                lineHeight: 22,
                textAlign: 'center',
              }}
            >
              {description}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(320).delay(60)}
            style={{
              backgroundColor: colors.surfaceLow,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            {children}
          </Animated.View>

          {/* Centrado, como en la web: los enlaces de pie cuelgan de la misma
              columna que el emblema y el título, no del margen izquierdo. */}
          {footer ? (
            <View style={{ alignItems: 'center', gap: spacing.xs }}>{footer}</View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * El aviso de que el servidor ha rechazado el envío.
 *
 * Gemelo de `AuthAlert` en la web, y el motivo de que exista es ése: el móvil
 * mandaba estos fallos al sistema de avisos flotantes, que aparece arriba,
 * dura unos segundos y desaparece. Un error de credenciales tiene que quedarse
 * junto al botón que lo produjo hasta que se corrija, no irse solo.
 */
export function AuthAlert({ message }: { message: string }) {
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        borderRadius: radii.md,
        borderWidth: 1,
        borderColor: colors.danger,
        backgroundColor: alpha(colors.danger, 0.12),
        padding: spacing.md,
      }}
    >
      <Ionicons
        accessibilityElementsHidden
        color={colors.danger}
        importantForAccessibility="no-hide-descendants"
        name="alert-circle-outline"
        size={iconSizes.md}
      />
      <Text style={{ color: colors.danger, fontSize: fontSizes.sm, flex: 1, lineHeight: 20 }}>
        {message}
      </Text>
    </View>
  );
}
