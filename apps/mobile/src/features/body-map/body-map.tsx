import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
// En SDK 57 expo-router trae React Navigation embebido y no lo reexporta: este
// es el mismo módulo que usa su `Tabs`, así que el contexto es el mismo objeto.
// Si una actualización de expo-router lo mueve, el type-check lo dirá.
import { BottomTabBarHeightContext } from 'expo-router/build/react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  alpha,
  bodyMapColors,
  colors,
  fontSizes,
  iconSizes,
  motion,
  overlay,
  radii,
  semibold,
  spacing,
} from '@/theme';
import {
  clampTransform,
  containFrame,
  contentToViewBox,
  dimPathData,
  HIGHLIGHT,
  hitTest,
  IDENTITY,
  IMAGE_ASPECT,
  muscleInfo,
  pointsToViewBox,
  REGION_VIEWBOX,
  REGIONS,
  screenToContent,
  toPathData,
  zoomAbout,
  type BodyLayer,
  type BodyView,
} from '@gymsheet/anatomy';
import { IMAGES } from './images';
import { Segmented } from './segmented';

const VIEW_OPTIONS = [
  { value: 'front', label: 'Frente' },
  { value: 'back', label: 'Espalda' },
] as const;

const LAYER_OPTIONS = [
  { value: 'surface', label: 'Externa' },
  { value: 'deep', label: 'Profunda' },
] as const;

/** Radio de tolerancia del dedo, en puntos de pantalla, a cualquier zoom. */
const FINGER_SLOP_POINTS = 14;
/** Lo que tarda en abrirse el músculo tras el toque: lo justo para ver el resaltado. */
const OPEN_DELAY_MS = 260;
const ZOOM_STEP = 1.6;

/**
 * Pastilla de vidrio sobre la figura. Va encima de la imagen, así que lleva
 * desenfoque propio para que el texto se lea pase lo que pase por debajo.
 */
function Glass({ children, round = false }: { children: React.ReactNode; round?: boolean }) {
  return (
    <View
      style={{
        borderRadius: radii.full,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: overlay.glass,
        ...(round ? { width: 40, height: 40 } : null),
      }}
    >
      <BlurView intensity={40} style={StyleSheet.absoluteFill} tint="systemThinMaterialDark" />
      {children}
    </View>
  );
}

function Chip({
  icon,
  label,
  onPress,
  active = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  active?: boolean;
}) {
  return (
    <Glass>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        hitSlop={6}
        onPress={() => {
          void Haptics.selectionAsync();
          onPress();
        }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs + 2,
          height: 36,
          paddingHorizontal: spacing.md - 2,
          backgroundColor: active ? bodyMapColors.chipActive : 'transparent',
          opacity: pressed ? 0.6 : 1,
        })}
      >
        <Ionicons color={active ? colors.text : colors.textMuted} name={icon} size={iconSizes.sm} />
        <Text
          style={{
            color: active ? colors.text : colors.textMuted,
            fontSize: fontSizes.xs,
            fontWeight: semibold,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Glass>
  );
}

/** Botón redondo de zoom, de vidrio, sobre la figura. */
function ZoomButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Glass round>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        hitSlop={4}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => ({
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.55 : 1,
        })}
      >
        <Ionicons color={colors.text} name={icon} size={iconSizes.md} />
      </Pressable>
    </Glass>
  );
}

/**
 * Lo que ocupa la pantalla de Ejercicios por encima y por debajo de la figura:
 * el margen superior, el título y su subtítulo, el selector de cara y capa con
 * sus separaciones y un respiro sobre la barra de pestañas. Con esto la figura
 * entera, con todos sus controles, cabe en la primera pantalla sin desplazarse.
 */
const SCREEN_CHROME = 32 + 70 + 32 + 44 + spacing.md + spacing.md;
/** Franjas reservadas dentro de la tarjeta: herramientas arriba, texto abajo. */
const FIGURE_INSET_TOP = 26;
const FIGURE_INSET_BOTTOM = 34;
/** Por debajo de esto un músculo pequeño ya no se acierta con el dedo. */
const MIN_FIGURE_HEIGHT = 380;

