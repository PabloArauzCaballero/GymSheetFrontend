import { LinearGradient } from 'expo-linear-gradient';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { SocialMapNearbyPerson } from '@gymsheet/schemas';
import { MediaImage } from '@/components/media-image';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { colors, fontSizes, heroScrim, mediaChip, radii, semibold, spacing, stagger } from '@/theme';

const COLUMNS = 3;
const GAP = spacing.xxs;

function distanceLabel(km: number | null): string | null {
  if (km === null) return null;
  return km <= 1 ? 'a < 1 km' : `a ${km} km`;
}

function PersonTile({ person, size, index, onPress }: {
  person: SocialMapNearbyPerson;
  size: number;
  index: number;
  onPress: () => void;
}) {
  const distance = distanceLabel(person.distanceKm);
  const label = [person.displayName, person.age ? `${person.age} años` : null, distance].filter(Boolean).join(', ');
  return (
    <Animated.View entering={FadeIn.delay(Math.min(index, 12) * stagger).duration(220)}>
      <PressableScale accessibilityLabel={label} onPress={onPress} scaleTo={0.96}>
        <MediaImage
          fallback={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceHigh }}>
              <PersonAvatar id={person.userId} name={person.displayName} size={size * 0.5} />
            </View>
          }
          style={{ width: size, height: size, backgroundColor: colors.surfaceHigh }}
          uri={person.photoUrl}
        >
          <LinearGradient
            colors={heroScrim.colors}
            locations={heroScrim.locations}
            pointerEvents="none"
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: size * 0.55 }}
          />
          {distance ? (
            <View style={{ position: 'absolute', top: spacing.xs, right: spacing.xs, backgroundColor: mediaChip.bg, borderColor: mediaChip.border, borderWidth: 1, borderRadius: radii.full, paddingHorizontal: spacing.xs + 2, paddingVertical: 1 }}>
              <Text style={{ color: mediaChip.text, fontSize: fontSizes.xs, fontWeight: semibold }}>{distance}</Text>
            </View>
          ) : null}
          <View style={{ position: 'absolute', left: spacing.xs + 2, right: spacing.xs, bottom: spacing.xs }}>
            <Text numberOfLines={1} style={{ color: mediaChip.text, fontSize: fontSizes.footnote, fontWeight: semibold }}>
              {person.displayName}{person.age ? `, ${person.age}` : ''}
            </Text>
            {person.connectionStatus === 'ACCEPTED' ? (
              <Text numberOfLines={1} style={{ color: colors.accentInk, fontSize: fontSizes.xs, fontWeight: semibold }}>Conectados</Text>
            ) : null}
          </View>
        </MediaImage>
      </PressableScale>
    </Animated.View>
  );
}

/** Edge-to-edge grid of square photos, nearest first (as in Grindr). */
export function PeopleGrid({ people, onOpen }: { people: SocialMapNearbyPerson[]; onOpen: (userId: string) => void }) {
  const { width } = useWindowDimensions();
  const size = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
      {people.map((person, index) => (
        <PersonTile index={index} key={person.userId} onPress={() => onOpen(person.userId)} person={person} size={size} />
      ))}
    </View>
  );
}

/** Placeholder tiles while the grid loads: same shape, no spinner jump. */
export function PeopleGridSkeleton() {
  const { width } = useWindowDimensions();
  const size = Math.floor((width - GAP * (COLUMNS - 1)) / COLUMNS);
  return (
    <View accessibilityLabel="Cargando personas" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
      {Array.from({ length: 6 }, (_, index) => (
        <View key={index} style={{ width: size, height: size, backgroundColor: colors.surfaceHigh, opacity: 1 - index * 0.1 }} />
      ))}
    </View>
  );
}
