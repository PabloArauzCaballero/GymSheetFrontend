import { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '@/theme';
import { useAmbientStore } from '@/state/ambient-store';

/**
 * The moving backdrop behind every screen.
 *
 * **Why waveforms and not coloured blobs.** The previous version was drifting
 * aurora lights. They moved, but soft gradients belong to no particular
 * product — the same background would suit a banking app or a meditation timer,
 * which is exactly the note this got back. A training app should look like
 * effort: rhythm, output, a signal being measured.
 *
 * So the primary layer is a travelling waveform — bars rising and falling like
 * an equaliser or a trace on a monitor. That shape reads as pulse and cadence,
 * which is what a gym has and a streaming subscription does not. Two aurora
 * lights stay behind it, dimmed, purely to keep the black from going dead flat;
 * the identity now comes from the wave, not from them.
 *
 * Everything animates `transform` and `opacity` only, so a permanently running
 * background costs no layout work. It stops completely under Reduce Motion.
 */

const TAU = Math.PI * 2;

/** A clock that runs 0→1 forever at a fixed rate. */
function useClock(periodMs: number, enabled: boolean) {
  const value = useSharedValue(0);
  useEffect(() => {
    if (!enabled) return;
    value.value = 0;
    value.value = withRepeat(
      withTiming(1, { duration: periodMs, easing: Easing.linear }),
      -1,
      false,
    );
  }, [enabled, periodMs, value]);
  return value;
}

type BandSpec = {
  /** Vertical centre of the band, as a fraction of screen height. */
  cy: number;
  /** Band height in px — the tallest a bar can reach. */
  height: number;
  /** Distance between bar centres, in px. */
  pitch: number;
  barWidth: number;
  color: string;
  opacity: number;
  /** Travel period: lower is faster. */
  period: number;
  /** Second, faster driver so the crest pattern never repeats cleanly. */
  periodAlt: number;
  /** Phase step per bar. Larger = shorter wavelength across the screen. */
  wavelength: number;
};

/**
 * Placement is the whole problem with a background in this app: the cards are
 * opaque, so anything drawn behind the middle of a populated screen is covered
 * and only peeks through the gaps between blocks.
 *
 * These two bands sit in the strips that stay empty on every screen — beside
 * the page title at the top, and above the tab bar at the bottom. Those are
 * free on the dense screens (home, a workout in progress) and are most of the
 * screen on the sparse ones (login, settings), so the wave is always present
 * without ever competing with a line of text.
 */
const BANDS: readonly BandSpec[] = [
  {
    // Beside and behind the screen title: a short heading never fills this row.
    cy: 0.075,
    height: 150,
    // Thin bars packed tightly. Wide neon bars read as an equaliser in a music
    // player; at 2px on an 8px pitch the same wave reads as an engraved
    // instrument scale — the density is what makes it look machined rather
    // than decorative.
    pitch: 8,
    barWidth: 2,
    // Near-white rather than saturated volt. Luxury palettes spend their one
    // saturated colour on the action, not on the wallpaper; a neon backdrop
    // competes with the button it sits behind and cheapens both.
    color: '#e8f0d8',
    opacity: 0.1,
    // Roughly double the previous cycle. Premium motion is slow enough that
    // you notice it only if you look for it.
    period: 14000,
    periodAlt: 8600,
    wavelength: 0.22,
  },
  {
    // Just above the tab bar, where content padding always leaves room.
    cy: 0.9,
    height: 160,
    pitch: 10,
    barWidth: 2,
    color: '#9fb6bf',
    opacity: 0.07,
    period: 19000,
    periodAlt: 11500,
    wavelength: 0.17,
  },
];

function Bar({
  index,
  count,
  spec,
  clock,
  clockAlt,
}: {
  index: number;
  count: number;
  spec: BandSpec;
  clock: { value: number };
  clockAlt: { value: number };
}) {
  // Ends fade out so the band dissolves into the screen instead of stopping at
  // a hard edge against the bezel.
  const edgeFade = Math.sin((Math.PI * index) / Math.max(1, count - 1));

  const animated = useAnimatedStyle(() => {
    const phase = index * spec.wavelength;
    // Two travelling sines at unrelated speeds. One alone gives a clean
    // sine that reads as a screensaver; summing a faster one produces the
    // irregular crests of a real signal.
    const a = Math.sin(clock.value * TAU + phase);
    const b = Math.sin(clockAlt.value * TAU * 1.7 - phase * 0.6);
    const envelope = (a * 0.62 + b * 0.38 + 1) / 2; // 0..1
    return {
      transform: [{ scaleY: 0.06 + envelope * 0.94 }],
      opacity: (0.35 + envelope * 0.65) * edgeFade,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: index * spec.pitch,
          width: spec.barWidth,
          height: spec.height,
          borderRadius: spec.barWidth / 2,
          backgroundColor: spec.color,
        },
        animated,
      ]}
    />
  );
}

