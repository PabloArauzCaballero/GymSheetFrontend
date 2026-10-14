import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useReducedMotion } from 'react-native-reanimated';
import {
  selectExercisePoster,
  selectExerciseVideo,
  type ProfileGender,
} from '@gymsheet/domain';
import type { Exercise, ExerciseMedia } from '@gymsheet/types';
import { Shimmer } from '@/components/shimmer';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  fontFamilies,
  fontSizes,
  iconSizes,
  motion,
  muscleGradientDefault,
  muscleGradients,
  placeholderInk,
  radii,
  semibold,
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
  // A GIF without a thumbnail must not be the resting image in a recycled row.
  if (exercise.media.some((item) => item.mediaType === 'GIF' && item.url === poster?.url && !item.thumbnailUrl)) {
    return null;
  }
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
  exercise: Pick<Exercise, 'nombre' | 'grupoMuscular'>;
  /** Lado aproximado en pt: decide el tamaño de las iniciales. */
  side: number;
}) {
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
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular' | 'imagenUrl'>;
  /**
   * Lado en px, `'hero'` para el marco del detalle o `'fill'` para ocupar el
   * contenedor (mosaico de portada).
   */
  size: number | 'hero' | 'fill';
  rounded?: number;
}) {
  const isHero = size === 'hero';
  const reduceMotion = useReducedMotion();
  // Animated media is requested only after an explicit play action.
  const media = primaryMedia(exercise);
  const poster = posterOf(exercise);
  const resolvedImage = exercise.media.some(
    (item) => item.mediaType === 'GIF' && item.url === exercise.imagenUrl && !item.thumbnailUrl,
  ) ? null : exercise.imagenUrl;
  // Small rows use the prepared thumbnail; detail keeps the resolved full-size art.
  const uri = isHero
    ? resolvedImage ?? media?.url ?? media?.thumbnailUrl ?? poster?.uri ?? null
    : media?.thumbnailUrl ?? resolvedImage ?? media?.url ?? poster?.uri ?? null;
  const altText = media?.altText || poster?.altText || exercise.nombre;
  const [loaded, setLoaded] = useState(false);

  // Una lámina del catálogo (foto o render a 2000 px) llena su marco; la
  // ilustración sobre blanco (póster del vídeo, GIF) va sobre la placa
  // «papel». Antes todo iba sobre la placa con margen, y una foto oscura
  // quedaba enmarcada en crema (captura de TestFlight del 2026-10-11).
  // Con `imagenUrl`: es foto salvo que el ejercicio solo tenga el póster de un
  // vídeo (una ilustración sobre blanco, que va sobre la placa).
  const posterOnly = primaryMedia(exercise) === null && poster !== null;
  const photo = uri !== null && uri === resolvedImage
    ? !posterOnly
    : media?.mediaType === 'IMAGE' && (media.thumbnailUrl === uri || media.url === uri);

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
            priority={isHero ? 'normal' : 'low'}
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

/** Lado máximo del reproductor. El clip es 1:1, y más ancho empuja los datos fuera de pantalla. */
const VIDEO_MAX_SIDE = 320;

/**
 * La demostración del ejercicio en la ficha: vídeo o GIF al pulsar, lámina mientras tanto.
 *
 * Es el único sitio de la aplicación que reproduce vídeo del catálogo. Las
 * listas se quedan en la imagen fija por ancho de banda, y un ejercicio sin
 * vídeo —hoy, casi todos— se ve exactamente igual que antes.
 */
export function ExerciseDemo({
  exercise,
  gender,
}: {
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular' | 'imagenUrl'>;
  gender: ProfileGender;
}) {
  const video = selectExerciseVideo(exercise.media, gender);
  // MP4 y no WebM: AVPlayer de iOS no decodifica WebM, así que el formato que
  // ahorra bytes en la web aquí dejaría la ficha en negro.
  if (video?.mp4Url) return <ExerciseVideo altText={video.altText} poster={video.poster} uri={video.mp4Url} />;
  const gif = animatedMedia(exercise);
  if (gif) return <ExerciseGif key={gif.url} exercise={exercise} gif={gif} />;
  return <ExerciseImage exercise={exercise} size="hero" />;
}

/** An animated demonstration is downloaded only after the user asks to play it. */
function ExerciseGif({ exercise, gif }: {
  exercise: Pick<Exercise, 'media' | 'nombre' | 'grupoMuscular' | 'imagenUrl'>;
  gif: ExerciseMedia;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <Pressable
      accessibilityLabel={playing ? 'Detener demostración animada' : `Reproducir demostración animada. ${gif.altText}`}
      accessibilityRole="button"
      onPress={() => setPlaying((value) => !value)}
      style={{ width: HERO_SIZE, height: HERO_SIZE, alignSelf: 'center' }}
    >
      {playing ? (
        <Image
          accessibilityElementsHidden
          cachePolicy="disk"
          contentFit="contain"
          importantForAccessibility="no-hide-descendants"
          source={{ uri: gif.url }}
          style={{ width: HERO_SIZE, height: HERO_SIZE, borderRadius: radii.lg, backgroundColor: '#ffffff' }}
        />
      ) : (
        <View style={{ width: HERO_SIZE, height: HERO_SIZE }}>
          <ExerciseImage exercise={exercise} size="hero" />
          <View pointerEvents="none" style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.volt, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons color={colors.background} name="play" size={iconSizes.md} />
            </View>
          </View>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Reproductor de una demostración.
 *
 * Empieza en el póster y **no descarga el vídeo hasta que se pulsa**: la fuente
 * del reproductor es nula mientras nadie lo pide, que es la única forma de que
 * abrir una ficha con datos móviles no cueste 1,9 MB. Por lo mismo no hay
 * reproducción automática, lo que además respeta «reducir movimiento» sin
 * necesidad de una rama aparte. En bucle y en silencio: es un gesto técnico
 * repetido, no un vídeo que contar.
 */
function ExerciseVideo({
  uri,
  poster,
  altText,
}: {
  uri: string;
  poster: string | null;
  altText: string;
}) {
  const { width } = useWindowDimensions();
  const side = Math.min(width - spacing.lg * 2, VIDEO_MAX_SIDE);
  const [playing, setPlaying] = useState(false);
  // `useVideoPlayer` memoriza por fuente: con `null` no hay descarga ninguna, y
  // al pasar a la URL se crea el reproductor ya con el clip pedido.
  const player = useVideoPlayer(playing ? uri : null, (instance) => {
    instance.loop = true;
    instance.muted = true;
  });

  useEffect(() => {
    if (playing) player.play();
  }, [playing, player]);

  const frame = {
    width: side,
    height: side,
    alignSelf: 'center' as const,
    borderRadius: radii.lg,
    overflow: 'hidden' as const,
    backgroundColor: colors.surfaceHigh,
  };

  if (playing) {
    return (
      <View style={frame}>
        <VideoView
          accessibilityLabel={altText}
          contentFit="contain"
          nativeControls
          player={player}
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityLabel={`Reproducir demostración. ${altText}`}
      accessibilityRole="button"
      onPress={() => setPlaying(true)}
      style={({ pressed }) => ({ ...frame, opacity: pressed ? 0.6 : 1 })}
    >
      {poster ? (
        <Image
          accessibilityElementsHidden
          cachePolicy="memory-disk"
          contentFit="contain"
          importantForAccessibility="no-hide-descendants"
          source={{ uri: poster }}
          style={{ width: '100%', height: '100%' }}
        />
      ) : null}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: radii.full,
            backgroundColor: colors.volt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons color={colors.background} name="play" size={iconSizes.lg} />
        </View>
        <Text
          style={{
            color: colors.text,
            fontSize: fontSizes.xs,
            fontWeight: semibold,
          }}
        >
          Ver la técnica
        </Text>
      </View>
    </Pressable>
  );
}
