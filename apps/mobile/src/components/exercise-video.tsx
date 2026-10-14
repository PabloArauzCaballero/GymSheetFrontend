import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { Shimmer } from "@/components/shimmer";
import {
  accentContrast,
  alpha,
  colors,
  fontSizes,
  iconSizes,
  onMedia,
  overlay,
  radii,
  semibold,
  spacing,
} from "@/theme";

/** Tope del lado del reproductor: más ancho empuja los datos fuera de pantalla en iPad. */
const VIDEO_MAX_SIDE = 520;

/**
 * Reproductor de la demostración de un ejercicio.
 *
 * Antes no bajaba nada hasta pulsar «play» y luego arrancaba con los controles
 * nativos: el clip llegaba tarde, en un cuadro pequeño y parado. Ahora:
 *
 * - **Se prepara al abrir la ficha**: el reproductor se crea ya con la fuente y
 *   `useCaching`, así el clip se descarga mientras se lee el título y la
 *   segunda vez sale del disco del teléfono sin red.
 * - **Arranca solo, mudo y en bucle** en cuanto hay imagen (es un gesto técnico
 *   repetido, no un vídeo que contar). El póster tapa el cuadro hasta el primer
 *   fotograma, con la franja de «cargando», así nunca se ve negro ni parado.
 * - **Con «reducir movimiento»** no arranca solo: queda el póster y un «play».
 * - **A todo el ancho y cuadrado**: el clip es 1:1; en un marco apaisado se
 *   veía pequeño y borroso porque se escalaba el mismo vídeo a la mitad.
 * - Un toque pausa o reanuda.
 */
export function ExerciseVideo({
  uri,
  poster,
  altText,
  fallback,
}: {
  uri: string;
  poster: string | null;
  altText: string;
  /** Sin póster, la lámina del ejercicio hace de portada: nunca un cuadro vacío. */
  fallback: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const side = Math.min(width - spacing.lg * 2, VIDEO_MAX_SIDE);
  const [ready, setReady] = useState(false);

  const player = useVideoPlayer({ uri, useCaching: true }, (instance) => {
    instance.loop = true;
    instance.muted = true;
    // Un clip de 2 MB cabe entero: que el buffer no se quede corto y se pare.
    instance.bufferOptions = { preferredForwardBufferDuration: 20 };
  });

  useEffect(() => {
    if (!reduceMotion) player.play();
  }, [player, reduceMotion]);

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });

  const toggle = () => {
    if (player.playing) player.pause();
    else player.play();
  };

  return (
    <Pressable
      accessibilityHint={
        isPlaying ? "Pausa la demostración" : "Reproduce la demostración"
      }
      accessibilityLabel={altText}
      accessibilityRole="button"
      onPress={toggle}
      style={{
        width: side,
        height: side,
        alignSelf: "center",
        borderRadius: radii.xl,
        borderCurve: "continuous",
        overflow: "hidden",
        backgroundColor: colors.surfaceLowest,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <VideoView
        allowsPictureInPicture={false}
        contentFit="contain"
        nativeControls={false}
        onFirstFrameRender={() => setReady(true)}
        player={player}
        style={{ width: "100%", height: "100%" }}
      />

      {/* El póster cubre hasta el primer fotograma y se va sin salto. */}
      {!ready ? (
        <View pointerEvents="none" style={{ position: "absolute", inset: 0 }}>
          {poster ? (
            <Image
              accessibilityElementsHidden
              cachePolicy="memory-disk"
              contentFit="contain"
              importantForAccessibility="no-hide-descendants"
              source={{ uri: poster }}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            fallback
          )}
          {!reduceMotion ? <Shimmer /> : null}
        </View>
      ) : null}

      {/* Pausado (o sin autoplay): un play claro; reproduciendo, el cuadro queda limpio. */}
      {!isPlaying ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <LinearGradient
            colors={[overlay.clearDark, overlay.scrimSoft]}
            pointerEvents="none"
            style={{ position: "absolute", inset: 0 }}
          />
          <View
            style={{
              width: 64,
              height: 64,
              borderRadius: radii.full,
              backgroundColor: colors.volt,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 3,
              borderColor: overlay.glassStrong,
              boxShadow: `0 8px 24px ${alpha(colors.volt, 0.45)}`,
            }}
          >
            <Ionicons
              color={accentContrast()}
              name="play"
              size={iconSizes.lg}
              style={{ marginLeft: 3 }}
            />
          </View>
          <Text
            style={{
              marginTop: spacing.xs,
              color: onMedia.text,
              fontSize: fontSizes.sm,
              fontWeight: semibold,
            }}
          >
            Ver la técnica
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}
