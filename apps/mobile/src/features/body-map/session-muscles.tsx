import { Image } from 'expo-image';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { AGGREGATES, HIGHLIGHT, IMAGE_ASPECT, REGIONS, REGION_VIEWBOX, toPathData } from '@gymsheet/anatomy';
import { Text } from '@/components/text';
import { colors, radii, spacing } from '@/theme';
import { anatomyImage } from './images';
import { zoneMuscles } from './zones';

type MuscleSource = {
  nombre: string;
  grupoMuscular: string;
  targetMuscle?: string | null;
  secondaryMuscles?: readonly string[];
};

/** Los códigos anatómicos que tocó una lista de ejercicios (primarios y secundarios), sin repetir. */
export function sessionMuscleCodes(exercises: readonly MuscleSource[]): string[] {
  const found = new Set<string>();
  for (const exercise of exercises) {
    const names = [exercise.targetMuscle, ...(exercise.secondaryMuscles ?? [])].filter((value): value is string => Boolean(value));
    const primary = zoneMuscles(exercise.targetMuscle ?? '') ?? zoneMuscles(exercise.nombre) ?? zoneMuscles(exercise.grupoMuscular ?? '');
    const codes = [...(primary ?? []), ...names.flatMap((name) => zoneMuscles(name) ?? [])];
    for (const code of codes) for (const leaf of AGGREGATES[code] ?? [code]) found.add(leaf);
  }
  return [...found];
}

function Figure({ tag, codes, width, label }: { tag: 'surface-front' | 'surface-back'; codes: readonly string[]; width: number; label: string }) {
  const reduceMotion = useReducedMotion();
  const height = Math.round(width / IMAGE_ASPECT);
  const image = anatomyImage(tag, width);
  const paths = (REGIONS[tag] ?? []).filter((region) => codes.includes(region.code)).map((region) => toPathData(region.rings));
  return (
    <View style={{ width, alignItems: 'center', gap: spacing.xs }}>
      <View style={{ width, height }}>
        <Image
          accessibilityIgnoresInvertColors
          cachePolicy="memory-disk"
          contentFit="fill"
          recyclingKey={image.recyclingKey}
          source={image.source}
          style={{ width, height }}
        />
        <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(HIGHLIGHT.fadeMs * 3)} style={StyleSheet.absoluteFill}>
          <Svg height={height} pointerEvents="none" viewBox={`0 0 ${REGION_VIEWBOX.width} ${REGION_VIEWBOX.height}`} width={width}>
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
      <Text tone="muted" variant="footnote">
        {label}
      </Text>
    </View>
  );
}

/**
 * El maniquí del cierre: frente y espalda con los músculos que la sesión tocó
 * encendidos. Sin músculos reconocibles no pinta nada (mejor ausente que un
 * cuerpo sin resaltar que no significa nada).
 */
export function SessionMuscles({ exercises }: { exercises: readonly MuscleSource[] }) {
  const codes = useMemo(() => sessionMuscleCodes(exercises), [exercises]);
  if (codes.length === 0) return null;
  return (
    <View
      accessibilityLabel="Músculos trabajados en la sesión, vista frontal y posterior"
      accessible
      style={{ gap: spacing.md }}
      testID="session-muscles"
    >
      <Text strong variant="headline">
        Músculos trabajados
      </Text>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radii.xl,
          backgroundColor: colors.surfaceLowest,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
        }}
      >
        <Figure codes={codes} label="Frente" tag="surface-front" width={120} />
        <Figure codes={codes} label="Espalda" tag="surface-back" width={120} />
      </View>
    </View>
  );
}
