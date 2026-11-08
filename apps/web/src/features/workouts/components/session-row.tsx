import { formatTimeOfDay, relativeDay, sessionDuration, sessionTitle, setVolumeKg } from '@gymsheet/domain';
import type { Workout } from '@gymsheet/types';
import { ChevronRight, Clock, Dumbbell, Flame, Repeat, TrendingUp, X, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/shared/components/ui/badge';
import { metricColor, type MetricKey } from '@/shared/theme/metric-colors';

const LOOK: Record<Workout['estado'], { icon: LucideIcon; metric: MetricKey }> = {
  EN_PROGRESO: { icon: Flame, metric: 'streak' },
  FINALIZADA: { icon: Dumbbell, metric: 'weight' },
  CANCELADA: { icon: X, metric: 'skipped' },
};

const BADGE = {
  EN_PROGRESO: { label: 'En progreso', tone: 'info' },
  CANCELADA: { label: 'Cancelada', tone: 'danger' },
} as const;

function Metric({ icon: Icon, metric, value }: Readonly<{ icon: LucideIcon; metric: MetricKey; value: string }>) {
  return (
    <span className="t-footnote inline-flex items-center gap-1 tabular-nums text-[var(--text-muted)]">
      <Icon aria-hidden className="size-3" style={{ color: metricColor(metric).ink }} />
      {value}
    </span>
  );
}

/**
 * Una sesión del historial (`SessionRow` del móvil): qué día era y a qué hora,
 * lo que se movió con el color de cada magnitud, y solo se marca la sesión que
 * sigue abierta o se canceló —terminada es lo normal—.
 */
export function SessionRow({ session }: Readonly<{ session: Workout }>) {
  const look = LOOK[session.estado];
  const tone = metricColor(look.metric);
  const head = sessionTitle(session.observacion);
  const sets = session.ejercicios.reduce((sum, item) => sum + item.series.length, 0);
  const volume = Math.round(
    session.ejercicios.reduce((sum, item) => sum + item.series.reduce((acc, set) => acc + setVolumeKg(set), 0), 0),
  );
  const duration = sessionDuration(session.fechaInicio, session.fechaFin);
  const when = [relativeDay(session.fechaInicio), formatTimeOfDay(session.fechaInicio)].filter(Boolean).join(' · ');
  const cancelled = session.estado === 'CANCELADA';
  const title = head.title === 'Entrenamiento' ? 'Entreno libre' : head.title;
  const badge = session.estado === 'FINALIZADA' ? null : BADGE[session.estado];
  const count = session.ejercicios.length;

  return (
    <Link
      className={`tap group flex min-h-19 items-center gap-3 rounded-[var(--radius-xl)] bg-[var(--surface-low)] p-3 shadow-[var(--shadow-lg)] transition-[background-color] duration-[var(--dur-2)] hover:bg-[var(--surface)] ${cancelled ? 'opacity-70' : ''}`}
      href={`/workouts/${session.id}`}
    >
      <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full" style={{ background: tone.tint, color: tone.ink }}>
        <look.icon className="size-5" />
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-center gap-2">
          <span className="t-headline truncate">{title}</span>
          {badge ? <Badge tone={badge.tone}>{badge.label}</Badge> : null}
        </span>
        <span className="t-footnote truncate text-[var(--text-muted)]">
          {head.subtitle ? `${when} · ${head.subtitle}` : when}
        </span>
        {cancelled && sets === 0 ? null : (
          <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
            <Metric icon={Dumbbell} metric="weight" value={`${count} ${count === 1 ? 'ejercicio' : 'ejercicios'}`} />
            <Metric icon={Repeat} metric="reps" value={`${sets} ${sets === 1 ? 'serie' : 'series'}`} />
            {volume > 0 ? <Metric icon={TrendingUp} metric="volume" value={`${volume.toLocaleString('es-ES')} kg`} /> : null}
            {duration ? <Metric icon={Clock} metric="time" value={duration} /> : null}
          </span>
        )}
      </span>
      <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
    </Link>
  );
}
