import { Ionicons } from '@expo/vector-icons';
import type { ProgressionArena, ProgressionLevel } from '@gymsheet/schemas';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PressableScale } from '@/components/motion';
import { Text } from '@/components/text';
import { accentPolicy, arenaTrack, iconSizes, spacing } from '@/theme';
import { ARENA_ART_HEIGHT, ARENA_ART_WIDTH, arenaInkFor } from './arena-art';
import { ArenaBanner } from './arena-banner';
import { buildRoad, formatPoints } from './road';

/**
 * La puerta al camino de arenas desde «Tu senda»: tu arena, cuánto llevas del
 * tramo y cuánto falta para la siguiente. Un toque abre el camino entero.
 */
export function ArenaTeaser({
  arenas,
  path,
  points,
}: {
  arenas: readonly ProgressionArena[];
  path: readonly ProgressionLevel[];
  /** Puntos ganados (`arenaPoints`): el camino no baja al gastar. */
  points: number;
}) {
  const router = useRouter();
  const road = useMemo(() => buildRoad(arenas, path, points), [arenas, path, points]);
  const [width, setWidth] = useState(0);
  const current = road.arenas[road.currentIndex] ?? road.arenas[0];
  if (!current) return null;
  const next = road.next;
  const tint = arenaInkFor(current.code, current.order);

  return (
    <PressableScale
      accessibilityHint="Abre el camino de arenas"
      accessibilityRole="button"
      haptic="light"
      onPress={() => router.push('/camino')}
      scaleTo={0.98}
    >
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)} style={{ gap: spacing.smd }}>
        {width > 0 ? <ArenaBanner arena={current} width={width} /> : <View style={{ aspectRatio: ARENA_ART_WIDTH / ARENA_ART_HEIGHT }} />}
        <View style={styles.row}>
          <View style={[styles.track, { backgroundColor: arenaTrack }]}>
            <View style={[styles.fill, { width: `${current.segmentProgress * 100}%`, backgroundColor: tint.b[1] }]} />
          </View>
          <Text tabular tone="secondary" variant="footnote">
            {next ? `${formatPoints(next.pointsToEnter)} pts para ${next.name}` : 'En la cima'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={{ color: accentPolicy.ink, flex: 1 }} variant="subhead" strong>
            Ver el camino de arenas
          </Text>
          <Ionicons color={accentPolicy.ink} name="chevron-forward" size={iconSizes.md} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.smd,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
