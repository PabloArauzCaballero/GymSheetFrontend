import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { DiscoveryCard } from '@gymsheet/schemas';
import { levelTitle } from '@/components/directory-card';
import { PressableScale } from '@/components/motion';
import { orientationLabels } from '@gymsheet/domain';
import { useInterestLabels } from '@/features/social-profile/use-interest-catalog';
import { TRAINING_GOAL_LABEL } from '@/lib/social-labels';
import { alpha, fontSizes, ink, minTouchTarget, radii, spacing } from '@/theme';
import { CardChip as Chip } from './card-chip';
import { CardReasons, VerifiedBadge } from './card-context';
import { cardContextOf } from './card-context-logic';
import { SCRIM_BOTTOM, SCRIM_BOTTOM_STOPS } from './scrims';

/** Cards show three interests at most; the full list lives in the detail sheet. */
const CARD_INTERESTS = 3;

/** Name, age, verified badge, distance, reasons, metadata and a glimpse of the "Conocer" answers. */
export function CardInfo({ entry, onOpenDetail }: { entry: DiscoveryCard; onOpenDetail: () => void }) {
  const context = cardContextOf(entry);
  const interests = useInterestLabels(entry.about?.interests);
  const bio = entry.about?.bio?.trim();
  const orientation = entry.about?.orientation;
  const soft = alpha(ink.white, 0.85);
  return (
    <LinearGradient
      colors={SCRIM_BOTTOM}
      locations={SCRIM_BOTTOM_STOPS}
      pointerEvents="box-none"
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, paddingTop: spacing['2xl'] }}
    >
      <View style={{ gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
            <Text numberOfLines={1} style={{ color: ink.white, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: -0.6, flexShrink: 1 }}>
              {entry.displayName}
            </Text>
            {typeof entry.age === 'number' ? (
              <Text style={{ color: alpha(ink.white, 0.85), fontSize: fontSizes.heading, fontWeight: '400' }}>{entry.age}</Text>
            ) : null}
            {context.verified ? <VerifiedBadge /> : null}
          </View>
          <PressableScale
            accessibilityLabel={`Ver perfil completo de ${entry.displayName}`}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenDetail();
            }}
            style={{
              width: minTouchTarget,
              height: minTouchTarget,
              borderRadius: radii.full,
              backgroundColor: alpha(ink.white, 0.18),
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: alpha(ink.white, 0.3),
            }}
          >
            <Ionicons color={ink.white} name="chevron-up" size={18} />
          </PressableScale>
        </View>

        <CardReasons context={context} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {entry.branchName ? <Chip icon="location-outline" iconColor={alpha(ink.white, 0.85)}>{entry.branchName}</Chip> : null}
          {entry.objetivo ? <Chip icon="barbell-outline">{TRAINING_GOAL_LABEL[entry.objetivo] ?? entry.objetivo}</Chip> : null}
          {entry.levelCode ? (
            <Chip icon="trophy-outline" level>
              {levelTitle(entry.levelCode)}
              {typeof entry.points === 'number' ? ` · ${entry.points} pts` : ''}
            </Chip>
          ) : null}
        </View>

        {bio ? (
          <Text numberOfLines={2} style={{ color: soft, fontSize: fontSizes.sm, lineHeight: 20 }}>
            {bio}
          </Text>
        ) : null}
        {interests.length > 0 || orientation ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
            {interests.slice(0, CARD_INTERESTS).map((label) => (
              <Chip icon="sparkles-outline" iconColor={soft} key={label}>{label}</Chip>
            ))}
            {interests.length > CARD_INTERESTS ? (
              <Chip icon="add" iconColor={soft}>{`${interests.length - CARD_INTERESTS}`}</Chip>
            ) : null}
            {orientation ? <Chip icon="person-outline" iconColor={soft}>{orientationLabels[orientation]}</Chip> : null}
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}
