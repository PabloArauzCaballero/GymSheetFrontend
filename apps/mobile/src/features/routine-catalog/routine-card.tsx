import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import {
  WEEKDAY_INITIALS,
  authorLabel,
  cardSubtitle,
  copiesLabel,
  ratingLabel,
  weekDots,
} from '@gymsheet/hooks';
import type { RoutineCard } from '@gymsheet/schemas';
import { Badge } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { GOAL_LABEL } from '@/lib/format';
import { colors, fontSizes, radii, semibold, spacing } from '@/theme';

/** Los siete días de la semana como puntos: relleno = se entrena ese día. */
function WeekDots({ card }: { card: RoutineCard }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', gap: 4 }}
    >
      {weekDots(card).map(({ dia, entrena }) => (
        <View
          key={dia}
          style={{
            width: 18,
            height: 18,
            borderRadius: radii.full,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: entrena ? colors.volt : colors.surfaceHigh,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              fontWeight: semibold,
              color: entrena ? colors.background : colors.textMuted,
            }}
          >
            {WEEKDAY_INITIALS[dia]}
          </Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Tarjeta del catálogo (RF-01): nombre, objetivo, días y duración, autor o sello
 * REPP, valoración, copias y la miniatura de la semana. Es un solo elemento
 * accesible que lee todo eso de corrido.
 */
export function RoutineCardView({
  card,
  onPress,
}: {
  card: RoutineCard;
  onPress: () => void;
}) {
  const author = authorLabel(card);
  const rating = ratingLabel(card.valoracion);
  const label = [
    card.nombre,
    card.esOficial ? 'Recomendada por REPP' : `de ${author}`,
    cardSubtitle(card),
    card.objetivo ? GOAL_LABEL[card.objetivo] : null,
    rating,
    copiesLabel(card.copias),
  ]
    .filter(Boolean)
    .join('. ');
  return (
    <PressableScale
      accessibilityLabel={label}
      haptic="selection"
      onPress={onPress}
      scaleTo={0.985}
      style={{
        gap: spacing.sm,
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: card.esOficial ? `${colors.volt}66` : colors.borderSubtle,
        backgroundColor: colors.surfaceLow,
        padding: spacing.md,
      }}
      testID={`routine-card-${card.id}`}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <Text
          numberOfLines={2}
          style={{ flex: 1, color: colors.text, fontSize: fontSizes.lg, fontWeight: semibold }}
        >
          {card.nombre}
        </Text>
        {card.esOficial ? <Badge label="REPP" tone="success" /> : null}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        {card.objetivo ? <Badge label={GOAL_LABEL[card.objetivo]} tone="info" /> : null}
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{cardSubtitle(card)}</Text>
      </View>
      <WeekDots card={card} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text
          numberOfLines={1}
          style={{ flex: 1, color: colors.textMuted, fontSize: fontSizes.sm }}
        >
          {card.esOficial ? 'Recomendada por REPP' : author}
        </Text>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>
          {rating}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons color={colors.textMuted} name="copy-outline" size={14} />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{card.copias}</Text>
        </View>
      </View>
    </PressableScale>
  );
}
