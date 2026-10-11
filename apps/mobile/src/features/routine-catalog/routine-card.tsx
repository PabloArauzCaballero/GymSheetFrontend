import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { authorLabel, cardSubtitle, compactCount, downloadsLabel, ratingLabel, ratingValue } from '@gymsheet/hooks';
import type { RoutineCard } from '@gymsheet/types';
import { Skeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { GOAL_LABEL } from '@/lib/format';
import { RoutineCover } from '@/features/routine-catalog/routine-cover';
import { MediaChip } from '@/features/routine-catalog/media-chip';
import { cardPadding, colors, iconSizes, ink, radii, ratingStar, shadows, spacing } from '@/theme';

const COVER_HEIGHT = 208;
const AVATAR = 28;

/** Una cifra con su icono: «★ 4,6», «⬇ 12». */
function Stat({ icon, value, color }: { icon: keyof typeof Ionicons.glyphMap; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons color={color ?? colors.textMuted} name={icon} size={iconSizes.sm} />
      <Text tabular tone="secondary" variant="subhead">
        {value}
      </Text>
    </View>
  );
}

/**
 * Tarjeta del catálogo (rediseño 2026-10-11, segunda pasada): portada con la
 * imagen de un ejercicio; encima, en vidrio, el objetivo y «días · semanas», y
 * el nombre en blanco sobre el velo. Debajo, una sola fila: quién la hizo (foto
 * o iniciales) y dos cifras que se entienden sin leer, estrellas y descargas.
 * Es un solo elemento accesible que lo lee de corrido.
 */
export function RoutineCardView({
  card,
  onPress,
}: {
  card: RoutineCard;
  onPress: () => void;
}) {
  const author = authorLabel(card);
  const rating = ratingValue(card.valoracion);
  const showsCommunity = card.visibilidad === 'PUBLIC' || card.esOficial;
  const label = [
    card.nombre,
    card.esOficial ? 'Recomendada por REPP' : card.esMia ? 'Creada por ti' : `de ${author}`,
    cardSubtitle(card),
    card.objetivo ? GOAL_LABEL[card.objetivo] : null,
    showsCommunity ? ratingLabel(card.valoracion) : null,
    showsCommunity ? downloadsLabel(card.copias) : null,
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
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e2,
        overflow: 'hidden',
      }}
      testID={`routine-card-${card.id}`}
    >
      {/* Portada con el título encima (decisión del 2026-10-11): el nombre se
          lee sobre la foto con el velo fuerte, como en Apple Fitness; debajo
          solo queda quién la hizo y sus cifras. */}
      <RoutineCover goal={card.objetivo} style={{ height: COVER_HEIGHT }} uri={card.portadaUrl}>
        <View
          style={{
            position: 'absolute',
            top: spacing.md,
            left: spacing.md,
            right: spacing.md,
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          {card.objetivo ? <MediaChip label={GOAL_LABEL[card.objetivo]} /> : <View />}
          <MediaChip
            icon="calendar-outline"
            label={[`${card.diasPorSemana} días/sem`, card.duracionSemanas ? `${card.duracionSemanas} sem` : null]
              .filter(Boolean)
              .join(' · ')}
          />
        </View>
        <Text
          numberOfLines={2}
          style={{
            position: 'absolute',
            left: cardPadding,
            right: cardPadding,
            bottom: spacing.md,
            color: ink.white,
          }}
          variant="title"
        >
          {card.nombre}
        </Text>
      </RoutineCover>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.smd,
          paddingHorizontal: cardPadding,
          paddingVertical: spacing.md,
        }}
      >
        <PersonAvatar
          id={card.autor.id}
          name={card.autor.nombre}
          official={card.esOficial}
          photoUrl={card.autor.fotoUrl}
          size={AVATAR}
        />
        <Text numberOfLines={1} style={{ flex: 1 }} tone="secondary" variant="subhead">
          {card.esOficial ? 'REPP · Oficial' : card.esMia ? 'Creada por ti' : author}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {showsCommunity ? (
            <>
              <Stat
                color={rating ? ratingStar : undefined}
                icon={rating ? 'star' : 'star-outline'}
                value={rating ? rating : 'Nueva'}
              />
              <Stat icon="arrow-down-circle-outline" value={compactCount(card.copias)} />
            </>
          ) : (
            <Stat
              icon={card.visibilidad === 'PUBLIC' ? 'globe-outline' : 'lock-closed-outline'}
              value={card.visibilidad === 'PUBLIC' ? 'Pública' : 'Privada'}
            />
          )}
        </View>
      </View>
    </PressableScale>
  );
}

/** Esqueleto con la forma de la tarjeta: portada, título, autor y cifras. */
export function RoutineCardSkeleton() {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        overflow: 'hidden',
      }}
    >
      <Skeleton height={COVER_HEIGHT} radius={0} />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.smd,
          paddingHorizontal: cardPadding,
          paddingVertical: spacing.md,
        }}
      >
        <Skeleton height={AVATAR} radius={radii.full} width={AVATAR} />
        <Skeleton height={14} radius={radii.xs} width="35%" />
        <View style={{ flex: 1 }} />
        <Skeleton height={14} radius={radii.xs} width="25%" />
      </View>
    </View>
  );
}
