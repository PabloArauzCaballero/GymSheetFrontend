import type { ProgressionLevel } from '@/shared/api/schemas';
import { withAlpha } from './progression-colors';
import { ProgressionIcon } from './progression-icon';
import { ProgressTrack } from './progression-track';

/**
 * Cabecera de la senda: quién eres ahora y cuánto falta para lo siguiente.
 *
 * Los puntos son el único número con el acento de la marca. Es la misma
 * política que en el móvil —el acento es para la acción principal y para la
 * cifra por la que existe la pantalla—, y esta pantalla existe por esa cifra.
 */
export function RankHero({
  level,
  nextLevel,
  points,
  pointsToNextLevel,
  levelProgress,
}: Readonly<{
  level: ProgressionLevel | null;
  nextLevel: ProgressionLevel | null;
  points: number;
  pointsToNextLevel: number | null;
  levelProgress: number;
}>) {
  return (
    <section
      className="grid gap-4 rounded-3xl border p-6"
      style={{
        borderColor: level ? withAlpha(level.color, 0.3) : 'var(--border-subtle)',
        backgroundColor: 'var(--surface-low)',
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border"
          style={{
            borderColor: level ? withAlpha(level.color, 0.5) : 'var(--border)',
            backgroundColor: level ? withAlpha(level.color, 0.16) : 'var(--surface-high)',
          }}
        >
          <ProgressionIcon
            className="h-8 w-8"
            name={level?.icon ?? 'footsteps-outline'}
            style={{ color: level?.color ?? 'var(--text-disabled)' }}
          />
        </span>
        <div className="grid min-w-0 gap-0.5">
          <span className="text-xs uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Tu rango
          </span>
          <span className="text-2xl font-semibold tracking-[-0.02em] text-[var(--text)]">
            {level?.name ?? 'Sin empezar'}
          </span>
        </div>
      </div>

      <p className="text-sm leading-6 text-[var(--text-muted)]">
        {level?.tagline ?? 'Registra tu primer entrenamiento y la senda empieza.'}
      </p>

      <p className="flex items-baseline gap-2">
        <span className="text-4xl font-semibold tracking-[-0.03em] text-[var(--volt)]">
          {points.toLocaleString('es-ES')}
        </span>
        <span className="text-sm text-[var(--text-muted)]">puntos</span>
      </p>

      <div className="grid gap-1.5">
        <ProgressTrack
          color={nextLevel?.color ?? level?.color ?? 'var(--volt)'}
          ratio={levelProgress}
        />
        <span className="text-xs text-[var(--text-muted)]">
          {nextLevel && pointsToNextLevel !== null
            ? `Te faltan ${pointsToNextLevel.toLocaleString('es-ES')} puntos para ${nextLevel.name}`
            : 'Has llegado al final de la senda. Ahora se trata de mantenerlo.'}
        </span>
      </div>
    </section>
  );
}

/**
 * Las piezas de la senda viven en archivos separados —una por objeto dibujado—
 * y se reexportan aquí para que quien las use no tenga que saber en cuál está
 * cada una. Todas juntas son el reflejo exacto de
 * `apps/mobile/src/components/progression.tsx`: mismos estados, misma
 * geometría, mismos textos; solo cambia el medio.
 */
export { BadgeTile } from './progression-badge-tile';
export { PathNode } from './progression-path-node';
export { ProgressTrack } from './progression-track';
