import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { type AnimatedStyle } from 'react-native-reanimated';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { initialsOf } from '@/lib/format';
import { colors, fontSizes } from '@/theme';
import { SCRIM_BOTTOM, SCRIM_BOTTOM_STOPS } from './scrims';

/** The card waiting behind the top one: it says the deck goes on without competing. */
export function NextCard({ entry, style }: { entry: GymDirectoryEntry; style: AnimatedStyle<ViewStyle> }) {
  const photoUrl = entry.photos[0]?.url ?? entry.photoUrl;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        { borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surfaceLow, borderWidth: 1, borderColor: colors.borderSubtle },
        style,
      ]}
    >
      {photoUrl ? (
        <Image
          cachePolicy="memory-disk"
          contentFit="cover"
          priority="low"
          recyclingKey={photoUrl}
          source={{ uri: photoUrl }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.surfaceHigh, alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={{ color: colors.textMuted, fontSize: fontSizes['2xl'], fontWeight: '700' }}>
            {initialsOf(entry.displayName, undefined)}
          </Text>
        </View>
      )}
      <LinearGradient colors={SCRIM_BOTTOM} locations={SCRIM_BOTTOM_STOPS} style={StyleSheet.absoluteFill} />
    </Animated.View>
  );
}
