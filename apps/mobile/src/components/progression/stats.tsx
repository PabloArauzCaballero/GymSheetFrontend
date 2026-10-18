import type { PointRules, ProgressionStats } from '@gymsheet/schemas';
import { pointRateChips } from '@gymsheet/domain';
import { Text, View } from 'react-native';
import { Section, StatTile } from '@/components/layout';
import { colors, fontSizes, spacing } from '@/theme';

/** «Lo que suma»: las cifras que mueven los puntos, cada una con su tarifa. */
export function StatsSection({
  stats,
  rules,
  streakShown = false,
}: {
  stats: ProgressionStats;
  rules?: PointRules;
  /** La racha ya tiene su tarjeta arriba: aquí no se repite. */
  streakShown?: boolean;
}) {
  const chips = rules ? pointRateChips(rules) : undefined;
  return (
    <Section icon="stats-chart-outline" title="Lo que suma">
      <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
        Las cifras con tarifa son las que te dan puntos.
      </Text>
      {/* Parejas en fila, no `Columns`: en teléfono `Columns` apila y la
          sección ocupaba dos pantallas. Primero las cuatro cifras que suman,
          cada una con su tarifa; después las que solo informan. La racha que
          paga es la más larga, así que va con chip; la actual, sin él. */}
      <View style={{ gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatTile
            icon="barbell-outline"
            tone="weight"
            label="Entrenamientos"
            rate={chips?.session}
            value={`${stats.totalSessions}`}
          />
          <StatTile
            icon="layers-outline"
            tone="reps"
            label="Series"
            rate={chips?.sets}
            value={stats.totalSets.toLocaleString('es-ES')}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatTile
            icon="scale-outline"
            tone="volume"
            label="Volumen total"
            rate={chips?.volume}
            value={`${Math.round(stats.totalVolumeKg / 1000).toLocaleString('es-ES')} t`}
          />
          <StatTile
            icon="trophy-outline"
            tone="record"
            label="Racha más larga"
            rate={chips?.streak}
            value={
              stats.longestStreakDays > 0
                ? `${stats.longestStreakDays} ${stats.longestStreakDays === 1 ? 'día' : 'días'}`
                : '—'
            }
          />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {streakShown ? null : (
            <StatTile
              icon="flame-outline"
              tone="streak"
              label="Racha actual"
              value={
                stats.currentStreakDays > 0
                  ? `${stats.currentStreakDays} ${stats.currentStreakDays === 1 ? 'día' : 'días'}`
                  : '—'
              }
            />
          )}
          <StatTile
            icon="calendar-outline"
            tone="time"
            label="Semanas seguidas"
            value={`${stats.weeklyStreak}`}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <StatTile
            icon="trending-up-outline"
            tone="record"
            label="Récords batidos"
            value={`${stats.personalRecords}`}
          />
          <StatTile
            icon="body-outline"
            tone="effort"
            label="Grupos trabajados"
            value={`${stats.distinctMuscleGroups}`}
          />
        </View>
      </View>
      {!streakShown && stats.currentStreakDays === 0 && stats.totalSessions > 0 ? (
        // Una racha rota es un hecho, no un reproche: el texto invita a
        // empezar otra hoy y no menciona el fallo.
        <Text style={{ color: colors.textMuted, fontSize: fontSizes.xs, lineHeight: 18 }}>
          Tu racha está en cero. Un entrenamiento hoy y vuelve a contar.
        </Text>
      ) : null}
    </Section>
  );
}
