import { Sparkles } from 'lucide-react';
import type { ProgressionBadge } from '@/shared/api/schemas';
import { cn } from '@/shared/lib/cn';
import { RARITY_LABEL, withAlpha } from './progression-colors';
import { ProgressionIcon } from './progression-icon';
import { ProgressTrack } from './progression-track';
import { chipHeartbeat } from '@/shared/components/ui/badge';

/**
 * Una insignia.
 *
 * Conseguida: a todo color, con su línea de sabor —la frase es el premio tanto
 * como el icono—. Pendiente: apagada, pero con su barra y su cuenta exacta
 * («8 / 9»), porque una insignia sin distancia visible no motiva a nadie.
 *
 * Cuando quien la usa pasa `onCelebrate` y la insignia está conseguida, la
 * tarjeta entera se convierte en un botón que reproduce la celebración. La prop
 * es opcional a propósito: esta misma pieza dibuja las insignias de otro socio
 * —el perfil ajeno—, y ahí no hay nada que celebrar; sin la prop, la tarjeta es
 * exactamente la de siempre, un `article` sin foco ni acciones.
 */
export function BadgeTile({
  badge,
  onCelebrate,
}: Readonly<{
  badge: ProgressionBadge;
  onCelebrate?: (badge: ProgressionBadge) => void;
}>) {
  const shell = cn(
    'grid gap-3 rounded-2xl border p-5 text-left',
    // Las pendientes se apagan sin desaparecer: siguen siendo el objetivo.
    badge.earned ? 'opacity-100' : 'opacity-70',
  );
  const shellStyle = {
    borderColor: badge.earned ? withAlpha(badge.color, 0.28) : 'var(--border-subtle)',
    backgroundColor: 'var(--surface-low)',
  };

  const body = (
    <>
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
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${chipHeartbeat}`}
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
          <ProgressTrack
            color="var(--text-disabled)"
            height={4}
            label={`Avance de la medalla ${badge.name}`}
            ratio={badge.progress}
          />
          <span className="text-xs text-[var(--text-disabled)]">{badge.progressLabel}</span>
        </div>
      ) : null}
    </>
  );

  if (!badge.earned || !onCelebrate) {
    return (
      <article className={shell} style={shellStyle}>
        {body}
      </article>
    );
  }

  return (
    <button
      // Un botón de verdad: el foco, `Enter` y `Espacio` los pone el navegador,
      // y la tarjeta ya mide bastante más de 44 px en cualquier ancho.
      aria-label={`Celebrar la insignia ${badge.name}`}
      className={cn(shell, 'hover-lift pressable cursor-pointer')}
      onClick={() => onCelebrate(badge)}
      style={shellStyle}
      type="button"
    >
      {body}
      {/* Que sea pulsable tiene que *verse*: sin esta línea la única pista sería
          el cursor, que en una pantalla táctil no existe. */}
      <span
        className="flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-ink)]"
        aria-hidden
      >
        <Sparkles className="size-3.5" />
        Celebrar
      </span>
    </button>
  );
}
