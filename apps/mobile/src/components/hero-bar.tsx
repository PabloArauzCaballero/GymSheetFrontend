import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { alpha, colors, glassButton, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/**
 * Desplazamiento vertical de la pantalla, en el hilo de UI. Lo publica
 * `ScrollScreen`; la portada y la barra lo leen para moverse con el dedo sin
 * pasar por React.
 */
const ScrollYContext = createContext<SharedValue<number> | null>(null);

export const ScrollYProvider = ScrollYContext.Provider;

/** El desplazamiento de la pantalla; fuera de un `ScrollScreen`, un valor quieto en 0. */
export function useScrollY(): SharedValue<number> {
  const fallback = useSharedValue(0);
  return useContext(ScrollYContext) ?? fallback;
}

/** Botón redondo de vidrio que flota sobre una imagen (volver, ⋯). */
export function GlassButton({
  icon,
  label,
  onPress,
  testID,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      haptic="none"
      onPress={onPress}
      scaleTo={0.9}
      style={{
        width: minTouchTarget,
        height: minTouchTarget,
        borderRadius: radii.full,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: glassButton.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      testID={testID}
    >
      <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glassButton.bg }]} />
      <Ionicons color={glassButton.ink} name={icon} size={iconSizes.md + 2} />
    </PressableScale>
  );
}

export type HeroBarProps = {
  /** Lo que pasa a la barra cuando la portada ya se fue: el nombre de la pantalla. */
  title: string;
  onBack: () => void;
  onMore?: () => void;
  backTestID?: string;
  moreTestID?: string;
};

/**
 * Barra fija sobre una pantalla con portada. Volver y ⋯ no se van con el
 * scroll (antes se perdían con la imagen y había que subir para salir); cuando
 * la portada queda atrás, la barra se vuelve vidrio y el título de la portada
 * aparece en ella. Se funde la opacidad de un vidrio quieto: animar el
 * desenfoque repinta cada fotograma.
 */
export function HeroBar({
  title,
  onBack,
  onMore,
  backTestID,
  moreTestID,
  topInset,
  gutter,
  heroHeight,
}: HeroBarProps & { topInset: number; gutter: number; heroHeight: number }) {
  const scrollY = useScrollY();
  const reduceMotion = useReduceMotion();
  const barHeight = topInset + minTouchTarget + spacing.sm * 2;
  // El vidrio entra en el último tramo de la portada, cuando el título de la
  // imagen está a punto de pasar bajo la barra.
  const start = Math.max(0, heroHeight - barHeight - 96);
  const end = Math.max(start + 1, heroHeight - barHeight - 24);

  const glass = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [start, end], [0, 1], Extrapolation.CLAMP),
  }));
  const label = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [end - 16, end + 24], [0, 1], Extrapolation.CLAMP),
    transform: [
      {
        translateY: reduceMotion
          ? 0
          : interpolate(scrollY.value, [end - 16, end + 24], [8, 0], Extrapolation.CLAMP),
      },
    ],
  }));

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: barHeight }}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glass]}>
        <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="dark" />
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: alpha(colors.background, 0.84),
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: colors.border,
            },
          ]}
        />
      </Animated.View>
      <View
        pointerEvents="box-none"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.smd,
          paddingTop: topInset + spacing.sm,
          paddingHorizontal: gutter,
        }}
      >
        <GlassButton icon="chevron-back" label="Volver" onPress={onBack} testID={backTestID} />
        <Animated.View pointerEvents="none" style={[{ flex: 1 }, label]}>
          <Text accessibilityElementsHidden numberOfLines={1} style={{ textAlign: 'center' }} variant="headline">
            {title}
          </Text>
        </Animated.View>
        {onMore ? (
          <GlassButton icon="ellipsis-horizontal" label="Más opciones" onPress={onMore} testID={moreTestID} />
        ) : (
          <View style={{ width: minTouchTarget }} />
        )}
      </View>
    </View>
  );
}

/**
 * La portada con el dedo: al subir se queda un poco atrás y se apaga, así el
 * contenido pasa por encima en vez de empujarla. Solo
 * `transform` y `opacity`. Con «Reducir movimiento» se desplaza sin más.
 */
export function HeroParallax({ children, height }: { children: ReactNode; height: number }) {
  const scrollY = useScrollY();
  const reduceMotion = useReduceMotion();
  const animated = useAnimatedStyle(() => {
    if (reduceMotion || height === 0) return {};
    const y = scrollY.value;
    // Al tirar hacia abajo la portada baja con el contenido (rebote del sistema) y
    // deja sitio al indicador de recarga. Estirarla ampliaba también el título y
    // lo sacaba por el margen izquierdo.
    if (y <= 0) return { opacity: 1, transform: [{ translateY: 0 }, { scale: 1 }] };
    return {
      opacity: interpolate(y, [0, height * 0.85], [1, 0.25], Extrapolation.CLAMP),
      transform: [{ translateY: y * 0.28 }, { scale: 1 }],
    };
  });
  return <Animated.View style={animated}>{children}</Animated.View>;
}
