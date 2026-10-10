import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { durationLabel, ratingLabel, recommendationReason } from '@gymsheet/hooks';
import type { RoutineRecommendation } from '@gymsheet/types';
import { Skeleton } from '@/components/feedback';
import { FactChips, type Fact } from '@/components/fact-chips';
import { Card, Divider } from '@/components/layout';
import { NavRow } from '@/components/list';
import { Text } from '@/components/text';
import { Button } from '@/components/ui';
import { accentPolicy, cardGap, colors, iconSizes, radii, shadows, spacing } from '@/theme';
import type { ForYouState } from '@/features/routine-catalog/use-recommended-routines';

function heroFacts(item: RoutineRecommendation): Fact[] {
  const card = item.rutina;
  const facts: (Fact | null)[] = [
    { key: 'dias', icon: 'calendar-outline', label: card.diasPorSemana === 1 ? '1 día/sem' : `${card.diasPorSemana} días/sem` },
    { key: 'semanas', icon: 'time-outline', label: durationLabel(card.duracionSemanas) },
  ];
  return facts.filter((fact): fact is Fact => fact !== null);
}

/**
 * La recomendación principal: el motivo arriba («Porque elegiste…»), el nombre
 * en la display, sus hechos y la única acción en acento de la pantalla.
 */
function HeroCard({ item, onOpen }: { item: RoutineRecommendation; onOpen: () => void }) {
  const card = item.rutina;
  const reason = recommendationReason(item);
  const rating = ratingLabel(card.valoracion);
  return (
    <View
      accessibilityLabel={`Recomendada para ti. ${card.nombre}. ${reason}`}
      style={{
        gap: cardGap,
        padding: spacing.mdl,
        borderRadius: radii.xxl,
        borderCurve: 'continuous',
        backgroundColor: colors.surfaceRaised,
        boxShadow: shadows.e2,
      }}
      testID="for-you-hero"
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <Ionicons
          accessibilityElementsHidden
          color={accentPolicy.glyph}
          importantForAccessibility="no-hide-descendants"
          name="sparkles-outline"
          size={iconSizes.sm}
          style={{ marginTop: spacing.xxs }}
        />
        <Text style={{ flex: 1 }} tone="secondary" variant="subhead">
          {reason}
        </Text>
      </View>
      <Text numberOfLines={2} variant="title">
        {card.nombre}
      </Text>
      <FactChips facts={heroFacts(item)} />
      <Text tabular tone="muted" variant="footnote">
        {card.esOficial ? `De REPP · ${rating}` : `De ${card.autor.nombre} · ${rating}`}
      </Text>
      <Button label="Ver rutina" onPress={onOpen} testID="for-you-open" />
    </View>
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
        <Skeleton height={232} />
        <Skeleton height={128} />
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
    <View style={{ gap: spacing.smd }} testID="for-you">
      <Text accessibilityRole="header" variant="title">
        Para ti
      </Text>
      <HeroCard item={hero} onOpen={() => onOpen(hero.rutina.id)} />
      {alternatives.length > 0 ? (
        <Card list>
          {alternatives.map((item, index) => (
            <View key={item.rutina.id}>
              {index > 0 ? <Divider /> : null}
              <NavRow
                onPress={() => onOpen(item.rutina.id)}
                subtitle={recommendationReason(item)}
                testID={`for-you-alt-${item.rutina.id}`}
                title={item.rutina.nombre}
              />
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
