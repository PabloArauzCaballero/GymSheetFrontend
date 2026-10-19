import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { ReppMark } from '@/components/brand/repp-mark';
import { cardGap, colors, heroGlow, heroWatermarkInk, radii, shadows, spacing } from '@/theme';

/**
 * La superficie que se enseña (rediseño 2026-10-18): una por pantalla, la que
 * diría la captura que alguien comparte. Sobre `surfaceRaised` entra la luz
 * del acento desde arriba a la izquierda y, si `watermark`, el isotipo de la
 * marca muy tenue abajo a la derecha.
 *
 * Coste fijo y bajo a propósito: un degradado estático y un SVG de dos
 * trazados, sin desenfoque ni animación. No se usa dentro de listas.
 */
export function HeroSurface({
  children,
  watermark = false,
  style,
  testID,
}: {
  children: ReactNode;
  watermark?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  return (
    <View
      style={[
        {
          gap: cardGap,
          padding: spacing.mdl,
          borderRadius: radii.xxl,
          borderCurve: 'continuous',
          backgroundColor: colors.surfaceRaised,
          boxShadow: shadows.e2,
          overflow: 'hidden',
        },
        style,
      ]}
      testID={testID}
    >
      <LinearGradient
        colors={heroGlow(colors.volt)}
        end={{ x: 0.85, y: 0.9 }}
        locations={[0, 0.45, 1]}
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />
      {watermark ? (
        <View pointerEvents="none" style={{ position: 'absolute', right: -spacing.lg, bottom: -spacing.lg }}>
          <ReppMark ink={heroWatermarkInk} size={168} tick={heroWatermarkInk} />
        </View>
      ) : null}
      {children}
    </View>
  );
}
