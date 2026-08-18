import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import type { Exercise, ExerciseMedia } from '@gymsheet/types';
import { colors, iconSizes, motion, radii } from '@/theme';

/**
 * Best still image for an exercise: the one flagged primary, else the first one.
 * Exercises imported from the dataset carry external URLs; the phone loads them
 * directly (the web app proxies them server-side only to avoid SSRF).
 */
export function primaryMedia(exercise: Pick<Exercise, 'media'>): ExerciseMedia | null {
  const images = exercise.media.filter((item) => item.mediaType === 'IMAGE');
  return images.find((item) => item.isPrimary) ?? images[0] ?? null;
}

/**
 * The animated take on the movement, when the dataset carries one.
 *
 * Motion belongs on the detail screen, where the loop actually teaches the
 * execution. A list of a dozen looping GIFs would compete with itself for
 * attention and pull a dozen animated files over the network for nothing.
 */
export function animatedMedia(exercise: Pick<Exercise, 'media'>): ExerciseMedia | null {
  return exercise.media.find((item) => item.mediaType === 'GIF') ?? null;
}

/**
 * Artwork in this catalogue is 180×180, so the frame stays under the source
 * resolution — upscaling is what made it look pixelated. It is also kept small
 * on purpose: the illustration identifies the movement, it is not the hero of
 * the screen, and a huge picture pushed every fact below the fold.
 */
export const HERO_SIZE = 148;

/**
 * Glyph for an exercise with no artwork, chosen from what it trains.
 *
 * A grid of identical grey dumbbells reads as broken data. Varying the icon by
 * muscle group makes the placeholder look deliberate, and it carries a little
 * real information: you can tell a leg movement from a cardio one at a glance.
 */
const GROUP_ICON: ReadonlyArray<readonly [RegExp, keyof typeof Ionicons.glyphMap]> = [
  [/cardio|heart|cardiovascular/i, 'heart-outline'],
  [/leg|quad|hamstring|glute|calf|thigh/i, 'walk-outline'],
  [/back|lat|trap|spine/i, 'body-outline'],
  [/chest|pec/i, 'shield-outline'],
  [/shoulder|delt/i, 'triangle-outline'],
  [/bicep|tricep|arm|forearm/i, 'barbell-outline'],
  [/abs|core|waist|oblique/i, 'ellipse-outline'],
  [/neck/i, 'accessibility-outline'],
];

function fallbackIcon(exercise: Pick<Exercise, 'grupoMuscular'>): keyof typeof Ionicons.glyphMap {
  const haystack = exercise.grupoMuscular ?? '';
  return GROUP_ICON.find(([pattern]) => pattern.test(haystack))?.[1] ?? 'fitness-outline';
}

/**
 * Exercise artwork with a resting state that is never empty: while the bytes
 * are in flight the frame holds its size (no layout shift), and an exercise
 * without media falls back to a glyph instead of a hole in the layout.
 *
 * Uses `expo-image` rather than React Native's `Image`: it plays animated GIFs
 * reliably on Android (RN's does not), caches to disk between launches, and
 * cross-fades instead of popping.
 */
export function ExerciseImage({
  exercise,
  size,
  rounded = radii.lg,
}: {
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular'>;
  /** Square side in px, or `'hero'` for the capped detail frame. */
  size: number | 'hero';
  rounded?: number;
}) {
  const isHero = size === 'hero';
  const reduceMotion = useReducedMotion();
  // The detail view loops the movement when the dataset provides a GIF; rows
  // stay on the still image. Reduce Motion keeps the still everywhere.
  const animated = isHero && !reduceMotion ? animatedMedia(exercise) : null;
  const media = animated ?? primaryMedia(exercise);
  const uri = media?.url ?? media?.thumbnailUrl ?? null;

  const frame = isHero
    ? { width: HERO_SIZE, height: HERO_SIZE, alignSelf: 'center' as const }
    : { width: size, height: size };

  const Frame = isHero ? Animated.View : View;

  return (
    <Frame
      // The detail image scales up as the screen settles, so the artwork reads
      // as the row's thumbnail growing rather than a new picture appearing.
      // Reduced motion gets the final state immediately.
      entering={isHero && !reduceMotion ? ZoomIn.springify().damping(18).stiffness(160) : undefined}
      style={{
        ...frame,
        borderRadius: rounded,
        overflow: 'hidden',
        // The illustrations are drawn on white; a light plate keeps them
        // readable instead of floating on the black canvas.
        backgroundColor: uri ? '#ffffff' : colors.surfaceHigh,
        borderWidth: uri ? 0 : 1,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <Image
          accessibilityLabel={media?.altText || exercise.nombre}
          accessible
          cachePolicy="memory-disk"
          // `contain` on the detail: the illustration is a full figure and
          // cropping it cuts off limbs. Rows crop, where recognition is enough
          // and a consistent square matters more.
          contentFit={isHero ? 'contain' : 'cover'}
          source={{ uri }}
          style={{ width: '100%', height: '100%' }}
          transition={reduceMotion ? 0 : motion.enter}
        />
      ) : (
        <Ionicons
          accessibilityElementsHidden
          // Volt at low opacity rather than dead grey: the placeholder belongs
          // to the brand instead of looking like a loading failure.
          color={colors.accentInk}
          importantForAccessibility="no-hide-descendants"
          name={fallbackIcon(exercise)}
          size={isHero ? iconSizes.xl : iconSizes.lg}
          style={{ opacity: 0.55 }}
        />
      )}
    </Frame>
  );
}
