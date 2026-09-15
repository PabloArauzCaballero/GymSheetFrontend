import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Progression } from '@/shared/api/schemas';
import { CountUp } from '@/shared/components/motion/count-up';
import { withAlpha } from './progression-colors';
import { ProgressionIcon } from './progression-icon';
import { ProgressTrack } from './progression-track';

/**
 * Entrada a la senda desde el panel.
 *
 * Es el reflejo exacto de la tarjeta de Inicio del móvil: mismo rango, misma
 * barra, mismo texto de distancia. Comparte con la senda las piezas que la
 * dibujan, de modo que la tarjeta de entrada y la pantalla a la que lleva no
 * puedan divergir.
 */
export function SendaCard({
  progression,
}: Readonly<{ progression: Progression }>) {
  const level = progression.level;
  if (!level) return null;

  return (
    <Link
      className="hover-lift grid gap-4 rounded-3xl border p-6 transition-colors"
      href="/trayectoria"
      style={{
        borderColor: withAlpha(level.color, 0.3),
        backgroundColor: 'var(--surface-low)',
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full border"
          style={{
            borderColor: withAlpha(level.color, 0.5),
            backgroundColor: withAlpha(level.color, 0.16),
          }}
        >
          <ProgressionIcon
            className="size-7"
            name={level.icon}
            style={{ color: level.color }}
          />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span className="text-xl font-semibold tracking-[-0.02em] text-[var(--text)]">
            {level.name}
          </span>
          <span className="truncate text-sm text-[var(--text-muted)]">{level.tagline}</span>
        </div>
        <ChevronRight aria-hidden className="size-5 shrink-0 text-[var(--text-muted)]" />
      </div>

      <ProgressTrack
        color={progression.nextLevel?.color ?? level.color}
        label={
          progression.nextLevel
            ? `Avance hacia ${progression.nextLevel.name}`
            : 'Avance de la senda'
        }
        ratio={progression.levelProgress}
      />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        {/* `--accent-ink`, no `--volt`: en oscuro valen lo mismo (#c3f400), así que el
            fallo era invisible al desarrollar; en claro `--volt` sigue siendo #c3f400
            sobre superficie clara —1.3:1— y la cifra desaparecía. `--accent-ink` baja
            a #55730a en claro y da 5.5:1. `--volt` queda para rellenos y CTA. */}
        <span className="text-sm font-semibold text-[var(--accent-ink)]">
          <span aria-hidden>
            <CountUp value={progression.points} /> puntos
          </span>
          <span className="sr-only">{`${progression.points.toLocaleString('es-ES')} puntos`}</span>
        </span>
        <span className="text-sm text-[var(--text-muted)]">
          {progression.nextLevel && progression.pointsToNextLevel !== null
            ? `Faltan ${progression.pointsToNextLevel.toLocaleString('es-ES')} para ${progression.nextLevel.name}`
            : 'Senda completa'}
        </span>
      </div>

      <span className="text-xs text-[var(--text-muted)]">
        Sumas puntos al entrenar. Toca para ver cómo.
      </span>
    </Link>
  );
}
