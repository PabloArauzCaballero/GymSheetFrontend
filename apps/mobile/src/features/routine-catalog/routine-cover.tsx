import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { TrainingGoal } from '@gymsheet/types';
import { MediaImage } from '@/components/media-image';
import { GOAL_ICON } from '@/lib/format';
import { alpha, goalGradients, heroScrim, ink } from '@/theme';

/**
 * Portada de una rutina: la imagen de uno de sus ejercicios, a sangre y con
 * un velo hacia el lienzo para que el texto encima se lea sobre cualquier foto.
 * Sin imagen, un degradado propio del objetivo con su glifo en marca de agua,
 * nunca un cuadro gris con una mancuerna. Mientras carga, esqueleto con brillo.
 */
export function RoutineCover({
  uri,
  goal,
  scrim = 'strong',
  instant = false,
  style,
  children,
}: {
  /** La imagen ya se veía en la pantalla anterior: entra sin fundido. */
  instant?: boolean;
  uri: string | null | undefined;
  goal: TrainingGoal | null;
  /** `strong`: el título va encima (detalle). `soft`: solo un realce abajo (tarjeta). */
  scrim?: 'strong' | 'soft';
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const [from, to] = goalGradients[goal ?? 'DEFAULT'];
  const fallback = (
    <LinearGradient colors={[from, to]} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill}>
      <Ionicons
        color={alpha(ink.white, 0.09)}
        name={goal ? GOAL_ICON[goal] : 'barbell'}
        size={168}
        style={{
          position: 'absolute',
          right: -24,
          top: -12,
          transform: [{ rotate: '-18deg' }],
        }}
      />
    </LinearGradient>
  );
  return (
    <MediaImage fallback={fallback} instant={instant} style={style} uri={uri}>
      <LinearGradient
        colors={scrim === 'strong' ? heroScrim.colors : [alpha(ink.black, 0), alpha(ink.black, 0.35)]}
        locations={scrim === 'strong' ? heroScrim.locations : [0.55, 1]}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      />
      {children}
    </MediaImage>
  );
}
