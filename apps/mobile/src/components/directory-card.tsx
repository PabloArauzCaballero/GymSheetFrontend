import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text, View } from 'react-native';
import type { GymDirectoryEntry } from '@gymsheet/schemas';
import { initialsOf } from '@/lib/format';
import {
  EXPERIENCE_LEVEL_LABEL,
  GENDER_LABEL,
  SOCIAL_STATUS_LABEL,
  TRAINING_GOAL_LABEL,
} from '@/lib/social-labels';
import { colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/** «GYM_RAT» → «Gym Rat»: el catálogo de rangos no expone un nombre aparte del código. */
export function levelTitle(code: string): string {
  return code
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function MetaChip({
  color = 'rgba(255,255,255,0.85)',
  icon,
  label,
  strong = false,
}: {
  color?: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  strong?: boolean;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons color={color} name={icon} size={iconSizes.sm} />
      <Text style={{ color, fontSize: fontSizes.xs, fontWeight: strong ? semibold : '400' }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * La cara de una persona: foto grande y, encima de ella, lo que hace falta para
 * decidir —nombre, objetivo, sucursal, género, experiencia, rango y puntos—.
 *
 * Es sólo la superficie: ni gesto ni botones. Así la misma tarjeta sirve para
 * la baraja de descubrimiento, donde la decisión se toma arrastrando, y para
 * cualquier lista donde la decisión se toma pulsando un botón debajo.
 */
export function DirectoryCardFace({ entry }: { entry: GymDirectoryEntry }) {
  return (
    <View style={{ aspectRatio: 4 / 5, backgroundColor: colors.surfaceHigh }}>
      {entry.photoUrl ? (
        <Image
          contentFit="cover"
          source={{ uri: entry.photoUrl }}
          style={{ width: '100%', height: '100%' }}
          transition={200}
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceHigh,
          }}
        >
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: radii.full,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: colors.volt,
            }}
          >
            <Text style={{ color: colors.background, fontSize: fontSizes.xl, fontWeight: '700' }}>
              {initialsOf(entry.displayName, undefined)}
            </Text>
          </View>
        </View>
      )}

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          paddingTop: spacing.xl,
          backgroundColor: 'rgba(0,0,0,0.55)',
        }}
      >
        <Text style={{ color: '#fff', fontSize: fontSizes.lg, fontWeight: '700' }}>
          {entry.displayName}
        </Text>
        <View
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs }}
        >
          {entry.objetivo ? (
            <MetaChip
              icon="flag-outline"
              label={TRAINING_GOAL_LABEL[entry.objetivo] ?? entry.objetivo}
            />
          ) : null}
          {entry.branchName ? <MetaChip icon="business-outline" label={entry.branchName} /> : null}
          {entry.gender ? (
            <MetaChip
              icon="person-outline"
              label={GENDER_LABEL[entry.gender] ?? entry.gender}
            />
          ) : null}
          {entry.experienceLevel ? (
            <MetaChip
              icon="school-outline"
              label={EXPERIENCE_LEVEL_LABEL[entry.experienceLevel] ?? entry.experienceLevel}
            />
          ) : null}
          {entry.levelCode ? (
            <MetaChip
              color={colors.volt}
              icon="trophy-outline"
              label={`${levelTitle(entry.levelCode)}${
                typeof entry.points === 'number'
                  ? ` · ${entry.points.toLocaleString('es-ES')} pts`
                  : ''
              }`}
              strong
            />
          ) : null}
        </View>
        {entry.socialStatus ? (
          <Text
            style={{
              color: colors.volt,
              fontSize: fontSizes.xs,
              marginTop: spacing.xs,
              fontWeight: semibold,
            }}
          >
            {SOCIAL_STATUS_LABEL[entry.socialStatus]}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
