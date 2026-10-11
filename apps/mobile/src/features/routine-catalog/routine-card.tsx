import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { authorLabel, cardSubtitle, downloadsLabel, ratingLabel, ratingValue } from '@gymsheet/hooks';
import type { RoutineCard } from '@gymsheet/types';
import { Skeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { GOAL_LABEL } from '@/lib/format';
import { RoutineCover } from '@/features/routine-catalog/routine-cover';
import { MediaChip } from '@/features/routine-catalog/media-chip';
import { colors, iconSizes, radii, ratingStar, shadows, spacing } from '@/theme';

const COVER_HEIGHT = 156;

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
 * Tarjeta del catálogo (rediseño 2026-10-11): portada con la imagen de un
 * ejercicio, objetivo y días encima en vidrio; debajo el nombre, quién la hizo
 * (foto o iniciales) y tres cifras que se entienden sin leer: estrellas,
 * descargas y semanas. Es un solo elemento accesible que lo lee de corrido.
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
      <RoutineCover goal={card.objetivo} scrim="soft" style={{ height: COVER_HEIGHT }} uri={card.portadaUrl}>
        <View
          style={{
            position: 'absolute',
            top: spacing.smd,
            left: spacing.smd,
            right: spacing.smd,
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          {card.objetivo ? <MediaChip label={GOAL_LABEL[card.objetivo]} /> : <View />}
          <MediaChip icon="calendar-outline" label={`${card.diasPorSemana} días/sem`} />
        </View>
      </RoutineCover>

      <View
        style={{
          padding: spacing.md,
          paddingTop: spacing.smd,
          gap: spacing.smd,
        }}
      >
        <Text numberOfLines={2} variant="title">
          {card.nombre}
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <PersonAvatar
            id={card.autor.id}
            name={card.autor.nombre}
            official={card.esOficial}
            photoUrl={card.autor.fotoUrl}
            size={24}
          />
          <Text numberOfLines={1} style={{ flex: 1 }} tone="secondary" variant="subhead">
            {card.esOficial ? 'REPP · Oficial' : card.esMia ? 'Creada por ti' : author}
          </Text>
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
          }}
        >
          {showsCommunity ? (
            <>
              <Stat
                color={rating ? ratingStar : undefined}
                icon={rating ? 'star' : 'star-outline'}
                value={rating ? `${rating} (${card.valoracion.total})` : 'Nueva'}
              />
              <Stat icon="arrow-down-circle-outline" value={downloadsLabel(card.copias)} />
            </>
          ) : (
            <Stat
              icon={card.visibilidad === 'PUBLIC' ? 'globe-outline' : 'lock-closed-outline'}
              value={card.visibilidad === 'PUBLIC' ? 'Pública' : 'Privada'}
            />
          )}
          {card.duracionSemanas ? <Stat icon="layers-outline" value={`${card.duracionSemanas} semanas`} /> : null}
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
      <View style={{ padding: spacing.md, gap: spacing.smd }}>
        <Skeleton height={20} radius={radii.xs} width="70%" />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Skeleton height={24} radius={radii.full} width={24} />
          <Skeleton height={14} radius={radii.xs} width="35%" />
        </View>
        <Skeleton height={14} radius={radii.xs} width="55%" />
      </View>
    </View>
  );
}
