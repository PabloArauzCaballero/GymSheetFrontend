import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Badge, Card, Divider, Row, ScrollScreen, ScreenHeader, Section } from '@/components/layout';
import { ErrorState, Skeleton } from '@/components/feedback';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { BackLink } from '@/components/nav';
import { exerciseService } from '@/api/services';
import { colors, fontSizes, radii, spacing } from '@/theme';

/**
 * Instruction steps arrive keyed by locale. `es-BO` first — the same order the
 * web app uses, so both clients show the identical copy.
 */
function stepsOf(steps: Record<string, string[]>): string[] {
  return steps['es-BO'] ?? steps['es'] ?? steps['en'] ?? Object.values(steps)[0] ?? [];
}

/** Long copy starts folded: a wall of text is the fastest way to lose a reader. */
function Description({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card>
      <Text
        numberOfLines={expanded ? undefined : 4}
        style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 22 }}
      >
        {text}
      </Text>
      <Pressable
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={() => setExpanded((value) => !value)}
      >
        <Text style={{ color: colors.volt, fontSize: fontSizes.sm, fontWeight: '600' }}>
          {expanded ? 'Ver menos' : 'Leer más'}
        </Text>
      </Pressable>
    </Card>
  );
}

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const exercise = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseService.get(id),
    enabled: Boolean(id),
  });

  const group = exercise.data?.grupoMuscular;
  // Same muscle group, minus this exercise: the natural "what else trains
  // this?" question, answered without leaving the screen.
  const similar = useQuery({
    queryKey: ['exercises', 'similar', group],
    queryFn: () => exerciseService.list({ grupoMuscular: group, pageSize: 12 }),
    enabled: Boolean(group),
  });

  if (exercise.isPending) {
    return (
      <ScrollScreen>
        <BackLink />
        <Skeleton height={200} />
        <Skeleton height={120} />
      </ScrollScreen>
    );
  }

  if (exercise.isError) {
    return (
      <ScrollScreen>
        <BackLink />
        <ErrorState error={exercise.error} onRetry={() => void exercise.refetch()} />
      </ScrollScreen>
    );
  }

  const data = exercise.data;
  const steps = stepsOf(data.instructionSteps);
  const others = (similar.data?.items ?? []).filter((item) => item.id !== data.id).slice(0, 10);

  return (
    <ScrollScreen onRefresh={() => void exercise.refetch()} refreshing={exercise.isFetching}>
      <BackLink />

      <ExerciseImage exercise={data} size="hero" />

      <ScreenHeader subtitle={data.grupoMuscular} title={data.nombre} />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {data.requiredEquipment ? <Badge label={data.requiredEquipment} /> : null}
        {data.bodyPart ? <Badge label={data.bodyPart} tone="success" /> : null}
        {data.tipoEjercicio === 'PERSONAL' ? <Badge label="Personal" tone="warning" /> : null}
      </View>

      {/* Facts as rows, not prose: scannable in a second between sets. */}
      <Section index={0} title="Objetivo técnico">
        <Card>
          <Row label="Músculo objetivo" value={data.targetMuscle ?? '—'} />
          <Divider />
          <Row label="Parte corporal" value={data.bodyPart ?? '—'} />
          <Divider />
          <Row label="Sinergista" value={data.synergistMuscleGroup ?? '—'} />
          {data.secondaryMuscles.length > 0 ? (
            <>
              <Divider />
              <Row label="Secundarios" value={data.secondaryMuscles.join(', ')} />
            </>
          ) : null}
        </Card>
      </Section>

      {data.descripcion ? (
        <Section index={1} title="Descripción">
          <Description text={data.descripcion} />
        </Section>
      ) : null}

      {steps.length > 0 ? (
        <Section index={2} title="Secuencia">
          <Card>
            {steps.map((step, index) => (
              <View
                key={`${index}-${step}`}
                style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: radii.sm,
                    backgroundColor: colors.surfaceHigh,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    style={{
                      color: colors.volt,
                      fontSize: fontSizes.xs,
                      fontWeight: '700',
                      fontVariant: ['tabular-nums'],
                    }}
                  >
                    {index + 1}
                  </Text>
                </View>
                <Text
                  style={{ color: colors.text, fontSize: fontSizes.sm, lineHeight: 22, flex: 1 }}
                >
                  {step}
                </Text>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {data.equipment.length > 0 ? (
        <Section index={3} title="Equipamiento">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {data.equipment.map((item) => (
              <Badge key={item.id} label={item.nombre} />
            ))}
          </View>
        </Section>
      ) : null}

      {others.length > 0 ? (
        <Section index={4} title="Ejercicios similares">
          {/* Horizontal rail: browsing alternatives should not push the page down. */}
          <ScrollView
            horizontal
            contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
            showsHorizontalScrollIndicator={false}
          >
            {others.map((item) => (
              <PressableScale
                accessibilityLabel={item.nombre}
                key={item.id}
                onPress={() => router.push({ pathname: '/exercises/[id]', params: { id: item.id } })}
                style={{ width: 132, gap: spacing.xs }}
              >
                <ExerciseImage exercise={item} size={132} />
                <Text
                  numberOfLines={2}
                  style={{ color: colors.text, fontSize: fontSizes.xs, fontWeight: '600' }}
                >
                  {item.nombre}
                </Text>
              </PressableScale>
            ))}
          </ScrollView>
        </Section>
      ) : null}
    </ScrollScreen>
  );
}
