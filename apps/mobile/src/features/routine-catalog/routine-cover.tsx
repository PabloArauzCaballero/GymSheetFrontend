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
  glyph,
  style,
  children,
}: {
  /** Icono de la marca de agua cuando no hay imagen; por defecto, el del objetivo. */
  glyph?: keyof typeof Ionicons.glyphMap;
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
      {/* Marca de agua grande y quieta, abajo a la derecha: deja libre la
          esquina de los botones y no compite con el título, que va a la izquierda. */}
      <Ionicons
        color={alpha(ink.white, 0.08)}
        name={glyph ?? (goal ? GOAL_ICON[goal] : 'barbell')}
        size={220}
        style={{ position: 'absolute', right: -36, bottom: -28 }}
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
