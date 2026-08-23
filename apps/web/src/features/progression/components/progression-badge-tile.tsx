import type { ProgressionBadge } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';
import { RARITY_LABEL, withAlpha } from './progression-colors';
import { ProgressionIcon } from './progression-icon';
import { ProgressTrack } from './progression-track';

/**
 * Una insignia.
 *
 * Conseguida: a todo color, con su línea de sabor —la frase es el premio tanto
 * como el icono—. Pendiente: apagada, pero con su barra y su cuenta exacta
 * («8 / 9»), porque una insignia sin distancia visible no motiva a nadie.
 */
export function BadgeTile({ badge }: Readonly<{ badge: ProgressionBadge }>) {
  return (
    <article
      className={cn(
        'grid gap-3 rounded-2xl border p-5',
        // Las pendientes se apagan sin desaparecer: siguen siendo el objetivo.
        badge.earned ? 'opacity-100' : 'opacity-70',
      )}
      style={{
        borderColor: badge.earned ? withAlpha(badge.color, 0.28) : 'var(--border-subtle)',
        backgroundColor: 'var(--surface-low)',
      }}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{
            borderColor: badge.earned ? withAlpha(badge.color, 0.45) : 'var(--border-subtle)',
            backgroundColor: badge.earned ? withAlpha(badge.color, 0.14) : 'var(--surface-high)',
          }}
        >
          <ProgressionIcon
            className="h-5 w-5"
            name={badge.icon}
            style={{ color: badge.earned ? badge.color : 'var(--text-disabled)' }}
          />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span
            className={cn(
              'truncate text-sm font-semibold',
              badge.earned ? 'text-[var(--text)]' : 'text-[var(--text-muted)]',
            )}
          >
            {badge.name}
          </span>
          <span className="truncate text-xs text-[var(--text-disabled)]">
            {RARITY_LABEL[badge.rarity] ?? badge.rarity}
            {badge.pointsReward > 0 ? ` · +${badge.pointsReward} pts` : ''}
          </span>
        </div>
        {badge.isNew ? (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: withAlpha(badge.color, 0.2), color: badge.color }}
          >
            NUEVA
          </span>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-[var(--text-muted)]">
        {badge.earned ? (badge.flavorText ?? badge.description) : badge.description}
      </p>

      {!badge.earned && badge.progress !== null ? (
        <div className="grid gap-1.5">
          <ProgressTrack color="var(--text-disabled)" height={4} ratio={badge.progress} />
          <span className="text-xs text-[var(--text-disabled)]">{badge.progressLabel}</span>
        </div>
      ) : null}
    </article>
  );
}
