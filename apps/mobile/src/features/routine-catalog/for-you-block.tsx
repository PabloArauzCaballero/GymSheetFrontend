import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { downloadsLabel, durationLabel, ratingLabel, ratingValue, recommendationReason } from '@gymsheet/hooks';
import type { RoutineRecommendation } from '@gymsheet/types';
import { Card } from '@/components/layout';
import { NavRow } from '@/components/list';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import {
  accentPolicy,
  alpha,
  cardPadding,
  colors,
  coverAspect,
  gutter,
  iconSizes,
  ink,
  radii,
  ratingStar,
  shadows,
  spacing,
} from '@/theme';
import { MediaChip } from '@/features/routine-catalog/media-chip';
import { planLine, RoutineCardSkeleton, RoutineLink } from '@/features/routine-catalog/routine-card';
import { RoutineCover } from '@/features/routine-catalog/routine-cover';
import type { ForYouState } from '@/features/routine-catalog/use-recommended-routines';

const ALT_WIDTH = 248;
const AVATAR = 36;

/**
 * La recomendación principal: la misma tarjeta del catálogo (portada a 3:2 que
 * crece hasta el detalle) con el sello «Para ti» y, debajo, POR QUÉ se
 * recomienda: es lo único que esta tarjeta sabe y las demás no. Toda la
 * tarjeta abre la rutina; ya no lleva un botón aparte dentro.
 */
function HeroCard({ item }: { item: RoutineRecommendation }) {
  const card = item.rutina;
  const reason = recommendationReason(item);
  const rating = ratingValue(card.valoracion);
  return (
    <RoutineLink
      id={card.id}
      label={`Recomendada para ti. ${card.nombre}. ${reason}. ${ratingLabel(card.valoracion)}. ${downloadsLabel(card.copias)}`}
      style={{
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.card,
      }}
      testID="for-you-hero"
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
            <View style={{ position: 'absolute', top: spacing.md, left: spacing.md }}>
              <MediaChip icon="sparkles" label="Para ti" />
            </View>
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
      <View style={{ paddingHorizontal: cardPadding, paddingVertical: spacing.md, gap: spacing.smd }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <Ionicons color={accentPolicy.glyph} name="sparkles" size={iconSizes.sm} style={{ marginTop: 2 }} />
          <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
            {reason}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.smd }}>
          <PersonAvatar
            id={card.autor.id}
            name={card.autor.nombre}
            official={card.esOficial}
            photoUrl={card.autor.fotoUrl}
            size={AVATAR}
          />
          <View style={{ flex: 1, gap: spacing.xxs }}>
            <Text numberOfLines={1} strong variant="subhead">
              {card.esOficial ? 'Equipo REPP' : card.autor.nombre}
            </Text>
            <Text numberOfLines={1} tabular tone="muted" variant="footnote">
              {card.copias > 0 ? downloadsLabel(card.copias) : 'Estrénala tú'}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Ionicons color={rating ? ratingStar : colors.textMuted} name={rating ? 'star' : 'star-outline'} size={iconSizes.sm} />
            <Text strong tabular tone={rating ? 'default' : 'muted'} variant="subhead">
              {rating ?? 'Nueva'}
            </Text>
          </View>
        </View>
      </View>
    </RoutineLink>
  );
}

/** Alternativa en el carrusel: la misma tarjeta en pequeño, con el motivo en una línea. */
function AltCard({ item }: { item: RoutineRecommendation }) {
  const card = item.rutina;
  const rating = ratingValue(card.valoracion);
  return (
    <RoutineLink
      id={card.id}
      label={`${card.nombre}. ${recommendationReason(item)}`}
      style={{
        width: ALT_WIDTH,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e2,
      }}
      testID={`for-you-alt-${card.id}`}
    >
      <Link.AppleZoom>
        <View
          style={{
            borderTopLeftRadius: radii.xl,
            borderTopRightRadius: radii.xl,
            borderCurve: 'continuous',
            overflow: 'hidden',
          }}
        >
          <RoutineCover goal={card.objetivo} scrim="soft" style={{ aspectRatio: coverAspect }} uri={card.portadaUrl} />
        </View>
      </Link.AppleZoom>
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.smd, gap: spacing.xxs }}>
        <Text numberOfLines={1} variant="headline">
          {card.nombre}
        </Text>
        <Text numberOfLines={1} tabular tone="muted" variant="footnote">
          {[rating ? `★ ${rating}` : null, `${card.diasPorSemana} días/sem`, durationLabel(card.duracionSemanas)]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>
    </RoutineLink>
  );
}

/**
 * «Para ti» (C7, C8.3.4): tarjeta héroe y dos alternativas, encima de las
 * pestañas. Cada estado de la petición tiene su forma y ninguno rompe el
 * catálogo de debajo.
 */
export function ForYouBlock({ state }: { state: ForYouState }) {
  const router = useRouter();

  if (state.kind === 'hidden') return null;

  if (state.kind === 'loading') {
    return (
      <View accessibilityLabel="Cargando rutinas para ti" style={{ gap: spacing.smd }}>
        <Text accessibilityRole="header" variant="title">
          Para ti
        </Text>
        <RoutineCardSkeleton />
      </View>
    );
  }

  if (state.kind === 'error') {
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.smd,
          paddingVertical: spacing.xs,
        }}
        testID="for-you-error"
      >
        <Ionicons color={colors.textMuted} name="cloud-offline-outline" size={iconSizes.md} />
        <Text style={{ flex: 1 }} tone="muted" variant="subhead">
          No pudimos cargar tus recomendaciones.
        </Text>
        <Button label="Reintentar" onPress={state.retry} size="sm" variant="ghost" />
      </View>
    );
  }

  if (state.kind === 'empty') {
    return (
      <Card list>
        <NavRow
          leading={<Ionicons color={accentPolicy.glyph} name="sparkles-outline" size={iconSizes.lg} />}
          onPress={() => router.push('/onboarding')}
          subtitle="Cuéntanos tu objetivo y tus días"
          testID="for-you-onboarding"
          title="Rutinas para ti"
        />
      </Card>
    );
  }

  const { hero, alternatives } = state.block;
  return (
    <View style={{ gap: spacing.md }} testID="for-you">
      <Text accessibilityRole="header" variant="title">
        Para ti
      </Text>
      <HeroCard item={hero} />
      {alternatives.length > 0 ? (
        <ScrollView
          // A sangre, como los chips de objetivo: el carrusel llega al borde y
          // la última tarjeta no se corta contra el margen.
          contentContainerStyle={{ gap: spacing.smd, paddingHorizontal: gutter, paddingTop: spacing.xs, paddingBottom: spacing.lg }}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter, marginBottom: -spacing.lg, overflow: 'visible' }}
        >
          {alternatives.map((item) => (
            <AltCard item={item} key={item.rutina.id} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
