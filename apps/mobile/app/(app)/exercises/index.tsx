import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Exercise } from '@gymsheet/types';
import { Card, Divider, ScrollScreen, ScreenHeader } from '@/components/layout';
import { EmptyState, ErrorState, Skeleton } from '@/components/feedback';
import { ExerciseImage } from '@/components/media';
import { PressableScale } from '@/components/motion';
import { Input } from '@/components/ui';
import { DrillBack, Grid, GridTile, iconFor, titleCase } from '@/components/catalogue-grid';
import { exerciseService } from '@/api/services';
import { colors, fontSizes, iconSizes, minTouchTarget, radii, spacing } from '@/theme';

/** A single fact about an exercise, sized to sit two or three to a row. */
function Tag({ label, accent = false }: { label: string; accent?: boolean }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radii.full,
        borderWidth: 1,
        borderColor: accent ? colors.accentInk : colors.border,
        backgroundColor: accent ? 'rgba(195,244,0,0.08)' : colors.surfaceHigh,
      }}
    >
      <Text
        numberOfLines={1}
        style={{
          color: accent ? colors.accentInk : colors.textMuted,
          fontSize: fontSizes.xs,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * A catalogue row.
 *
 * The previous version showed the muscle group and the equipment as one grey
 * sentence, which is why the section read as a phone book: every row looked
 * identical at a glance. The payload already carries the muscle actually
 * targeted, the body part and the equipment — three facts a lifter scans for
 * before reading a single name. Shown as tags they are separable at speed, and
 * the targeted muscle is accented because it is the one people filter by in
 * their head.
 */
function ExerciseRow({ exercise, onPress }: { exercise: Exercise; onPress: () => void }) {
  const tags = [
    { label: exercise.targetMuscle ?? exercise.grupoMuscular, accent: true },
    { label: exercise.bodyPart, accent: false },
    { label: exercise.requiredEquipment, accent: false },
  ].filter((tag): tag is { label: string; accent: boolean } => Boolean(tag.label));

  return (
    <PressableScale
      accessibilityLabel={`${exercise.nombre}. ${tags.map((tag) => tag.label).join('. ')}`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        minHeight: minTouchTarget,
        paddingVertical: spacing.sm,
      }}
    >
      <ExerciseImage exercise={exercise} size={64} />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text
          numberOfLines={2}
          style={{ color: colors.text, fontSize: fontSizes.md, fontWeight: '600' }}
        >
          {exercise.nombre}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {tags.map((tag) => (
            <Tag accent={tag.accent} key={tag.label} label={tag.label} />
          ))}
        </View>
      </View>
      <Ionicons
        accessibilityElementsHidden
        color={colors.textDisabled}
        importantForAccessibility="no-hide-descendants"
        name="chevron-forward"
        size={iconSizes.md}
      />
    </PressableScale>
  );
}

/**
 * The exercise catalogue. Artwork does the identifying work here — a name like
 * "Press inclinado con mancuernas" is far slower to recognise than its picture,
 * so every row leads with the image.
 */
export default function ExercisesScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  /** Drill-down position. `null` at a level means "not chosen yet". */
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);

  const taxonomy = useQuery({
    queryKey: ['exercises', 'taxonomy'],
    queryFn: () => exerciseService.taxonomy(),
    // The catalogue's shape barely changes; refetching it on every visit would
    // cost a round trip to redraw the same grid.
    staleTime: 30 * 60 * 1000,
  });

  // Searching cuts across the whole catalogue: someone typing a name does not
  // want to be told it is not in the muscle they happen to be browsing.
  const searching = search.trim().length > 0;
  const browsing = searching || Boolean(muscle);

  const exercises = useQuery({
    queryKey: ['exercises', search, bodyPart, muscle],
    queryFn: () =>
      exerciseService.list({
        search: search.trim() || undefined,
        bodyPart: searching ? undefined : bodyPart ?? undefined,
        targetMuscle: searching ? undefined : muscle ?? undefined,
        pageSize: 50,
      }),
    // Only fetch once there is something to list; the grids need no exercises.
    enabled: browsing,
    placeholderData: keepPreviousData,
  });

  const items = exercises.data?.items ?? [];
  const groups = taxonomy.data ?? [];
  const currentGroup = groups.find((group) => group.bodyPart === bodyPart) ?? null;

  const subtitle = searching
    ? 'Buscando en todo el catálogo'
    : muscle
      ? `${titleCase(muscle)} · ${titleCase(bodyPart ?? '')}`
      : bodyPart
        ? titleCase(bodyPart)
        : 'Elige una zona para empezar';

  return (
    <ScrollScreen
      onRefresh={() => {
        void taxonomy.refetch();
        if (browsing) void exercises.refetch();
      }}
      refreshing={taxonomy.isFetching || exercises.isFetching}
    >
      <ScreenHeader subtitle={subtitle} title="Ejercicios" />

      <Input
        autoCapitalize="none"
        autoCorrect={false}
        label="Buscar"
        onChangeText={setSearch}
        placeholder="Nombre, grupo muscular…"
        returnKeyType="search"
        value={search}
      />

      {/* Breadcrumb: one step back at a time, so the user can widen the filter
          without losing the zone they were exploring. */}
      {!searching && muscle ? (
        <DrillBack label={titleCase(bodyPart ?? '')} onPress={() => setMuscle(null)} />
      ) : null}
      {!searching && bodyPart && !muscle ? (
        <DrillBack label="Todas las zonas" onPress={() => setBodyPart(null)} />
      ) : null}

      {/* LEVEL 1 — body parts */}
      {!searching && !bodyPart ? (
        taxonomy.isPending ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={116} />
            <Skeleton height={116} />
          </View>
        ) : taxonomy.isError ? (
          <ErrorState error={taxonomy.error} onRetry={() => void taxonomy.refetch()} />
        ) : (
          <Grid>
            {groups.map((group, index) => (
              <GridTile
                icon={iconFor(group.bodyPart)}
                index={index}
                key={group.bodyPart}
                label={titleCase(group.bodyPart)}
                onPress={() => setBodyPart(group.bodyPart)}
                total={group.total}
              />
            ))}
          </Grid>
        )
      ) : null}

      {/* LEVEL 2 — muscles inside the chosen body part */}
      {!searching && bodyPart && !muscle ? (
        <Grid>
          {(currentGroup?.muscles ?? []).map((entry, index) => (
            <GridTile
              icon={iconFor(bodyPart)}
              index={index}
              key={entry.targetMuscle}
              label={titleCase(entry.targetMuscle)}
              onPress={() => setMuscle(entry.targetMuscle)}
              total={entry.total}
            />
          ))}
        </Grid>
      ) : null}

      {/* LEVEL 3 — the exercises themselves */}
      {browsing ? (
        exercises.isPending ? (
          <View style={{ gap: spacing.sm }}>
            <Skeleton height={72} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </View>
        ) : exercises.isError ? (
          <ErrorState error={exercises.error} onRetry={() => void exercises.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="search-outline"
            message={
              searching
                ? `Ningún ejercicio coincide con «${search}».`
                : 'No hay ejercicios registrados para este músculo.'
            }
            title="Sin resultados"
          />
        ) : (
          <Card>
            {items.map((exercise, index) => (
              <View key={exercise.id}>
                {index > 0 ? <Divider /> : null}
                <ExerciseRow
                  exercise={exercise}
                  onPress={() =>
                    router.push({ pathname: '/exercises/[id]', params: { id: exercise.id } })
                  }
                />
              </View>
            ))}
          </Card>
        )
      ) : null}
    </ScrollScreen>
  );
}
