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
import type { RoutineCard } from '@gymsheet/types';
import { Badge } from '@/components/layout';
import { PressableScale } from '@/components/motion';
import { GOAL_LABEL } from '@/lib/format';
import { accentPolicy, cardPadding, colors, fontSizes, iconSizes, radii, semibold, shadows, spacing } from '@/theme';

/**
 * Los siete días de la semana como puntos. Sin acento (C8.1: el volt es de la
 * acción principal): todos los puntos van en `surfaceHighest` y se distinguen
 * por la tinta de la letra — secundaria si se entrena, apagada si se descansa.
 */
function WeekDots({ card }: { card: RoutineCard }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', gap: spacing.xs }}
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
            backgroundColor: colors.surfaceHighest,
          }}
        >
          <Text
            style={{
              fontSize: fontSizes.xs,
              fontWeight: semibold,
              color: entrena ? colors.textSecondary : colors.textMuted,
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
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
        padding: cardPadding,
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
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        {card.objetivo ? <Badge label={GOAL_LABEL[card.objetivo]} /> : null}
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{cardSubtitle(card)}</Text>
      </View>
      <WeekDots card={card} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          {card.esOficial ? (
            <Ionicons
              accessibilityElementsHidden
              color={accentPolicy.glyph}
              importantForAccessibility="no-hide-descendants"
              name="checkmark-circle"
              size={iconSizes.sm}
            />
          ) : null}
          <Text numberOfLines={1} style={{ flexShrink: 1, color: colors.textMuted, fontSize: fontSizes.sm }}>
            {card.esOficial ? 'Recomendada por REPP' : author}
          </Text>
        </View>
        <Text style={{ color: colors.text, fontSize: fontSizes.sm, fontVariant: ['tabular-nums'] }}>
          {rating}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Ionicons color={colors.textMuted} name="copy-outline" size={iconSizes.sm} />
          <Text style={{ color: colors.textMuted, fontSize: fontSizes.sm }}>{card.copias}</Text>
        </View>
      </View>
    </PressableScale>
  );
}
