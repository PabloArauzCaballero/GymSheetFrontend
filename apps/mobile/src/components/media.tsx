import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import {
  selectExercisePoster,
  selectExerciseVideo,
  type ProfileGender,
} from '@gymsheet/domain';
import type { Exercise, ExerciseMedia } from '@gymsheet/types';
import { ExerciseVideo } from '@/components/exercise-video';
import { Shimmer } from '@/components/shimmer';
import { MuscleHero } from '@/features/body-map/muscle-hero';
import { zoneMuscles } from '@/features/body-map/zones';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  fontFamilies,
  fontSizes,
  motion,
  muscleGradientDefault,
  muscleGradients,
  placeholderInk,
  radii,
  spacing,
} from '@/theme';

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
 * La imagen fija que va en filas y tarjetas: lámina del catálogo, y si el
 * ejercicio solo tiene vídeo, su póster. Nunca el vídeo: una lista que
 * descargara clips gastaría 1,9 MB por fila (PLAN-VIDEOS-EJERCICIOS §4.3).
 */
function posterOf(exercise: Pick<Exercise, 'media'>): { uri: string; altText: string } | null {
  const poster = selectExercisePoster(exercise.media, null);
  return poster ? { uri: poster.url, altText: poster.altText } : null;
}

/** ¿Tiene el ejercicio alguna imagen que enseñar (lámina o póster)? */
export function hasArtwork(exercise: Pick<Exercise, 'media' | 'imagenUrl'>): boolean {
  return Boolean(exercise.imagenUrl) || primaryMedia(exercise) !== null || posterOf(exercise) !== null;
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

function groupIndex(grupoMuscular: string | null | undefined): number {
  const haystack = grupoMuscular ?? '';
  return GROUP_ICON.findIndex(([pattern]) => pattern.test(haystack));
}

/** El glifo de una zona del cuerpo («glutes» → caminar, «chest» → escudo…). */
export function muscleGroupIcon(grupoMuscular: string | null | undefined): keyof typeof Ionicons.glyphMap {
  return GROUP_ICON[groupIndex(grupoMuscular)]?.[1] ?? 'fitness-outline';
}

const SMALL_WORDS = new Set(['de', 'del', 'con', 'a', 'al', 'en', 'el', 'la', 'los', 'las', 'y', 'una', 'un', 'sin', 'para']);

/** «Sentadilla goblet con mancuerna» → «SG»: las dos primeras palabras que dicen algo. */
export function exerciseInitials(name: string): string {
  const words = name
    .trim()
    .split(/[\s\-·(]+/u)
    .filter((word) => word && !SMALL_WORDS.has(word.toLowerCase()));
  return (
    words
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join('') || '·'
  );
}

/**
 * Lo que se ve cuando un ejercicio no trae lámina: un degradado por zona del
 * cuerpo, su icono en marca de agua y las iniciales del ejercicio. Antes era un
 * cuadro gris con un glifo pequeño, y un día entero sin imágenes se leía como
 * una pantalla a medio cargar; así cada fila se distingue de la de al lado y se
 * nota que es un marcador a propósito.
 */
function ExercisePlaceholder({
  exercise,
  side,
}: {
  exercise: Pick<Exercise, 'nombre' | 'grupoMuscular'> & { targetMuscle?: string | null };
  /** Lado aproximado en pt: decide el tamaño de las iniciales. */
  side: number;
}) {
  // En marcos grandes (portada del entreno, ficha), sin foto se enseña el
  // cuerpo con el músculo que trabaja encendido: dice más que unas iniciales.
  const muscles =
    side >= 96
      ? (zoneMuscles(exercise.targetMuscle ?? '') ?? zoneMuscles(exercise.nombre) ?? zoneMuscles(exercise.grupoMuscular ?? ''))
      : null;
  if (muscles) return <AnatomyCover muscles={muscles} />;
  const index = groupIndex(exercise.grupoMuscular);
  const [from, to] = muscleGradients[index] ?? muscleGradientDefault;
  return (
    <LinearGradient
      colors={[from, to]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
    >
      <Ionicons
        accessibilityElementsHidden
        color={placeholderInk.watermark}
        importantForAccessibility="no-hide-descendants"
        name={muscleGroupIcon(exercise.grupoMuscular)}
        size={Math.round(side * 0.78)}
        style={{ position: 'absolute', right: -Math.round(side * 0.14), bottom: -Math.round(side * 0.16) }}
      />
      <Text
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          color: placeholderInk.initials,
          fontFamily: fontFamilies.displaySemibold,
          fontSize: side >= 120 ? fontSizes.xl : side >= 56 ? fontSizes.md : fontSizes.xs,
          letterSpacing: 0.5,
        }}
      >
        {exerciseInitials(exercise.nombre)}
      </Text>
    </LinearGradient>
  );
}

/** La lámina anatómica a todo el marco, midiendo su alto (el marco puede ser `fill`). */
function AnatomyCover({ muscles }: { muscles: readonly string[] }) {
  const [height, setHeight] = useState(0);
  return (
    <View
      onLayout={(event) => setHeight(Math.round(event.nativeEvent.layout.height))}
      style={{ width: '100%', height: '100%', backgroundColor: colors.surfaceLowest }}
    >
      {height > 0 ? <MuscleHero codes={muscles} height={height} padding={1.25} /> : null}
    </View>
  );
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
  rounded = radii.md,
}: {
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular' | 'imagenUrl'> & { targetMuscle?: string | null };
  /**
   * Lado en px, `'hero'` para el marco del detalle o `'fill'` para ocupar el
   * contenedor (mosaico de portada).
   */
  size: number | 'hero' | 'fill';
  rounded?: number;
}) {
  const isHero = size === 'hero';
  const reduceMotion = useReducedMotion();
  // The detail view loops the movement when the dataset provides a GIF; rows
  // stay on the still image. Reduce Motion keeps the still everywhere.
  const animated = isHero && !reduceMotion ? animatedMedia(exercise) : null;
  const media = animated ?? primaryMedia(exercise);
  const poster = posterOf(exercise);
  // El GIF manda en el detalle; si no hay lámina, cae al póster del vídeo, que
  // antes dejaba la tarjeta con el icono genérico.
  // `imagenUrl` es lo que el servidor ya resolvió (lámina o póster): manda en
  // filas y miniaturas; el GIF del detalle sigue teniendo preferencia. Si no
  // viene (servidor anterior), se calcula aquí como antes.
  const uri = animated?.url ?? exercise.imagenUrl ?? media?.url ?? media?.thumbnailUrl ?? poster?.uri ?? null;
  const altText = media?.altText || poster?.altText || exercise.nombre;
  const [loaded, setLoaded] = useState(false);

  // Una lámina del catálogo (foto o render a 2000 px) llena su marco; la
  // ilustración sobre blanco (póster del vídeo, GIF) va sobre la placa
  // «papel». Antes todo iba sobre la placa con margen, y una foto oscura
  // quedaba enmarcada en crema (captura de TestFlight del 2026-10-11).
  // Con `imagenUrl`: es foto salvo que el ejercicio solo tenga el póster de un
  // vídeo (una ilustración sobre blanco, que va sobre la placa).
  const posterOnly = primaryMedia(exercise) === null && poster !== null;
  const photo =
    !animated &&
    (uri !== null && uri === exercise.imagenUrl ? !posterOnly : media?.mediaType === 'IMAGE' && media.url === uri);

  const frame = isHero
    ? { width: HERO_SIZE, height: HERO_SIZE, alignSelf: 'center' as const }
    : size === 'fill'
      ? { width: '100%' as const, height: '100%' as const }
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
        borderCurve: 'continuous',
        overflow: 'hidden',
        // Placa «papel» (C8.1), nunca `#ffffff`: las ilustraciones del dataset
        // vienen sobre blanco y, multiplicadas sobre la placa, el blanco toma su
        // tono cálido y la figura se lee como una lámina de manual.
        backgroundColor: uri && !photo ? colors.plate : colors.surfaceHighest,
        // Sin margen en las miniaturas: el margen sobre la placa se leía como
        // un marco claro alrededor de la figura (TestFlight, 2026-10-11).
        padding: !uri || photo ? 0 : size === 'fill' ? spacing.sm : 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {uri ? (
        <View
          style={{
            width: '100%',
            height: '100%',
            mixBlendMode: photo ? 'normal' : 'multiply',
          }}
        >
          <Image
            accessibilityLabel={altText}
            accessible
            cachePolicy="memory-disk"
            // Ilustración: `contain`, recortarla le corta las extremidades.
            // Foto: `cover`, que llene el cuadro sin bandas.
            contentFit={photo ? 'cover' : 'contain'}
            onLoad={() => setLoaded(true)}
            source={{ uri }}
            style={{ width: '100%', height: '100%' }}
            transition={reduceMotion ? 0 : motion.enter}
          />
        </View>
      ) : (
        <ExercisePlaceholder exercise={exercise} side={isHero ? HERO_SIZE : typeof size === 'number' ? size : 96} />
      )}
      {uri && !loaded ? <Shimmer /> : null}
    </Frame>
  );
}

/**
 * La demostración del ejercicio en la ficha: vídeo si lo hay, lámina si no.
 *
 * Es el único sitio de la aplicación que reproduce vídeo del catálogo. Las
 * listas se quedan en la imagen fija por ancho de banda, y un ejercicio sin
 * vídeo —hoy, casi todos— se ve exactamente igual que antes.
 */
export function ExerciseDemo({
  exercise,
  gender,
}: {
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular'>;
  gender: ProfileGender;
}) {
  const video = selectExerciseVideo(exercise.media, gender);
  // MP4 y no WebM: AVPlayer de iOS no decodifica WebM, así que el formato que
  // ahorra bytes en la web aquí dejaría la ficha en negro.
  if (!video?.mp4Url) return <ExerciseImage exercise={exercise} size="hero" />;
  return (
    <ExerciseVideo
      altText={video.altText}
      fallback={<ExerciseImage exercise={exercise} rounded={0} size="fill" />}
      poster={video.poster}
      uri={video.mp4Url}
    />
  );
}
