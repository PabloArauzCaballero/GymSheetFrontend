import { useEffect, useRef } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { gymsheetTenant } from '@gymsheet/design-tokens';
import { colors } from '@/theme';

/**
 * Geometry of `assets/splash.png`, the native launch image. The intro draws the
 * very same file at the very same place, so the hand-off from the OS splash to
 * the app is invisible: the tile does not move by a pixel, the wordmark simply
 * arrives under it.
 */
const SPLASH = {
  width: 1284,
  height: 2778,
  /** Tile width as a fraction of the image width. */
  tile: 0.28,
  /** Tile centre as a fraction of the image height. */
  centerY: 0.46,
} as const;

/**
 * Timings, in ms. Short on purpose: an intro is a greeting, not a wait. The
 * whole thing is under a second unless the session takes longer to restore,
 * and then the finished mark simply stays on screen.
 */
export const INTRO = {
  /** The wordmark rises in under the tile. */
  wordDelay: 90,
  word: 420,
  /** The thin accent rule draws out from the centre. */
  ruleDelay: 260,
  rule: 380,
  /** Never leave before this, so the mark is actually seen. */
  minimum: 680,
  /** With Reduce Motion everything is static and the wait is shorter. */
  minimumReduced: 300,
  /** The fade into the app. Leaving is faster than arriving. */
  exit: 200,
} as const;

/** `expo.splash.backgroundColor` in app.json. */
const SPLASH_BACKGROUND = '#000000';

const EASE_OUT = Easing.bezier(0.2, 0, 0, 1);

/**
 * The launch intro: the native splash, continued and finished.
 *
 * Renders until `ready` is true and the minimum time has passed, then fades out
 * and calls `onDone`. Everything animated is `opacity` and `transform`, so it
 * costs no layout work while the app is still busy restoring the session.
 */
export function LaunchIntro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();

  const word = useSharedValue(reduceMotion ? 1 : 0);
  const rule = useSharedValue(reduceMotion ? 1 : 0);
  const exit = useSharedValue(1);
  const startedAt = useRef(Date.now());
  const leaving = useRef(false);

  useEffect(() => {
    if (reduceMotion) return;
    word.value = withDelay(INTRO.wordDelay, withTiming(1, { duration: INTRO.word, easing: EASE_OUT }));
    rule.value = withDelay(INTRO.ruleDelay, withTiming(1, { duration: INTRO.rule, easing: EASE_OUT }));
  }, [reduceMotion, rule, word]);

  useEffect(() => {
    if (!ready || leaving.current) return;
    const minimum = reduceMotion ? INTRO.minimumReduced : INTRO.minimum;
    const wait = Math.max(0, minimum - (Date.now() - startedAt.current));
    const timer = setTimeout(() => {
      leaving.current = true;
      if (reduceMotion) {
        onDone();
        return;
      }
      exit.value = withTiming(0, { duration: INTRO.exit, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) runOnJS(onDone)();
      });
    }, wait);
    return () => clearTimeout(timer);
  }, [exit, onDone, ready, reduceMotion]);

  // Where `contain` puts the splash image on this screen.
  const scale = Math.min(width / SPLASH.width, height / SPLASH.height);
  const imageW = SPLASH.width * scale;
  const imageH = SPLASH.height * scale;
  const imageTop = (height - imageH) / 2;
  const tile = SPLASH.width * SPLASH.tile * scale;
  const tileBottom = imageTop + SPLASH.height * SPLASH.centerY * scale + tile / 2;

  const wordStyle = useAnimatedStyle(() => ({
    opacity: word.value,
    transform: [{ translateY: (1 - word.value) * 10 }],
  }));
  const ruleStyle = useAnimatedStyle(() => ({
    opacity: rule.value,
    transform: [{ scaleX: rule.value }],
  }));
  const exitStyle = useAnimatedStyle(() => ({
    opacity: exit.value,
    transform: [{ scale: 1 + (1 - exit.value) * 0.04 }],
  }));

  return (
    <View
      accessibilityLabel="GymSheet"
      accessibilityRole="image"
      // `splash.backgroundColor` in app.json: the native splash continues here.
      style={[StyleSheet.absoluteFill, { backgroundColor: SPLASH_BACKGROUND }]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, exitStyle]}>
        <Image
          fadeDuration={0}
          resizeMode="contain"
          source={require('../../assets/splash.png')}
          style={{ position: 'absolute', left: (width - imageW) / 2, top: imageTop, width: imageW, height: imageH }}
        />
        <View
          style={{ position: 'absolute', left: 0, right: 0, top: tileBottom + tile * 0.32, alignItems: 'center' }}
        >
          <Animated.View style={wordStyle}>
            <Text
              allowFontScaling={false}
              style={{
                color: colors.text,
                fontSize: Math.round(tile * 0.2),
                fontWeight: '700',
                letterSpacing: tile * 0.065,
                // Tracking adds space after the last letter too; this puts the
                // optical centre back under the tile.
                marginRight: -tile * 0.065,
              }}
            >
              GYMSHEET
            </Text>
          </Animated.View>
          <Animated.View
            style={[
              {
                marginTop: tile * 0.12,
                width: tile * 0.42,
                height: 2,
                borderRadius: 1,
                // The launch image is the product's own mark, whatever gym the
                // build later resolves to, so the rule matches it, not the tenant.
                backgroundColor: gymsheetTenant.colors.accent,
              },
              ruleStyle,
            ]}
          />
        </View>
      </Animated.View>
    </View>
  );
}