function Band({ spec, width, height, moving, energy }: {
  spec: BandSpec;
  width: number;
  height: number;
  moving: boolean;
  energy: number;
}) {
  // Energy shortens the cycle rather than changing the shape: the wave people
  // learned to recognise stays the same wave, it just runs harder.
  const clock = useClock(Math.round(spec.period / energy), moving);
  const clockAlt = useClock(Math.round(spec.periodAlt / energy), moving);
  const count = Math.ceil(width / spec.pitch) + 1;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        top: height * spec.cy - spec.height / 2,
        width,
        height: spec.height,
        opacity: spec.opacity * energy,
      }}
    >
      {Array.from({ length: count }, (_, index) => (
        <Bar
          clock={clock}
          clockAlt={clockAlt}
          count={count}
          index={index}
          key={index}
          spec={spec}
        />
      ))}
    </View>
  );
}

/**
 * Two dim lights so the black has some depth under the wave.
 *
 * These carry the only colour in the backdrop now that the wave is neutral, and
 * they are deliberately below the threshold where you could name the hue: the
 * screen should look like it is lit from somewhere, not tinted.
 */
const GLOW = [
  { colors: ['rgba(195,244,0,0.09)', 'rgba(195,244,0,0)'] as const, size: 1.35, x: -0.22, y: -0.12, px: 41000, py: 52000 },
  { colors: ['rgba(120,110,255,0.08)', 'rgba(120,110,255,0)'] as const, size: 1.2, x: 0.42, y: 0.55, px: 58000, py: 44000 },
];

function Glow({ index, width, moving }: { index: number; width: number; moving: boolean }) {
  const spec = GLOW[index]!;
  const clockX = useClock(spec.px, moving);
  const clockY = useClock(spec.py, moving);
  const diameter = width * spec.size;

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: width * 0.22 * Math.sin(clockX.value * TAU) },
      { translateY: width * 0.16 * Math.cos(clockY.value * TAU) },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: diameter,
          height: diameter,
          left: width * spec.x,
          top: width * spec.y,
        },
        animated,
      ]}
    >
      <LinearGradient
        colors={spec.colors}
        end={{ x: 0.5, y: 1 }}
        start={{ x: 0.5, y: 0 }}
        style={{ flex: 1, borderRadius: diameter / 2 }}
      />
    </Animated.View>
  );
}

/**
 * Mounted once behind every screen. Non-interactive by construction so it can
 * never intercept a touch meant for content.
 */
export function AmbientBackground() {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const moving = !reduceMotion;
  const intensity = useAmbientStore((state) => state.intensity);
  // 1.0 while browsing, 1.9 during a live session. Chosen by eye: enough that
  // the room visibly changes when training starts, not so much that the wave
  // starts competing with the numbers the user is reading off the screen.
  const energy = intensity === 'active' ? 1.9 : 1;

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]}>
      {GLOW.map((_, index) => (
        <Glow index={index} key={index} moving={moving} width={width} />
      ))}
      {BANDS.map((spec, index) => (
        <Band
          energy={energy}
          height={height}
          key={index}
          moving={moving}
          spec={spec}
          width={width}
        />
      ))}
    </View>
  );
}
