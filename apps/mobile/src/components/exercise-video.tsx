import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useEvent } from "expo";
import { VideoView, useVideoPlayer } from "expo-video";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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

/** Reintentos automáticos si el clip no arranca, antes de enseñar «Reintentar». */
const MAX_AUTO_RETRIES = 2;
const RETRY_DELAY_MS = 1200;

/** Tope del lado del reproductor: más ancho empuja los datos fuera de pantalla en iPad. */
const VIDEO_MAX_SIDE = 520;

/**
 * Reproductor de la demostración de un ejercicio.
 *
 * Antes no bajaba nada hasta pulsar «play» y luego arrancaba con los controles
 * nativos: el clip llegaba tarde, en un cuadro pequeño y parado. Ahora:
 *
 * - **Se prepara al abrir la ficha**: el reproductor se crea ya con la fuente,
 *   así el clip se descarga mientras se lee el título. Sin `useCaching`: su
 *   cargador propio corta a los 5 s y el almacén de medios de test, bajo carga,
 *   tarda más; el resultado era un cuadro que nunca arrancaba. El clip pesa ~1 MB
 *   y AVPlayer ya lo guarda en su caché.
 * - **Si falla, no se queda mudo**: reintenta solo dos veces y luego enseña el
 *   póster con «No se pudo cargar · Reintentar», nunca un cuadro negro.
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

  const player = useVideoPlayer({ uri }, (instance) => {
    instance.loop = true;
    instance.muted = true;
    // Un clip de 2 MB cabe entero: que el buffer no se quede corto y se pare.
    instance.bufferOptions = { preferredForwardBufferDuration: 20 };
  });

  const [failed, setFailed] = useState(false);
  const retries = useRef(0);

  useEffect(() => {
    if (!reduceMotion) player.play();
  }, [player, reduceMotion]);

  const { isPlaying } = useEvent(player, "playingChange", {
    isPlaying: player.playing,
  });
  const { status } = useEvent(player, "statusChange", { status: player.status });

  const reload = useCallback(() => {
    setFailed(false);
    void player.replaceAsync({ uri }).then(() => {
      if (!reduceMotion) player.play();
    });
  }, [player, reduceMotion, uri]);

  useEffect(() => {
    if (status === "readyToPlay") {
      retries.current = 0;
      return;
    }
    if (status !== "error") return;
    if (retries.current >= MAX_AUTO_RETRIES) {
      setFailed(true);
      return;
    }
    retries.current += 1;
    const timer = setTimeout(reload, RETRY_DELAY_MS * retries.current);
    return () => clearTimeout(timer);
  }, [reload, status]);

  const toggle = () => {
    if (failed) {
      retries.current = 0;
      reload();
      return;
    }
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
      {!ready || failed ? (
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
          {!reduceMotion && !failed ? <Shimmer /> : null}
        </View>
      ) : null}

      {/* Pausado (o sin autoplay): un play claro; reproduciendo, el cuadro queda limpio. */}
      {failed ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            alignItems: "center",
            justifyContent: "flex-end",
            padding: spacing.md,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.xs,
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.sm,
              borderRadius: radii.full,
              backgroundColor: overlay.scrimStrong,
            }}
          >
            <Ionicons color={onMedia.text} name="refresh" size={iconSizes.sm} />
            <Text style={{ color: onMedia.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
              No se pudo cargar · Reintentar
            </Text>
          </View>
        </View>
      ) : !isPlaying ? (
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
