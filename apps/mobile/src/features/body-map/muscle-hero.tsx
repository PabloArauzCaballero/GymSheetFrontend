import { useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors, radii } from '@/theme';
import { toPathData } from './hit-test';
import { IMAGES, type ImageTag } from './images';
import { AGGREGATES, muscleInfo } from './muscle-catalog';
import { boundsArea, boundsOf, placeBounds } from './region-fit';
import { REGIONS, REGION_VIEWBOX } from './regions.generated';
import type { BodyRegion } from './types';

const HEIGHT = 240;
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
  const [width, setWidth] = useState(0);
  const codes = AGGREGATES[code.toUpperCase()] ?? [code.toUpperCase()];
  const view = useMemo(() => bestView(codes), [codes.join('|')]);

  if (!view || !muscleInfo(code)) return null;
  const bounds = boundsOf(view.regions);
  const placement =
    bounds && width > 0 ? placeBounds(bounds, { width, height: HEIGHT }, REGION_VIEWBOX) : null;

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(event: LayoutChangeEvent) => setWidth(Math.round(event.nativeEvent.layout.width))}
      style={{
        height: HEIGHT,
        borderRadius: radii.xl,
        overflow: 'hidden',
        backgroundColor: colors.surfaceLowest,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
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
          <Svg
            height={placement.height}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, top: 0 }}
            viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`}
            width={placement.width}
          >
            {view.regions.map((region, index) => (
              <Path
                d={toPathData(region.rings)}
                fill={colors.volt}
                fillOpacity={0.4}
                fillRule="evenodd"
                key={`${region.code}-${index}`}
                stroke={colors.volt}
                strokeLinejoin="round"
                strokeWidth={2.5}
              />
            ))}
          </Svg>
        </View>
      ) : null}
    </View>
  );
}
