import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { memo, useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { SvgXml } from "react-native-svg";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Text } from "@/components/text";
import {
  alpha,
  arenaLockedVeil,
  arenaScrim,
  continuous,
  iconSizes,
  ink,
  onMedia,
  radii,
  spacing,
} from "@/theme";
import {
  ARENA_ART_HEIGHT,
  ARENA_ART_WIDTH,
  arenaArtXml,
  arenaInkAt,
} from "./arena-art";
import { formatPoints, type RoadArena } from "./road";

const ASPECT = ARENA_ART_HEIGHT / ARENA_ART_WIDTH;
const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.25, 1);
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

/**
 * Una arena del camino: la escena, su número, su nombre y el rango que vive en
 * ella.
 *
 * El estado se lee antes que el texto: la arena actual lleva el borde en su
 * color, flota y la cruza un destello una vez; la siguiente enseña cuánto
 * falta; las demás bloqueadas quedan bajo un velo con el candado, pero con el
 * nombre legible (el siguiente hito siempre se ve). Lo que se mueve en bucle es
 * solo la arena actual: ocho escenas flotando a la vez son ruido.
 *
 * `teaser` es la versión compacta de «Tu senda»: sin rango ni frase.
 */
export const ArenaBanner = memo(function ArenaBanner({
  arena,
  width,
  lockRotation,
  teaser = false,
  bare = false,
}: {
  arena: RoadArena;
  width: number;
  /** Grados del candado, para que la pantalla lo haga temblar. */
  lockRotation?: SharedValue<number>;
  teaser?: boolean;
  /** Sin nombre ni rango: cuando el nombre ya está en grande fuera de la ficha. */
  bare?: boolean;
}) {
  const height = Math.round(width * ASPECT);
  const tint = arenaInkAt(arena.order);
  const xml = useMemo(() => arenaArtXml(arena.order), [arena.order]);
  const current = arena.state === "current";
  const locked = arena.state === "next" || arena.state === "locked";
  const reduceMotion = useReducedMotion();

  // La escena actual respira: 3 pt arriba y abajo, muy lento.
  const float = useSharedValue(0);
  const sheen = useSharedValue(-1);
  useEffect(() => {
    if (!current || reduceMotion) return;
    float.value = withRepeat(
      withTiming(1, { duration: 3200, easing: EASE_IN_OUT }),
      -1,
      true,
    );
    sheen.value = withDelay(
      700,
      withTiming(1, { duration: 900, easing: EASE_OUT }),
    );
  }, [current, float, reduceMotion, sheen]);
  const artStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -3 + float.value * 6 }, { scale: 1.04 }],
  }));
  const sheenStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sheen.value * width * 1.4 }, { rotate: "18deg" }],
    opacity: sheen.value > -1 && sheen.value < 1 ? 1 : 0,
  }));
  const lockStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${lockRotation?.value ?? 0}deg` }],
  }));

  const kicker = `ARENA ${arena.order}`;
  const label = `${kicker}, ${arena.arenaName}. ${statusLabel(arena)}`;

  return (
    <View
      accessibilityLabel={label}
      accessible
      style={[
        styles.frame,
        continuous,
        {
          width,
          height,
          borderColor: current ? arena.level.color : alpha(ink.white, 0.08),
          borderWidth: current ? 2 : 1,
          shadowColor: current ? arena.level.color : ink.black,
          shadowOpacity: current ? 0.55 : 0.35,
        },
      ]}
    >
      <View style={[StyleSheet.absoluteFill, styles.clip]}>
        <Animated.View style={[StyleSheet.absoluteFill, artStyle]}>
          <SvgXml height="100%" width="100%" xml={xml} />
        </Animated.View>

        {current ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sheen,
              { height: height * 2, left: -width * 0.5 },
              sheenStyle,
            ]}
          >
            <LinearGradient
              colors={[
                alpha(ink.white, 0),
                alpha(ink.white, 0.28),
                alpha(ink.white, 0),
              ]}
              end={{ x: 1, y: 0 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        ) : null}

        {locked ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: arenaLockedVeil },
            ]}
          />
        ) : null}

        <LinearGradient
          colors={arenaScrim}
          locations={[0.35, 0.68, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <View style={styles.topRow}>
        <View
          style={[styles.chip, { backgroundColor: alpha(ink.black, 0.45) }]}
        >
          <Text
            style={{ color: tint.glow, letterSpacing: 1.2 }}
            variant="caption"
            strong
          >
            {kicker}
          </Text>
        </View>
        <View
          style={[styles.chip, { backgroundColor: alpha(ink.black, 0.45) }]}
        >
          <Ionicons color={tint.b[0]} name="trophy" size={iconSizes.xs} />
          <Text
            style={{ color: onMedia.text }}
            tabular
            variant="caption"
            strong
          >
            {formatPoints(arena.level.minPoints)}
          </Text>
        </View>
      </View>

      {locked ? (
        <Animated.View
          style={[
            styles.lock,
            { borderColor: alpha(tint.glow, 0.6) },
            lockStyle,
          ]}
        >
          <Ionicons
            color={onMedia.text}
            name="lock-closed"
            size={iconSizes.lg}
          />
        </Animated.View>
      ) : null}

      {bare ? null : (
        <View style={styles.caption}>
          <Text
            numberOfLines={1}
            style={{ color: onMedia.text }}
            variant="title"
          >
            {arena.arenaName}
          </Text>
          {teaser ? null : (
            <Text
              numberOfLines={1}
              style={{ color: onMedia.textSoft }}
              variant="footnote"
            >
              {locked
                ? statusLabel(arena)
                : `${arena.level.name} · ${arena.level.tagline}`}
            </Text>
          )}
        </View>
      )}
    </View>
  );
});

const STATUS: Record<RoadArena["state"], (arena: RoadArena) => string> = {
  current: () => "Estás aquí",
  done: () => "Superada",
  next: (arena) =>
    `Te faltan ${formatPoints(arena.pointsToEnter)} pts para entrar`,
  locked: (arena) => `Se abre con ${formatPoints(arena.level.minPoints)} pts`,
};

function statusLabel(arena: RoadArena): string {
  return STATUS[arena.state](arena);
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: radii.xxl,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 22,
    elevation: 8,
  },
  clip: {
    borderRadius: radii.xxl - 1,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: "-50%",
    width: 90,
  },
  topRow: {
    position: "absolute",
    top: spacing.smd,
    left: spacing.smd,
    right: spacing.smd,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radii.full,
  },
  lock: {
    position: "absolute",
    alignSelf: "center",
    top: "30%",
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: alpha(ink.black, 0.5),
  },
  caption: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.smd,
    gap: spacing.xxs,
  },
});
