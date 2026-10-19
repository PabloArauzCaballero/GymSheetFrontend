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
import { AmbientBackground } from '@/components/ambient';
import { ReppLogo } from '@/components/brand/repp-mark';
import { EnterUp } from '@/components/motion';
import { Text as AppText } from '@/components/text';
import { BenefitList } from '@/features/first-impression/benefit-list';
import { valuePitch, type Benefit } from '@/features/first-impression/copy';
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
 * Es el embudo que va de la App Store al alta (#124 ASO: continuidad con la
 * ficha), así que arriba no va el formulario sino **qué es la app**: logotipo,
 * un titular y una línea, legibles en tres segundos por quien no sabe nada de
 * ella. En el alta, además, tres filas con lo que se lleva. Todo eso cabe sobre
 * el pliegue de un iPhone SE (667 pt) con el teclado cerrado.
 *
 * Debajo, la **tarjeta** con el formulario y su propio encabezado, más pequeño:
 * el protagonista es la propuesta, el formulario es el paso siguiente. Los
 * campos van sobre un plano propio porque el fondo ambiental se mueve.
 *
 * **Scroll**: el alta tiene seis campos y no cabe en un teléfono pequeño con el
 * teclado abierto; sin scroll, «Crear cuenta» quedaba fuera de alcance.
 *
 * Movimiento: cinco `EnterUp` como mucho (logo, titular, línea, beneficios,
 * tarjeta), sin bucles. El fondo ambiental queda exactamente como estaba.
 */
export function AuthShell({
  title,
  description,
  benefits,
  children,
  footer,
}: {
  /** Encabezado del formulario, dentro de la tarjeta. */
  title: string;
  description?: string;
  /** Lo que se lleva quien se registra; sólo en el alta. */
  benefits?: readonly Benefit[];
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
            paddingVertical: spacing.lg,
            gap: spacing.lg,
          }}
          keyboardDismissMode="on-drag"
          // Sin esto, el primer toque tras abrir el teclado sólo lo cierra: hay
          // que pulsar dos veces cada campo y cada botón.
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', gap: spacing.sm }}>
            <EnterUp index={0} style={{ alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs }}>
              {isRepp ? (
                <ReppLogo height={30} />
              ) : (
                <>
                  <BrandEmblem size={52} />
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
            </EnterUp>
            <EnterUp index={1}>
              <AppText accessibilityRole="header" style={{ textAlign: 'center' }} variant="display">
                {valuePitch.headline}
              </AppText>
            </EnterUp>
            <EnterUp index={2} style={{ maxWidth: 340 }}>
              <AppText style={{ textAlign: 'center' }} tone="secondary" variant="subhead">
                {valuePitch.subline}
              </AppText>
            </EnterUp>
            {benefits ? (
              <EnterUp index={3} style={{ marginTop: spacing.sm }}>
                <BenefitList items={benefits} />
              </EnterUp>
            ) : null}
          </View>

          <EnterUp
            index={benefits ? 4 : 3}
            style={{
              backgroundColor: colors.surfaceLow,
              borderRadius: radii.lg,
              borderCurve: 'continuous',
              borderWidth: 1,
              borderColor: colors.borderSubtle,
              padding: spacing.lg,
              gap: spacing.md,
            }}
          >
            <View style={{ gap: spacing.xs }}>
              <AppText variant="title">{title}</AppText>
              {description ? (
                <AppText tone="muted" variant="footnote">
                  {description}
                </AppText>
              ) : null}
            </View>
            {children}
          </EnterUp>

          {/* Centrado: los enlaces de pie cuelgan de la misma columna que el
              logotipo y el titular, no del margen izquierdo. */}
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
