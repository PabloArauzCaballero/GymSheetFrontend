import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { alpha, ink, radii } from '@/theme';

export interface AnimatedIconBadgeProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  gradient: readonly [string, string];
  borderColor?: string;
  glowColor?: string;
  size?: number;
  iconSize?: number;
  pulsing?: boolean;
}

/**
 * Insignia de icono ultra-premium con estética Apple/Glassmorphism:
 * - Degradado multicapa con profundidad óptica
 * - Borde de cristal con reflejo superior especular
 * - Resplandor ambiental (glow) acorde a la paleta semántica
 * - Micro-animación viva de respiración/pulso suave (sin rebotes estridentes)
 */
export function AnimatedIconBadge({
  icon,
  iconColor,
  gradient,
  borderColor,
  glowColor,
  size = 46,
  iconSize = 22,
  pulsing = false,
}: AnimatedIconBadgeProps) {
  const pulse = useSharedValue(1);
  const glowOpacity = useSharedValue(0.35);

  useEffect(() => {
    if (pulsing) {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.65, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.3, { duration: 1800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      pulse.value = 1;
      glowOpacity.value = 0.35;
    }
  }, [pulsing, pulse, glowOpacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    shadowOpacity: glowOpacity.value,
  }));

  const effectiveBorder = borderColor || gradient[0];
  const effectiveGlow = glowColor || iconColor;

  return (
    <Animated.View
      style={[
        styles.outerContainer,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.32),
          shadowColor: effectiveGlow,
        },
        animatedStyle,
      ]}
    >
      <LinearGradient
        colors={[gradient[0], gradient[1]]}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={[
          styles.gradientSurface,
          {
            borderRadius: Math.round(size * 0.32),
            borderColor: effectiveBorder,
          },
        ]}
      >
        {/* Reflejo especular superior (estilo Apple Glass) */}
        <View style={styles.topSheen} />

        <Ionicons
          accessibilityElementsHidden
          color={iconColor}
          importantForAccessibility="no-hide-descendants"
          name={icon}
          size={iconSize}
        />
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 6,
  },
  gradientSurface: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '42%',
    borderBottomLeftRadius: radii.full,
    borderBottomRightRadius: radii.full,
    backgroundColor: alpha(ink.white, 0.12),
  },
});
