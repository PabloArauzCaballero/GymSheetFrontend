import { pointRateChips } from '@gymsheet/domain';
import {
  Award,
  CalendarDays,
  Dumbbell,
  Flame,
  Layers,
  PersonStanding,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import type { PointRules, ProgressionStats } from '@/shared/api/schemas';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { MetricCard } from '@/shared/components/ui/metric-card';

function days(count: number): string {
  return count > 0 ? `${count} ${count === 1 ? 'día' : 'días'}` : '—';
}

/**
 * «Lo que suma»: las cifras que mueven los puntos.
 *
 * Solo las que dan puntos llevan chip de tarifa, y la tarifa llega del
 * servidor. Así la tarjeta deja de ser una lista de números y explica la cifra
 * de la cabecera.
 */
export function ProgressionStatsCard({
  stats,
  rules,
}: Readonly<{ stats: ProgressionStats; rules: PointRules | undefined }>) {
  const chips = rules ? pointRateChips(rules) : undefined;

  return (
    <Card>
      <CardHeader description="Las cifras con tarifa son las que te dan puntos." title="Lo que suma" />
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <MetricCard
          icon={<Dumbbell aria-hidden className="h-4 w-4" />}
          label="Entrenamientos"
          rate={chips?.session}
          value={`${stats.totalSessions}`}
        />
        <MetricCard
          icon={<Layers aria-hidden className="h-4 w-4" />}
          label="Series"
          rate={chips?.sets}
          value={stats.totalSets.toLocaleString('es-ES')}
        />
        <MetricCard
          icon={<Award aria-hidden className="h-4 w-4" />}
          label="Volumen total"
          rate={chips?.volume}
          value={`${Math.round(stats.totalVolumeKg / 1000).toLocaleString('es-ES')} t`}
        />
        <MetricCard
          icon={<Trophy aria-hidden className="h-4 w-4" />}
          label="Racha más larga"
          rate={chips?.streak}
          value={days(stats.longestStreakDays)}
        />
        <MetricCard
          icon={<Flame aria-hidden className="h-4 w-4" />}
          label="Racha actual"
          value={days(stats.currentStreakDays)}
        />
        <MetricCard
          icon={<CalendarDays aria-hidden className="h-4 w-4" />}
          label="Semanas seguidas"
          value={`${stats.weeklyStreak}`}
        />
        <MetricCard
          icon={<TrendingUp aria-hidden className="h-4 w-4" />}
          label="Récords batidos"
          value={`${stats.personalRecords}`}
        />
        <MetricCard
          icon={<PersonStanding aria-hidden className="h-4 w-4" />}
          label="Grupos trabajados"
          value={`${stats.distinctMuscleGroups}`}
        />
        {stats.currentStreakDays === 0 && stats.totalSessions > 0 ? (
          // Una racha rota es un hecho, no un reproche: el texto invita a
          // empezar otra hoy y no menciona el fallo.
          <p className="text-xs leading-5 text-[var(--text-muted)] sm:col-span-2">
            Tu racha está en cero. Un entrenamiento hoy y vuelve a contar.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
