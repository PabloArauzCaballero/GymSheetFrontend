import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { type LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { colors, radii, spacing } from '@/theme';
import { toPathData } from './hit-test';
import { HIGHLIGHT, dimPathData } from './highlight';
import { IMAGES, type ImageTag } from './images';
import { AGGREGATES, muscleInfo } from './muscle-catalog';
import { boundsArea, boundsOf, placeBounds } from './region-fit';
import { REGIONS, REGION_VIEWBOX } from './regions.generated';
import type { BodyRegion } from './types';

/** Proporción de la cabecera (alto / ancho): apaisada, como una lámina. */
const ASPECT = 3 / 4;
/** Aire alrededor del músculo: con 1.5 la cabeza o los pies tocaban el borde. */
const PADDING = 1.9;
const TAGS: readonly ImageTag[] = ['surface-front', 'surface-back', 'deep-front', 'deep-back'];

/** La vista donde el músculo ocupa más: es donde mejor se lee. */
function bestView(codes: readonly string[]): { tag: ImageTag; regions: BodyRegion[] } | null {
  let best: { tag: ImageTag; regions: BodyRegion[]; area: number } | null = null;
  for (const tag of TAGS) {
    const regions = (REGIONS[tag] ?? []).filter((region) => codes.includes(region.code));
    const area = boundsArea(boundsOf(regions));
    if (area > (best?.area ?? 0)) best = { tag, regions, area };
  }
  return best;
}

/**
 * Cabecera de la pantalla de un músculo: la figura recortada y centrada en él,
 * con su silueta resaltada. Es la misma lámina y las mismas zonas de la figura
 * interactiva, solo que acercadas.
 *
 * Si el código no tiene zona (el sistema cardiovascular, o uno desconocido) no
 * pinta nada en vez de enseñar un cuerpo sin resaltar que no significa nada.
 */
export function MuscleHero({ code }: { code: string }) {
  const { width: windowWidth } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  // Se estima antes de medir para reservar el alto desde el primer fotograma.
  const [width, setWidth] = useState(windowWidth - spacing.lg * 2);
  const height = Math.round(width * ASPECT);
  const codes = AGGREGATES[code.toUpperCase()] ?? [code.toUpperCase()];
  const view = useMemo(() => bestView(codes), [codes.join('|')]);

  if (!view || !muscleInfo(code)) return null;
  const bounds = boundsOf(view.regions);
  const placement =
    bounds && width > 0
      ? placeBounds(bounds, { width, height }, REGION_VIEWBOX, { padding: PADDING })
      : null;
  const paths = view.regions.map((region) => toPathData(region.rings));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
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
      {placement ? (
        <View
          style={{
            position: 'absolute',
            left: placement.left,
            top: placement.top,
            width: placement.width,
            height: placement.height,
          }}
        >
          <Image
            accessibilityIgnoresInvertColors
            cachePolicy="memory-disk"
            contentFit="fill"
            source={IMAGES[view.tag]}
            style={{ width: '100%', height: '100%' }}
            transition={120}
          />
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(HIGHLIGHT.fadeMs * 2)}
            style={StyleSheet.absoluteFill}
          >
            <Svg
              height={placement.height}
              pointerEvents="none"
              viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`}
              width={placement.width}
            >
              <Path
                d={dimPathData(paths, REGION_VIEWBOX.width, REGION_VIEWBOX.height)}
                fill={HIGHLIGHT.dim}
                fillOpacity={HIGHLIGHT.dimOpacity}
                fillRule="evenodd"
              />
              {paths.map((d, index) => (
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
        </View>
      ) : null}
      {/* Los bordes de arriba y abajo se funden con la tarjeta: la lámina
          recortada no termina en un corte seco a media pierna. */}
      <LinearGradient
        colors={[colors.surfaceLowest, `${colors.surfaceLowest}00`]}
        pointerEvents="none"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: spacing.xl }}
      />
      <LinearGradient
        colors={[`${colors.surfaceLowest}00`, colors.surfaceLowest]}
        pointerEvents="none"
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: spacing.xl }}
      />
    </View>
  );
}
