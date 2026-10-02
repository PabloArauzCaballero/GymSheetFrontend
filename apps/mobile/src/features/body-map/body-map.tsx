import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import Svg, { Path } from 'react-native-svg';
import { colors, fontSizes, iconSizes, minTouchTarget, motion, radii, semibold, spacing } from '@/theme';
import { hitTest, toPathData } from './hit-test';
import { IMAGES } from './images';
import { muscleInfo } from './muscle-catalog';
import { IMAGE_ASPECT, REGIONS, REGION_VIEWBOX } from './regions.generated';
import { Segmented } from './segmented';
import type { BodyLayer, BodyView } from './types';
import {
  IDENTITY,
  clampTransform,
  containFrame,
  contentToViewBox,
  pointsToViewBox,
  screenToContent,
  zoomAbout,
} from './view-transform';

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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      hitSlop={6}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs + 2,
        minHeight: minTouchTarget - 8,
        paddingHorizontal: spacing.md - 2,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: active ? colors.accentInk : colors.border,
        backgroundColor: active ? `${colors.volt}14` : colors.surfaceHigh,
      }}
    >
      <Ionicons color={active ? colors.accentInk : colors.textMuted} name={icon} size={iconSizes.sm} />
      <Text
        style={{
          color: active ? colors.accentInk : colors.textMuted,
          fontSize: fontSizes.xs,
          fontWeight: semibold,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Botón redondo de zoom, sobre la figura. */
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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={4}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: radii.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${colors.surfaceHighest}e6`,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Ionicons color={colors.text} name={icon} size={iconSizes.md} />
    </Pressable>
  );
}

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
  const { height: windowHeight } = useWindowDimensions();

  const [view, setView] = useState<BodyView>('front');
  const [layer, setLayer] = useState<BodyLayer>('surface');
  const [selected, setSelected] = useState<string | null>(null);
  const [showZones, setShowZones] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [width, setWidth] = useState(0);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tag = `${layer}-${view}` as const;
  const regions = REGIONS[tag] ?? [];
  // La figura manda en el alto, pero nunca pasa de la proporción de la imagen.
  const height = Math.round(Math.min(windowHeight * 0.72, width * 2));
  const size = useMemo(() => ({ width, height }), [width, height]);
  const frame = useMemo(() => containFrame(size, IMAGE_ASPECT), [size]);

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
  const ready = width > 0;

  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Segmented label="Cara del cuerpo" onChange={setView} options={VIEW_OPTIONS} value={view} />
        <Segmented label="Capa muscular" onChange={setLayer} options={LAYER_OPTIONS} value={layer} />
      </View>

      <View
        onLayout={(event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width))}
        style={{
          height: ready ? height : 0,
          borderRadius: radii.xl,
          overflow: 'hidden',
          backgroundColor: colors.surfaceLowest,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        }}
      >
        {ready ? (
          <>
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

                  <Svg
                    height={frame.height}
                    pointerEvents="none"
                    style={{ position: 'absolute', left: frame.x, top: frame.y }}
                    viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`}
                    width={frame.width}
                  >
                    {showZones
                      ? regions.map((region, index) => (
                          <Path
                            d={toPathData(region.rings)}
                            fill="none"
                            fillRule="evenodd"
                            key={`${region.code}-${index}`}
                            stroke="#ffffff"
                            strokeOpacity={0.55}
                            strokeWidth={2}
                          />
                        ))
                      : null}
                    {selectedRegions.map((region, index) => (
                      <Path
                        d={toPathData(region.rings)}
                        fill={colors.volt}
                        fillOpacity={0.5}
                        fillRule="evenodd"
                        key={`sel-${region.code}-${index}`}
                        stroke={colors.volt}
                        strokeLinejoin="round"
                        strokeWidth={3}
                      />
                    ))}
                  </Svg>
                </Animated.View>
              </View>
            </GestureDetector>

            <View pointerEvents="box-none" style={{ position: 'absolute', right: spacing.sm + 4, bottom: spacing.sm + 4, gap: spacing.sm }}>
              {zoomed ? <ZoomButton icon="contract-outline" label="Volver a la vista completa" onPress={resetZoom} /> : null}
              <ZoomButton icon="add" label="Acercar" onPress={() => zoomBy(ZOOM_STEP)} />
              <ZoomButton icon="remove" label="Alejar" onPress={() => zoomBy(1 / ZOOM_STEP)} />
            </View>
          </>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: minTouchTarget - 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
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
            <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>
              {zoomed ? 'Arrastra para moverte' : 'Toca un músculo · pellizca para acercar'}
            </Text>
          )}
        </View>
        <Chip active={showZones} icon="scan-outline" label="Zonas" onPress={() => setShowZones((value) => !value)} />
        <Chip icon="list-outline" label="Lista" onPress={onOpenList} />
      </View>
    </View>
  );
}
