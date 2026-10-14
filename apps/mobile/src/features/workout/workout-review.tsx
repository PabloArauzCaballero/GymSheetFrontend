import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { transitionLabel } from '@gymsheet/hooks';
import type { Workout } from '@gymsheet/types';
import { useExerciseMedia } from '@/api/use-exercise-media';
import { GroupBlock } from '@/components/group-block';
import { Badge, ScrollScreen } from '@/components/layout';
import { BackLink } from '@/components/nav';
import { Text } from '@/components/text';
import { CurrentExercise } from '@/features/workout/exercise-card';
import { badgeOf, blockName, nameOf, targetOf, toFlowItems, type Item } from '@/features/workout/shared';
import { countSets, volumeOf } from '@/features/workout/use-workout-session';
import { buildFlowBlocks, progressLabel, type FlowBlock } from '@/features/workout/workout-flow';
import { WORKOUT_LABEL, WORKOUT_TONE, formatDuration, relativeDay } from '@/lib/format';
import { routes } from '@/lib/routes';
import { spacing } from '@/theme';

/**
 * Una sesión ya cerrada (o cancelada), para repasarla: todos los ejercicios
 * desplegados con sus series. Es un documento, no un flujo: aquí sí conviene
 * verlo todo de corrido. La sesión en curso vive en `focus/workout-focus`.
 */
export function WorkoutReview({ data, onRefresh, refreshing }: { data: Workout; onRefresh: () => void; refreshing: boolean }) {
  const router = useRouter();
  const ordered = useMemo(() => [...data.ejercicios].sort((a, b) => a.orden - b.orden), [data]);
  const withMedia = useExerciseMedia(ordered.map((item) => item.ejercicio));
  const blocks = useMemo(() => buildFlowBlocks<Item>(toFlowItems(ordered)), [ordered]);

  const totalSets = countSets(data);
  const volume = Math.round(volumeOf(data));
  const duration = formatDuration(data.fechaInicio, data.fechaFin);

  const renderItem = (block: FlowBlock<Item>, item: Item) => {
    const source = item.source;
    return (
      <CurrentExercise
        badge={badgeOf(block, item)}
        exercise={withMedia(source.ejercicio)}
        grouped={block.kind !== 'single'}
        key={item.id}
        name={nameOf(source)}
        note={source.nota}
        onOpenDetail={source.ejercicio ? () => router.push(routes.exercise(source.ejercicio!.id)) : undefined}
        progress={progressLabel(item)}
        sets={source.series}
        target={targetOf(source)}
        testID={`workout-exercise-${item.id}`}
      />
    );
  };

  return (
    <ScrollScreen onRefresh={onRefresh} refreshing={refreshing}>
      <BackLink />
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }} variant="display">
            {relativeDay(data.fechaInicio)}
          </Text>
          <Badge label={WORKOUT_LABEL[data.estado]} tone={WORKOUT_TONE[data.estado]} />
        </View>
        <Text tabular tone="secondary" variant="subhead">
          {[
            `${ordered.length} ${ordered.length === 1 ? 'ejercicio' : 'ejercicios'}`,
            `${totalSets} ${totalSets === 1 ? 'serie' : 'series'}`,
            volume > 0 ? `${volume.toLocaleString('es-ES')} kg` : null,
            duration,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
      </View>

      {data.observacion ? (
        <Text tone="secondary" variant="subhead">
          {data.observacion}
        </Text>
      ) : null}

      <View style={{ gap: spacing.sm }}>
        {blocks.map((block) => {
          if (block.kind === 'single') {
            const item = block.items[0];
            return item ? renderItem(block, item) : null;
          }
          return (
            <GroupBlock
              key={block.items.map((item) => item.id).join('+')}
              label={blockName(block)}
              restSeconds={block.restAfter}
              rounds={block.rounds ?? 1}
              testID={`workout-block-${block.label}`}
              transition={transitionLabel(block.between)}
            >
              {block.items.map((item) => renderItem(block, item))}
            </GroupBlock>
          );
        })}
      </View>
    </ScrollScreen>
  );
}
