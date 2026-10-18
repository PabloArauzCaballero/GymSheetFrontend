import { nearestLabel } from '@gymsheet/domain';
import type { ProgressionBadge } from '@/shared/api/schemas';
import { MaterialCard, materialAccent } from './material-card';
import { ProgressTrack } from './progression-track';

/**
 * «Lo más cerca»: las insignias que casi tienes (gradiente de meta). Una fila
 * por insignia con su carta apagada, la barra y «Te faltan 2 para Medio
 * centenar». Sin nada cerca, no se pinta.
 */
export function NearestBadges({
  badges,
  limit = 3,
}: Readonly<{ badges: readonly ProgressionBadge[]; limit?: number }>) {
  const shown = badges.filter((badge) => !badge.earned).slice(0, limit);
  if (shown.length === 0) return null;
  return (
    <ul className="grid gap-4">
      {shown.map((badge) => (
        <li className="flex items-center gap-3" key={badge.code}>
          <MaterialCard icon={badge.icon} rarity={badge.rarity} size={32} state="pending" />
          <div className="grid min-w-0 flex-1 gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm font-semibold leading-5 text-[var(--text)]">
                {nearestLabel(badge)}
              </span>
              {badge.progressLabel ? (
                <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                  {badge.progressLabel}
                </span>
              ) : null}
            </div>
            <ProgressTrack
              color={materialAccent(badge.rarity)}
              height={4}
              label={`Avance de ${badge.name}`}
              ratio={badge.progress ?? 0}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
