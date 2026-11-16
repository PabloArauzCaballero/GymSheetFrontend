import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { levelTitle } from '@/components/directory-card';
import { PressableScale } from '@/components/motion';
import { TRAINING_GOAL_LABEL } from '@/lib/social-labels';
import { accentHues, alpha, colors, fontSizes, ink, radii, spacing } from '@/theme';
import { SCRIM_BOTTOM, SCRIM_BOTTOM_STOPS } from './scrims';

function Chip({
  icon,
  iconColor = colors.volt,
  children,
  level = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  children: ReactNode;
  level?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.full,
        backgroundColor: level ? alpha(accentHues.volt, 0.18) : alpha(colors.background, 0.7),
        borderWidth: 1,
        borderColor: level ? alpha(accentHues.volt, 0.4) : alpha(ink.white, 0.14),
      }}
    >
      <Ionicons color={iconColor} name={icon} size={13} />
      <Text
        style={{
          color: level ? colors.volt : ink.white,
          fontSize: fontSizes.xs,
          fontWeight: level ? '700' : '600',
          fontVariant: level ? ['tabular-nums'] : undefined,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** Name, age and metadata chips over the bottom scrim of the top card. */
export function CardInfo({ entry, onOpenDetail }: { entry: GymDirectoryEntry; onOpenDetail: () => void }) {
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
            <Text numberOfLines={1} style={{ color: ink.white, fontSize: fontSizes.xl, fontWeight: '800', letterSpacing: -0.6 }}>
              {entry.displayName}
            </Text>
            {typeof entry.age === 'number' ? (
              <Text style={{ color: alpha(ink.white, 0.85), fontSize: fontSizes.heading, fontWeight: '400' }}>{entry.age}</Text>
            ) : null}
            <Ionicons color={accentHues.sky} name="checkmark-circle" size={22} />
          </View>
          <PressableScale
            accessibilityLabel={`Ver perfil completo de ${entry.displayName}`}
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onOpenDetail();
            }}
            style={{
              width: 38,
              height: 38,
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
      </View>
    </LinearGradient>
  );
}
