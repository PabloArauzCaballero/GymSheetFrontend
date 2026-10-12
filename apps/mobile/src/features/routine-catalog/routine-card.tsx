import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { authorLabel, cardSubtitle, compactCount, downloadsLabel, ratingLabel, ratingValue } from '@gymsheet/hooks';
import type { RoutineCard } from '@gymsheet/types';
import { routineService } from '@/api/services';
import { Skeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { GOAL_LABEL } from '@/lib/format';
import { RoutineCover } from '@/features/routine-catalog/routine-cover';
import { MediaChip } from '@/features/routine-catalog/media-chip';
import { alpha, cardPadding, colors, coverAspect, iconSizes, ink, radii, ratingStar, shadows, spacing } from '@/theme';

const AVATAR = 36;

/** «3 días · 8 semanas»: lo que dura, en una línea sobre la portada. */
export function planLine(card: Pick<RoutineCard, 'diasPorSemana' | 'duracionSemanas'>): string {
  return [
    `${card.diasPorSemana} ${card.diasPorSemana === 1 ? 'día' : 'días'} por semana`,
    card.duracionSemanas ? `${card.duracionSemanas} semanas` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Lo que la comunidad ha hecho con ella: «12 descargas · 4 reseñas». */
function socialLine(card: RoutineCard): string {
  const reviews = card.valoracion.total;
  return [
    card.copias > 0 ? downloadsLabel(card.copias) : 'Estrénala tú',
    reviews > 0 ? `${compactCount(reviews)} ${reviews === 1 ? 'reseña' : 'reseñas'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Enlace al detalle de una rutina con la precarga al contacto. Dentro, quien
 * lo usa envuelve su portada en `Link.AppleZoom` para que crezca hasta el
 * detalle. Lo comparten la tarjeta del catálogo y las de «Para ti».
 */
export function RoutineLink({
  id,
  label,
  scaleTo = 0.975,
  style,
  testID,
  children,
}: {
  id: string;
  label: string;
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  return (
    <Link asChild href={{ pathname: '/routines/[id]', params: { id } }}>
      <PressableScale
        accessibilityHint="Abre la rutina"
        accessibilityLabel={label}
        haptic="selection"
        // Al contacto ya se pide la rutina: cuando la portada termina de crecer, el resto suele estar.
        onTouchStart={() =>
          void queryClient.prefetchQuery({
            queryKey: ['routine', id],
            queryFn: () => routineService.get(id),
            staleTime: 30_000,
          })
        }
        scaleTo={scaleTo}
        style={style}
        testID={testID}
      >
        {children}
      </PressableScale>
    </Link>
  );
}

/**
 * Tarjeta del catálogo (tercera pasada, 2026-10-12). Una foto, un nombre y una
 * persona: la portada a 3:2 (la proporción real de las láminas, así no se
 * amplían), con un único chip —el objetivo— y el nombre sobre el velo; debajo,
 * quién la hizo con su cara en grande y qué ha hecho la gente con ella, y a la
 * derecha la nota. Nada más: los días y las semanas van en una línea sobre la
 * foto, no en otro chip.
 *
 * Al tocarla, la portada CRECE hasta ser la del detalle (transición de zoom de
 * iOS 18, interrumpible y con gesto de vuelta); en el resto es el empuje normal.
 */
export function RoutineCardView({ card }: { card: RoutineCard }) {
  const author = authorLabel(card);
  const rating = ratingValue(card.valoracion);
  const showsCommunity = card.visibilidad === 'PUBLIC' || card.esOficial;
  const who = card.esOficial ? 'Equipo REPP' : card.esMia ? 'Tú' : author;
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
    <RoutineLink
      id={card.id}
      label={label}
      style={{
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.card,
      }}
      testID={`routine-card-${card.id}`}
    >
        <Link.AppleZoom>
          <View
            style={{
              borderTopLeftRadius: radii.xxl,
              borderTopRightRadius: radii.xxl,
              borderCurve: 'continuous',
              overflow: 'hidden',
            }}
          >
            <RoutineCover goal={card.objetivo} style={{ aspectRatio: coverAspect }} uri={card.portadaUrl}>
              {card.objetivo ? (
                <View style={{ position: 'absolute', top: spacing.md, left: spacing.md }}>
                  <MediaChip label={GOAL_LABEL[card.objetivo]} />
                </View>
              ) : null}
              <View
                style={{
                  position: 'absolute',
                  left: cardPadding,
                  right: cardPadding,
                  bottom: spacing.md,
                  gap: spacing.xs,
                }}
              >
                <Text numberOfLines={2} style={{ color: ink.white }} variant="title">
                  {card.nombre}
                </Text>
                <Text numberOfLines={1} style={{ color: alpha(ink.white, 0.82) }} tabular variant="footnote">
                  {planLine(card)}
                </Text>
              </View>
            </RoutineCover>
          </View>
        </Link.AppleZoom>

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
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text numberOfLines={1} strong variant="subhead">
              {who}
            </Text>
            <Text numberOfLines={1} tabular tone="muted" variant="footnote">
              {showsCommunity ? socialLine(card) : card.visibilidad === 'PUBLIC' ? 'Pública' : 'Solo tú la ves'}
            </Text>
          </View>
          {showsCommunity ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Ionicons color={rating ? ratingStar : colors.textMuted} name={rating ? 'star' : 'star-outline'} size={iconSizes.sm} />
              <Text strong tabular tone={rating ? 'default' : 'muted'} variant="subhead">
                {rating ?? 'Nueva'}
              </Text>
            </View>
          ) : (
            <Ionicons
              color={colors.textMuted}
              name={card.visibilidad === 'PUBLIC' ? 'globe-outline' : 'lock-closed-outline'}
              size={iconSizes.sm}
            />
          )}
        </View>
    </RoutineLink>
  );
}

/** Esqueleto con la forma de la tarjeta: portada, autor y nota. */
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
      <View style={{ aspectRatio: coverAspect }}>
        <Skeleton height="100%" radius={0} />
      </View>
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
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Skeleton height={14} radius={radii.xs} width="45%" />
          <Skeleton height={12} radius={radii.xs} width="60%" />
        </View>
        <Skeleton height={14} radius={radii.xs} width={40} />
      </View>
    </View>
  );
}
