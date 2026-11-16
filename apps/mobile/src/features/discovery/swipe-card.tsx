import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, type ComposedGesture } from 'react-native-gesture-handler';
import Animated, { type AnimatedStyle, type SharedValue } from 'react-native-reanimated';
import type { ViewStyle } from 'react-native';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { initialsOf } from '@/lib/format';
import { alpha, colors, fontSizes, ink, radii } from '@/theme';
import { CardInfo } from './card-info';
import { DecisionStamp } from './decision-stamp';
import { SCRIM_TOP } from './scrims';

function photoAt(entry: GymDirectoryEntry, index: number): string | null {
  return entry.photos.length > 0 ? (entry.photos[index]?.url ?? entry.photoUrl) : entry.photoUrl;
}

function StoryBars({ count, active }: { count: number; active: number }) {
  return (
    <>
      <LinearGradient colors={SCRIM_TOP} pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 60 }} />
      <View pointerEvents="none" style={{ position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', gap: 5 }}>
        {Array.from({ length: count }).map((_, idx) => (
          <View
            key={idx}
            style={{
              flex: 1,
              height: 3,
              borderRadius: radii.full,
              backgroundColor: idx === active ? ink.white : alpha(ink.white, 0.35),
              shadowColor: idx === active ? ink.white : 'transparent',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: idx === active ? 0.6 : 0,
              shadowRadius: 3,
            }}
          />
        ))}
      </View>
    </>
  );
}

/** The draggable top card: photo carousel, decision stamps and member info. */
export function SwipeCard({
  entry,
  gesture,
  style,
  photoIndex,
  photoCount,
  threshold,
  translateX,
  onOpenDetail,
}: {
  entry: GymDirectoryEntry;
  gesture: ComposedGesture;
  style: AnimatedStyle<ViewStyle>;
  photoIndex: number;
  photoCount: number;
  threshold: number;
  translateX: SharedValue<number>;
  onOpenDetail: () => void;
}) {
  const photoUrl = photoAt(entry, photoIndex);
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: 26,
            overflow: 'hidden',
            backgroundColor: colors.surfaceLow,
            borderWidth: 1,
            borderColor: alpha(ink.white, 0.12),
            shadowColor: ink.black,
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
            shadowRadius: 20,
            elevation: 10,
          },
          style,
        ]}
      >
        {photoUrl ? (
          <Image
            cachePolicy="memory-disk"
            contentFit="cover"
            priority="high"
            recyclingKey={photoUrl}
            source={{ uri: photoUrl }}
            style={StyleSheet.absoluteFill}
            transition={140}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }]}>
            <View style={{ width: 104, height: 104, borderRadius: radii.full, backgroundColor: colors.surfaceHighest, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: colors.textSecondary, fontSize: fontSizes['2xl'], fontWeight: '700' }}>
                {initialsOf(entry.displayName, undefined)}
              </Text>
            </View>
          </View>
        )}
        {photoCount > 1 ? <StoryBars active={photoIndex} count={photoCount} /> : null}
        <DecisionStamp color={colors.volt} label="ME INTERESA" side="left" threshold={threshold} translateX={translateX} />
        <DecisionStamp color={colors.danger} label="PASO" side="right" threshold={threshold} translateX={translateX} />
        <CardInfo entry={entry} onOpenDetail={onOpenDetail} />
      </Animated.View>
    </GestureDetector>
  );
}
