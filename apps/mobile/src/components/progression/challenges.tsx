import { Ionicons } from '@expo/vector-icons';
import { CHALLENGE_DIFFICULTY_LABEL, challengesSummary, weekCountdownLabel } from '@gymsheet/domain';
import type { Challenge, WeeklyChallenges } from '@gymsheet/schemas';
import { Text, View } from 'react-native';
import { rarityOf } from '@/components/celebration';
import { PressableScale } from '@/components/motion';
import { ProgressTrack } from '@/components/progression';
import { alpha, cardMaterials, cardPadding, colors, fontSizes, iconSizes, radii, semibold, spacing } from '@/theme';

/** El material del reto según su dificultad: el mismo que su carta. */
function materialOf(challenge: Challenge) {
  return cardMaterials[rarityOf({ kind: 'challenge', challenge })];
}

/**
 * Cabecera de la semana: cuánto queda y cómo vas. «Quedan 3 días · 2 de 3
 * retos». Con los tres, «Semana redonda +150» en el oro de las cartas.
 */
export function ChallengesHeader({ week, now }: { week: WeeklyChallenges; now?: Date }) {
  const countdown = weekCountdownLabel(week.endsAt, now);
  const gold = cardMaterials.LEGENDARIA.label;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
      <Ionicons color={colors.textMuted} name="time-outline" size={iconSizes.sm} />
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.footnote }}>{countdown}</Text>
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.footnote }}>·</Text>
      <Text
        style={{
          color: week.perfect ? gold : colors.textSecondary,
          fontSize: fontSizes.footnote,
          fontWeight: semibold,
          fontVariant: ['tabular-nums'],
        }}
      >
        {week.perfect ? `${challengesSummary(week)} +${week.perfectBonus}` : challengesSummary(week)}
      </Text>
      {week.perfect ? null : (
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.footnote }}>
          {`· los tres, +${week.perfectBonus} extra`}
        </Text>
      )}
    </View>
  );
}

/**
 * Un reto: qué hacer, cuánto llevas y cuánto vale. La barra y la etiqueta de
 * dificultad llevan el material de su carta (jade, zafiro, amatista); el volt
 * se queda para la acción de la pantalla.
 */
export function ChallengeCard({
  challenge,
  highlight = false,
  delayMs = 0,
  onPress,
}: {
  challenge: Challenge;
  /** Cumplido en esta misma sesión: se marca con borde y «¡Hecho ahora!». */
  highlight?: boolean;
  delayMs?: number;
  onPress?: () => void;
}) {
  const material = materialOf(challenge);
  const done = challenge.completed;
  const content = (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: radii.md,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: alpha(material.shadow, done ? 0.28 : 0.14),
          }}
        >
          <Ionicons
            color={material.label}
            name={done ? 'checkmark' : (challenge.icon as keyof typeof Ionicons.glyphMap)}
            size={iconSizes.md}
          />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text numberOfLines={2} style={{ color: colors.text, fontSize: fontSizes.sm, fontWeight: semibold }}>
            {challenge.title}
          </Text>
          <Text numberOfLines={1} style={{ color: colors.textMuted, fontSize: fontSizes.xs }}>
            {`${CHALLENGE_DIFFICULTY_LABEL[challenge.difficulty]} · +${challenge.pointsReward} pts`}
          </Text>
        </View>
        {done ? (
          <View
            style={{
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
              borderRadius: radii.full,
              backgroundColor: alpha(material.label, 0.16),
            }}
          >
            <Text style={{ color: material.label, fontSize: fontSizes.xs, fontWeight: semibold }}>
              {highlight ? '¡Hecho ahora!' : 'Hecho'}
            </Text>
          </View>
        ) : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <ProgressTrack color={material.label} delayMs={delayMs} height={6} ratio={challenge.progress} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.textMuted, fontSize: fontSizes.xs }}>
            {challenge.description}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: fontSizes.xs, fontVariant: ['tabular-nums'] }}>
            {challenge.progressLabel}
          </Text>
        </View>
      </View>
    </>
  );
  const surface = {
    gap: spacing.sm,
    borderRadius: radii.lg,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: highlight || done ? alpha(material.label, highlight ? 0.6 : 0.28) : colors.borderSubtle,
    backgroundColor: colors.surfaceLow,
    padding: cardPadding - 6,
  } as const;
  if (onPress && done) {
    return (
      <PressableScale accessibilityLabel={`${challenge.title}. Cumplido. Toca para ver su carta`} onPress={onPress} style={surface}>
        {content}
      </PressableScale>
    );
  }
  return (
    <View
      accessibilityLabel={`${challenge.title}. ${CHALLENGE_DIFFICULTY_LABEL[challenge.difficulty]}. ${challenge.progressLabel}.${
        done ? ' Cumplido.' : ''
      }`}
      accessible
      style={surface}
    >
      {content}
    </View>
  );
}

/** Los tres retos con su cabecera. */
export function ChallengesList({
  week,
  highlight,
  onOpen,
  baseDelayMs = 0,
}: {
  week: WeeklyChallenges;
  /** Códigos cumplidos en esta sesión. */
  highlight?: ReadonlySet<string>;
  onOpen?: (challenge: Challenge) => void;
  baseDelayMs?: number;
}) {
  return (
    <View style={{ gap: spacing.sm }}>
      <ChallengesHeader week={week} />
      {week.items.map((challenge, index) => (
        <ChallengeCard
          challenge={challenge}
          delayMs={baseDelayMs + index * 90}
          highlight={highlight?.has(challenge.code) ?? false}
          key={challenge.code}
          onPress={onOpen ? () => onOpen(challenge) : undefined}
        />
      ))}
    </View>
  );
}
