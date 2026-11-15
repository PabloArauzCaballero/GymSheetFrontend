import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, type GestureResponderEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming } from 'react-native-reanimated';
import { MARKETPLACE_CATEGORIES, type MarketplaceCategoryId } from '@gymsheet/domain';
import { Text } from '@/components/text';
import { useReduceMotion } from '@/notifications/use-reduce-motion';
import { alpha, colors, fontSizes, glideSpring, ink, pressSpring, radii, releaseSpring, settleSpring, spacing, stagger } from '@/theme';
import { CATEGORY_IMAGES } from './category-images';

const TILE = 76;
const SLOT = TILE + 8;
/** Max press tilt in degrees: the tile leans toward the finger like a physical key. */
const TILT = 14;

function CategoryTile({
  id,
  label,
  index,
  selected,
  reduceMotion,
  onPress,
}: {
  id: MarketplaceCategoryId;
  label: string;
  index: number;
  selected: boolean;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const enter = useSharedValue(reduceMotion ? 1 : 0);
  const lift = useSharedValue(selected ? 1 : 0);
  const tiltX = useSharedValue(0);
  const tiltY = useSharedValue(0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    // Staggered entrance: each tile swings up from below, in reading order.
    enter.value = reduceMotion ? 1 : withDelay(index * stagger, withSpring(1, settleSpring));
  }, [enter, index, reduceMotion]);

  useEffect(() => {
    lift.value = reduceMotion ? withTiming(selected ? 1 : 0, { duration: 0 }) : withSpring(selected ? 1 : 0, glideSpring);
  }, [lift, reduceMotion, selected]);

  const onPressIn = (event: GestureResponderEvent) => {
    void Haptics.selectionAsync();
    pressed.value = withSpring(1, pressSpring);
    if (reduceMotion) return;
    const { locationX, locationY } = event.nativeEvent;
    tiltY.value = withSpring((locationX / TILE - 0.5) * TILT, pressSpring);
    tiltX.value = withSpring(-(locationY / TILE - 0.5) * TILT, pressSpring);
  };
  const onPressOut = () => {
    pressed.value = withSpring(0, releaseSpring);
    tiltX.value = withSpring(0, releaseSpring);
    tiltY.value = withSpring(0, releaseSpring);
  };

  const slotStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ perspective: 600 }, { translateY: (1 - enter.value) * 18 }, { rotateX: `${(1 - enter.value) * -28}deg` }],
  }));
  const tileStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 500 },
      { translateY: -4 * lift.value },
      { scale: 1 + 0.04 * lift.value - (reduceMotion ? 0 : 0.05 * pressed.value) },
      { rotateX: `${tiltX.value}deg` },
      { rotateY: `${tiltY.value}deg` },
    ],
  }));
  // Contact shadow tightens and fades as the tile lifts off the floor.
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: 0.55 - 0.2 * lift.value,
    transform: [{ scaleX: 0.88 - 0.16 * lift.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: lift.value,
    transform: [{ scale: 0.92 + 0.08 * lift.value }],
  }));
  const glareStyle = useAnimatedStyle(() => ({ opacity: 0.35 + 0.4 * pressed.value }));

  return (
    <Animated.View style={[{ width: SLOT, alignItems: 'center', gap: 6, paddingTop: spacing.xs }, slotStyle]}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ width: TILE, height: TILE }}
        testID={`marketplace-category-${id}`}
      >
        <Animated.View pointerEvents="none" style={[styles.shadow, shadowStyle]} />
        <Animated.View
          pointerEvents="none"
          style={[styles.halo, { borderColor: colors.volt, boxShadow: `0 8px 22px ${alpha(colors.volt, 0.45)}` }, haloStyle]}
        />
        <Animated.View
          style={[
            styles.tile,
            {
              borderColor: alpha(colors.text, 0.1),
              backgroundColor: colors.surfaceLow,
              boxShadow: `0 6px 14px ${alpha(colors.background, 0.7)}`,
            },
            tileStyle,
          ]}
        >
          <Image contentFit="cover" source={CATEGORY_IMAGES[id]} style={StyleSheet.absoluteFill} />
          {/* Specular sheen from the top-left edge; brightens while the finger is down. */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glareStyle]}>
            <LinearGradient
              colors={[alpha(ink.white, 0.28), alpha(ink.white, 0)]}
              end={{ x: 0.7, y: 0.6 }}
              start={{ x: 0, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Animated.View>
      </Pressable>
      <Text
        numberOfLines={1}
        style={{ color: selected ? colors.text : colors.textMuted, fontSize: fontSizes.xs, fontWeight: selected ? '700' : '500' }}
      >
        {label}
      </Text>
    </Animated.View>
  );
}

/**
 * Category row with 3D depth, mirroring the web rail: staggered entrance, tilt
 * toward the finger on press, lifted selected tile with a contact shadow and an
 * accent halo, and the selection scrolled to the centre. The selected state is
 * carried by shape (lift, border, bold label), not by colour alone.
 */
export function CategoryTiles({
  value,
  onChange,
}: {
  value: MarketplaceCategoryId;
  onChange: (next: MarketplaceCategoryId) => void;
}) {
  const reduceMotion = useReduceMotion();
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();

  const select = (id: MarketplaceCategoryId, index: number) => {
    onChange(id);
    const x = spacing.lg + index * (SLOT + spacing.md) + SLOT / 2 - width / 2;
    scrollRef.current?.scrollTo({ x: Math.max(0, x), animated: !reduceMotion });
  };

  return (
    <ScrollView
      contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}
      horizontal
      ref={scrollRef}
      showsHorizontalScrollIndicator={false}
    >
      {MARKETPLACE_CATEGORIES.map((category, index) => (
        <CategoryTile
          id={category.id}
          index={index}
          key={category.id}
          label={category.label}
          onPress={() => select(category.id, index)}
          reduceMotion={reduceMotion}
          selected={category.id === value}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: -8,
    height: 12,
    borderRadius: 999,
    backgroundColor: alpha(ink.black, 0.5),
    filter: [{ blur: 6 }],
  },
  halo: {
    position: 'absolute',
    top: -7,
    left: -3,
    right: -3,
    bottom: 1,
    borderRadius: radii.xl + 3,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  tile: {
    flex: 1,
    borderRadius: radii.xl,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