/**
 * La figura anatómica interactiva.
 *
 * Una imagen renderizada (superficial o profunda, de frente o de espalda) con
 * una capa SVG encima que contiene la silueta de cada músculo tal y como se ve.
 * Tocar resuelve el músculo en JS con el mismo contorno que luego se resalta,
 * de modo que lo que se ilumina es exactamente lo que se detectó.
 *
 *  - Pellizcar acerca (hasta 4×) hacia donde están los dedos; con zoom, un dedo
 *    arrastra. A escala 1 el arrastre queda desactivado para no robarle el
 *    desplazamiento a la página.
 *  - El toque tolera un dedo (`FINGER_SLOP_POINTS`): los músculos finos miden
 *    pocos puntos y nadie apunta con precisión de píxel.
 *  - Con «reducir movimiento» no hay fundidos ni retardo: el cambio es directo.
 */
export function BodyMap({
  onSelectMuscle,
  onOpenList,
}: {
  onSelectMuscle: (code: string) => void;
  /** Abre la lista de todos los músculos: la alternativa accesible a la figura. */
  onOpenList: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? insets.bottom;

  const [view, setView] = useState<BodyView>('front');
  const [layer, setLayer] = useState<BodyLayer>('surface');
  const [selected, setSelected] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  // Antes de medir se estima con el ancho de pantalla menos los márgenes de
  // `Screen`: así la figura reserva su alto desde el primer fotograma y la
  // página no salta cuando llega la medida real.
  const [width, setWidth] = useState(windowWidth - spacing.lg * 2);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tag = `${layer}-${view}` as const;
  const regions = REGIONS[tag] ?? [];
  // La figura ocupa lo que queda de pantalla, sin pasar de la proporción de la
  // imagen ni bajar del mínimo en que los músculos pequeños se aciertan.
  const available = windowHeight - insets.top - tabBarHeight - SCREEN_CHROME;
  const height = Math.round(Math.min(width * 2, Math.max(MIN_FIGURE_HEIGHT, available)));
  const size = useMemo(() => ({ width, height }), [width, height]);
  // La lámina se encaja dejando libres la franja de las herramientas (arriba) y
  // la del texto (abajo): sin eso la cabeza quedaba bajo los botones y la
  // pista se escribía encima de los pies.
  const frame = useMemo(() => {
    const inner = containFrame(
      { width: size.width, height: Math.max(1, size.height - FIGURE_INSET_TOP - FIGURE_INSET_BOTTOM) },
      IMAGE_ASPECT,
    );
    return { ...inner, y: inner.y + FIGURE_INSET_TOP };
  }, [size]);

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const baseScale = useSharedValue(1);
  const baseTx = useSharedValue(0);
  const baseTy = useSharedValue(0);
  const startFocalX = useSharedValue(0);
  const startFocalY = useSharedValue(0);
  const boxWidth = useSharedValue(0);
  const boxHeight = useSharedValue(0);

  useEffect(() => {
    boxWidth.value = size.width;
    boxHeight.value = size.height;
  }, [size, boxWidth, boxHeight]);

  const animateTo = useCallback(
    (next: { scale: number; tx: number; ty: number }) => {
      const config = { duration: reduceMotion ? 0 : motion.enter };
      scale.value = withTiming(next.scale, config);
      tx.value = withTiming(next.tx, config);
      ty.value = withTiming(next.ty, config);
      setZoomed(next.scale > 1.02);
    },
    [reduceMotion, scale, tx, ty],
  );

  const resetZoom = useCallback(() => animateTo(IDENTITY), [animateTo]);

  // Cambiar de cara o de capa es otra geometría: se vuelve a la vista completa.
  useEffect(() => {
    setSelected(null);
    resetZoom();
  }, [tag, resetZoom]);

  // Al volver de la pantalla del músculo, la figura queda sin resaltar.
  useFocusEffect(
    useCallback(() => {
      setSelected(null);
      return () => {
        if (openTimer.current) clearTimeout(openTimer.current);
      };
    }, []),
  );

  const choose = useCallback(
    (code: string) => {
      void Haptics.selectionAsync();
      setSelected(code);
      if (openTimer.current) clearTimeout(openTimer.current);
      openTimer.current = setTimeout(() => onSelectMuscle(code), reduceMotion ? 0 : OPEN_DELAY_MS);
    },
    [onSelectMuscle, reduceMotion],
  );

  const handleTap = useCallback(
    (x: number, y: number, currentScale: number, currentTx: number, currentTy: number) => {
      const content = screenToContent({ x, y }, { scale: currentScale, tx: currentTx, ty: currentTy }, size);
      const point = contentToViewBox(content, frame, REGION_VIEWBOX);
      if (!point) {
        setSelected(null);
        return;
      }
      const slop = pointsToViewBox(FINGER_SLOP_POINTS, frame, REGION_VIEWBOX, currentScale);
      const hit = hitTest(regions, point.x, point.y, slop);
      if (hit) choose(hit.code);
      else setSelected(null);
    },
    [choose, frame, regions, size],
  );

  const gesture = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart((event) => {
        baseScale.value = scale.value;
        baseTx.value = tx.value;
        baseTy.value = ty.value;
        startFocalX.value = event.focalX;
        startFocalY.value = event.focalY;
      })
      .onUpdate((event) => {
        const container = { width: boxWidth.value, height: boxHeight.value };
        const zoomedAtStart = zoomAbout(
          { scale: baseScale.value, tx: baseTx.value, ty: baseTy.value },
          baseScale.value * event.scale,
          { x: startFocalX.value, y: startFocalY.value },
          container,
        );
        // Dos dedos que además se desplazan arrastran la figura.
        const next = clampTransform(
          {
            scale: zoomedAtStart.scale,
            tx: zoomedAtStart.tx + (event.focalX - startFocalX.value),
            ty: zoomedAtStart.ty + (event.focalY - startFocalY.value),
          },
          container,
        );
        scale.value = next.scale;
        tx.value = next.tx;
        ty.value = next.ty;
      })
      .onEnd(() => {
        const snapped = scale.value < 1.04;
        if (snapped) {
          scale.value = withTiming(1);
          tx.value = withTiming(0);
          ty.value = withTiming(0);
        }
        runOnJS(setZoomed)(!snapped);
      });

    const pan = Gesture.Pan()
      .enabled(zoomed)
      .minDistance(6)
      .maxPointers(1)
      .onStart(() => {
        baseTx.value = tx.value;
        baseTy.value = ty.value;
      })
      .onUpdate((event) => {
        const next = clampTransform(
          { scale: scale.value, tx: baseTx.value + event.translationX, ty: baseTy.value + event.translationY },
          { width: boxWidth.value, height: boxHeight.value },
        );
        tx.value = next.tx;
        ty.value = next.ty;
      });

    const tap = Gesture.Tap()
      .maxDistance(10)
      .maxDuration(450)
      .onEnd((event, success) => {
        if (success) runOnJS(handleTap)(event.x, event.y, scale.value, tx.value, ty.value);
      });

    return Gesture.Race(Gesture.Simultaneous(pinch, pan), tap);
  }, [
    zoomed,
    handleTap,
    scale,
    tx,
    ty,
    baseScale,
    baseTx,
    baseTy,
    startFocalX,
    startFocalY,
    boxWidth,
    boxHeight,
  ]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const zoomBy = useCallback(
    (factor: number) => {
      const center = { x: size.width / 2, y: size.height / 2 };
      const next = zoomAbout({ scale: scale.value, tx: tx.value, ty: ty.value }, scale.value * factor, center, size);
      animateTo(next);
    },
    [animateTo, scale, size, tx, ty],
  );

  const selectedRegions = selected ? regions.filter((region) => region.code === selected) : [];
  const info = selected ? muscleInfo(selected) : undefined;
  const musclePaths = selectedRegions.map((region) => toPathData(region.rings));

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Segmented label="Cara del cuerpo" onChange={setView} options={VIEW_OPTIONS} value={view} />
        <Segmented label="Capa muscular" onChange={setLayer} options={LAYER_OPTIONS} value={layer} />
      </View>

      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width))}
        style={{
          height,
          borderRadius: radii.xl,
          overflow: 'hidden',
          backgroundColor: colors.surfaceLowest,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        }}
      >
        <GestureDetector gesture={gesture}>
          <View
            accessibilityHint="Toca un músculo para ver sus ejercicios. Para una lista, usa el botón Lista."
            accessibilityLabel="Figura anatómica interactiva"
            accessible
            style={StyleSheet.absoluteFill}
          >
            <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
              <Animated.View
                entering={reduceMotion ? undefined : FadeIn.duration(motion.enter)}
                exiting={reduceMotion ? undefined : FadeOut.duration(motion.exit)}
                key={tag}
                style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
              >
                <Image
                  accessibilityIgnoresInvertColors
                  cachePolicy="memory-disk"
                  contentFit="contain"
                  source={IMAGES[tag]}
                  style={{ width: '100%', height: '100%' }}
                  transition={0}
                />
              </Animated.View>

              {showZones ? (
                <Svg
                  height={frame.height}
                  pointerEvents="none"
                  style={{ position: 'absolute', left: frame.x, top: frame.y }}
                  viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`}
                  width={frame.width}
                >
                  {regions.map((region, index) => (
                    <Path
                      d={toPathData(region.rings)}
                      fill="none"
                      fillRule="evenodd"
                      key={`${region.code}-${index}`}
                      stroke={bodyMapColors.highlightStroke}
                      strokeOpacity={0.5}
                      strokeWidth={1.5}
                    />
                  ))}
                </Svg>
              ) : null}

              {selected ? (
                // El resaltado entra con un fundido corto: aparecer de golpe
                // se leía como un parpadeo, no como una respuesta al dedo.
                <Animated.View
                  entering={reduceMotion ? undefined : FadeIn.duration(HIGHLIGHT.fadeMs)}
                  key={`sel-${tag}-${selected}`}
                  pointerEvents="none"
                  style={{ position: 'absolute', left: frame.x, top: frame.y, width: frame.width, height: frame.height }}
                >
                  <Svg
                    height={frame.height}
                    viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`}
                    width={frame.width}
                  >
                    <Path
                      d={dimPathData(musclePaths, REGION_VIEWBOX.width, REGION_VIEWBOX.height)}
                      fill={HIGHLIGHT.dim}
                      fillOpacity={HIGHLIGHT.dimOpacity}
                      fillRule="evenodd"
                    />
                    {musclePaths.map((d, index) => (
                      <Path
                        d={d}
                        fill={HIGHLIGHT.fill}
                        fillOpacity={HIGHLIGHT.fillOpacity}
                        fillRule="evenodd"
                        key={index}
                        stroke={HIGHLIGHT.stroke}
                        strokeLinejoin="round"
                        strokeWidth={HIGHLIGHT.strokeWidth}
                      />
                    ))}
                  </Svg>
                </Animated.View>
              ) : null}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Arriba, las herramientas: a la izquierda qué se ve (zonas, lista),
            a la derecha cuánto se ve (zoom). Encima de la figura y no debajo,
            para que estén a la vista sin desplazar la página. */}
        <View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: spacing.sm + 4,
            left: spacing.sm + 4,
            right: spacing.sm + 4,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
        >
          <View pointerEvents="box-none" style={{ flex: 1, flexDirection: 'row', gap: spacing.sm }}>
            <Chip active={showZones} icon="scan-outline" label="Zonas" onPress={() => setShowZones((value) => !value)} />
            <Chip icon="list-outline" label="Lista" onPress={onOpenList} />
          </View>
          <View pointerEvents="box-none" style={{ gap: spacing.sm }}>
            <ZoomButton icon="add" label="Acercar" onPress={() => zoomBy(ZOOM_STEP)} />
            <ZoomButton icon="remove" label="Alejar" onPress={() => zoomBy(1 / ZOOM_STEP)} />
            {zoomed ? <ZoomButton icon="contract-outline" label="Volver a la vista completa" onPress={resetZoom} /> : null}
          </View>
        </View>

        {/* Abajo, el resultado: el músculo tocado o, sin selección, la pista
            de uso. Sobre un degradado para que se lea encima de las piernas. */}
        <LinearGradient
          colors={[alpha(colors.background, 0), alpha(colors.background, 0.86)]}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            paddingTop: spacing.lg,
            paddingBottom: spacing.sm + 4,
            paddingHorizontal: spacing.md + 2,
          }}
        >
          <Animated.View
            accessibilityLiveRegion="polite"
            entering={reduceMotion ? undefined : FadeIn.duration(HIGHLIGHT.fadeMs)}
            key={info ? info.code : zoomed ? 'pan' : 'hint'}
            style={{ gap: 2 }}
          >
            {info ? (
              <>
                <Text numberOfLines={1} style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: semibold }}>
                  {info.name}
                </Text>
                <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
                  {info.group.name} · {info.latinName}
                </Text>
              </>
            ) : (
              <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, textAlign: 'center' }}>
                {zoomed ? 'Arrastra para moverte' : 'Toca un músculo · pellizca para acercar'}
              </Text>
            )}
          </Animated.View>
        </LinearGradient>
      </View>
    </View>
  );
}
