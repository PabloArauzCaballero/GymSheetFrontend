import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'expo-router';
import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { authorLabel, cardSubtitle, downloadsLabel, ratingLabel, ratingValue } from '@gymsheet/hooks';
import type { RoutineCard } from '@gymsheet/types';
import { routineService } from '@/api/services';
import { Skeleton } from '@/components/feedback';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { GOAL_LABEL } from '@/lib/format';
import { RoutineCover } from '@/features/routine-catalog/routine-cover';
import { MediaChip } from '@/features/routine-catalog/media-chip';
import { cardPadding, colors, fontSizes, iconSizes, onMedia, radii, ratingStar, shadows, spacing } from '@/theme';

const AVATAR = 28;
/** 3:2, la proporción de las láminas (850×567): a 3× en un iPhone ancho apenas se amplían. */
const COVER_RATIO = 1.5;
/**
 * Nombre de portada: más grande que un título de tarjeta, con el tracking
 * cerrado de la display. El color es el del tono por defecto de `Text`.
 */
const TITLE = {
  fontSize: fontSizes.xl,
  lineHeight: Math.round(fontSizes.xl * 1.1),
  letterSpacing: fontSizes.xl * -0.02,
} as const;

/** «3 días · 8 semanas»: lo que dura, en una línea sobre la portada. */
export function planLine(card: Pick<RoutineCard, 'diasPorSemana' | 'duracionSemanas'>): string {
  return [
    `${card.diasPorSemana} ${card.diasPorSemana === 1 ? 'día' : 'días'} por semana`,
    card.duracionSemanas ? `${card.duracionSemanas} semanas` : null,
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
 * Prueba social de una rutina en UNA fila callada: la nota (si la hay) y lo
 * que la gente ha hecho con ella. Solo datos reales del DTO; sin reseñas ni
 * descargas, «Nueva». La comparten la tarjeta y la portada del detalle.
 */
export function SocialProof({
  valoracion,
  copias,
  overMedia = false,
}: {
  valoracion: RoutineCard['valoracion'];
  copias: number;
  /** Encima de una foto con velo: texto blanco en vez de los tonos de superficie. */
  overMedia?: boolean;
}) {
  const rating = ratingValue(valoracion);
  const strong = overMedia ? { color: onMedia.text } : undefined;
  const quiet = overMedia ? { color: onMedia.textMuted } : undefined;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
      {rating ? (
        <>
          <Ionicons color={ratingStar} name="star" size={iconSizes.xs} />
          <Text strong style={strong} tabular variant="footnote">
            {rating}
          </Text>
        </>
      ) : null}
      {copias > 0 ? (
        <Text numberOfLines={1} style={quiet} tabular tone="muted" variant="footnote">
          {rating ? `· ${downloadsLabel(copias)}` : downloadsLabel(copias)}
        </Text>
      ) : null}
      {!rating && copias === 0 ? (
        <Text style={quiet} tone="muted" variant="footnote">
          Nueva
        </Text>
      ) : null}
    </View>
  );
}

/**
 * Tarjeta del catálogo (cuarta pasada, 2026-10-18 · #98 template marketing):
 * la rutina compartida es la plantilla y se vende como una portada. La foto a
 * 3:2 (la proporción real de las láminas, así no se amplían) con el objetivo
 * arriba y el nombre en grande abajo, fundida con la tarjeta; debajo, una sola
 * fila callada de prueba social: quién la hizo, la nota y las descargas. Sin
 * chips repetidos: los días van en la línea bajo el título y el sello de REPP
 * es el propio avatar oficial con «Equipo REPP».
 *
 * Al tocarla, la portada CRECE hasta ser la del detalle (transición de zoom de
 * iOS 18, interrumpible y con gesto de vuelta); en el resto es el empuje normal.
 */
export function RoutineCardView({ card }: { card: RoutineCard }) {
  const author = authorLabel(card);
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
        borderWidth: 1,
        borderColor: colors.borderSubtle,
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
          <RoutineCover goal={card.objetivo} scrim="card" style={{ aspectRatio: COVER_RATIO }} uri={card.portadaUrl}>
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
                bottom: spacing.sm,
                gap: spacing.xs,
              }}
            >
              <Text numberOfLines={2} style={TITLE} variant="title">
                {card.nombre}
              </Text>
              <Text numberOfLines={1} tabular tone="secondary" variant="subhead">
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
          gap: spacing.sm,
          minHeight: 44,
          paddingHorizontal: cardPadding,
          paddingTop: spacing.xs,
          paddingBottom: spacing.md,
        }}
      >
        <PersonAvatar
          id={card.autor.id}
          name={card.autor.nombre}
          official={card.esOficial}
          photoUrl={card.autor.fotoUrl}
          size={AVATAR}
        />
        <Text numberOfLines={1} strong style={{ flex: 1 }} tone="secondary" variant="subhead">
          {who}
        </Text>
        {showsCommunity ? (
          <SocialProof copias={card.copias} valoracion={card.valoracion} />
        ) : (
          <Text numberOfLines={1} tone="muted" variant="footnote">
            {card.visibilidad === 'PUBLIC' ? 'Pública' : 'Solo tú la ves'}
          </Text>
        )}
      </View>
    </RoutineLink>
  );
}

/** Esqueleto con la forma de la tarjeta: portada y la fila de autor y nota. */
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
      <View style={{ aspectRatio: COVER_RATIO }}>
        <Skeleton height="100%" radius={0} />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingHorizontal: cardPadding,
          paddingVertical: spacing.md,
        }}
      >
        <Skeleton height={AVATAR} radius={radii.full} width={AVATAR} />
        <View style={{ flex: 1 }}>
          <Skeleton height={14} radius={radii.xs} width="45%" />
        </View>
        <Skeleton height={14} radius={radii.xs} width={72} />
      </View>
    </View>
  );
}
