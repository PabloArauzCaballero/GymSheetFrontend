import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import {
  compactCount,
  downloadsLabel,
  durationLabel,
  ratingLabel,
  ratingValue,
  recommendationReason,
} from '@gymsheet/hooks';
import type { RoutineRecommendation } from '@gymsheet/types';
import { Skeleton } from '@/components/feedback';
import { Card } from '@/components/layout';
import { NavRow } from '@/components/list';
import { PressableScale } from '@/components/motion';
import { PersonAvatar } from '@/components/person-avatar';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { accentPolicy, colors, gutter, iconSizes, ink, radii, ratingStar, shadows, spacing } from '@/theme';
import { MediaChip } from '@/features/routine-catalog/media-chip';
import { RoutineCover } from '@/features/routine-catalog/routine-cover';
import type { ForYouState } from '@/features/routine-catalog/use-recommended-routines';

const HERO_COVER = 208;
const ALT_WIDTH = 248;
const ALT_COVER = 128;

/** «★ 4,6 · ⬇ 12 · 4 días/sem»: las mismas cifras que la tarjeta del catálogo. */
function Numbers({ item }: { item: RoutineRecommendation }) {
  const card = item.rutina;
  const rating = ratingValue(card.valoracion);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons
          color={rating ? ratingStar : colors.textMuted}
          name={rating ? 'star' : 'star-outline'}
          size={iconSizes.sm}
        />
        <Text tabular tone="secondary" variant="subhead">
          {rating ?? 'Nueva'}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Ionicons color={colors.textMuted} name="arrow-down-circle-outline" size={iconSizes.sm} />
        <Text tabular tone="secondary" variant="subhead">
          {compactCount(card.copias)}
        </Text>
      </View>
      <Text tabular tone="secondary" variant="subhead">
        {`${card.diasPorSemana} días/sem · ${durationLabel(card.duracionSemanas)}`}
      </Text>
    </View>
  );
}

/**
 * La recomendación principal: portada grande con el motivo y el nombre encima,
 * quién la hizo, sus cifras y la única acción en acento de la pantalla.
 */
function HeroCard({ item, onOpen }: { item: RoutineRecommendation; onOpen: () => void }) {
  const card = item.rutina;
  const reason = recommendationReason(item);
  return (
    <View
      accessibilityLabel={`Recomendada para ti. ${card.nombre}. ${reason}. ${ratingLabel(card.valoracion)}. ${downloadsLabel(card.copias)}`}
      style={{
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceRaised,
        boxShadow: shadows.e2,
        overflow: 'hidden',
      }}
      testID="for-you-hero"
    >
      <RoutineCover goal={card.objetivo} style={{ height: HERO_COVER }} uri={card.portadaUrl}>
        <View style={{ position: 'absolute', top: spacing.md, left: spacing.md }}>
          <MediaChip icon="sparkles" label="Para ti" />
        </View>
        <View
          style={{
            position: 'absolute',
            left: spacing.mdl,
            right: spacing.mdl,
            bottom: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Text numberOfLines={2} style={{ color: ink.white }} variant="title">
            {card.nombre}
          </Text>
        </View>
      </RoutineCover>
      <View
        style={{
          padding: spacing.mdl,
          paddingTop: spacing.md,
          gap: spacing.md,
        }}
      >
        <Text tone="secondary" variant="subhead">
          {reason}
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
          <Text numberOfLines={1} style={{ flex: 1 }} tone="muted" variant="subhead">
            {card.esOficial ? 'REPP · Oficial' : card.autor.nombre}
          </Text>
        </View>
        <Numbers item={item} />
        <Button label="Ver rutina" onPress={onOpen} testID="for-you-open" />
      </View>
    </View>
  );
}

/** Alternativa en el carrusel: portada corta, nombre y el motivo en una línea. */
function AltCard({ item, onOpen }: { item: RoutineRecommendation; onOpen: () => void }) {
  const card = item.rutina;
  const rating = ratingValue(card.valoracion);
  return (
    <PressableScale
      accessibilityLabel={`${card.nombre}. ${recommendationReason(item)}`}
      haptic="selection"
      onPress={onOpen}
      scaleTo={0.98}
      style={{
        width: ALT_WIDTH,
        borderRadius: radii.xl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceLow,
        boxShadow: shadows.e1,
        overflow: 'hidden',
      }}
      testID={`for-you-alt-${card.id}`}
    >
      <RoutineCover goal={card.objetivo} scrim="soft" style={{ height: ALT_COVER }} uri={card.portadaUrl} />
      <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.smd + spacing.xxs, gap: spacing.xs }}>
        <Text numberOfLines={1} variant="headline">
          {card.nombre}
        </Text>
        <Text numberOfLines={1} tone="muted" variant="footnote">
          {`${rating ? `★ ${rating} · ` : ''}${card.diasPorSemana} días/sem`}
        </Text>
      </View>
    </PressableScale>
  );
}

/**
 * «Para ti» (C7, C8.3.4): tarjeta héroe y dos alternativas, encima de las
 * pestañas. Cada estado de la petición tiene su forma y ninguno rompe el
 * catálogo de debajo.
 */
export function ForYouBlock({ state, onOpen }: { state: ForYouState; onOpen: (id: string) => void }) {
  const router = useRouter();

  if (state.kind === 'hidden') return null;

  if (state.kind === 'loading') {
    return (
      <View accessibilityLabel="Cargando rutinas para ti" style={{ gap: spacing.smd }}>
        <Text accessibilityRole="header" variant="title">
          Para ti
        </Text>
        <Skeleton height={420} radius={radii.xxl} />
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
      <HeroCard item={hero} onOpen={() => onOpen(hero.rutina.id)} />
      {alternatives.length > 0 ? (
        <ScrollView
          // A sangre, como los chips de objetivo: el carrusel llega al borde y
          // la última tarjeta no se corta contra el margen.
          contentContainerStyle={{ gap: spacing.smd, paddingHorizontal: gutter, paddingBottom: spacing.xs }}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -gutter, overflow: 'visible' }}
        >
          {alternatives.map((item) => (
            <AltCard item={item} key={item.rutina.id} onOpen={() => onOpen(item.rutina.id)} />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
