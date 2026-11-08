import { authorLabel, downloadsLabel, ratingValue } from '@gymsheet/hooks';
import type { RoutineCard as RoutineCardData } from '@gymsheet/types';
import { Dumbbell, Star } from 'lucide-react';
import Link from 'next/link';
import { DomainImage } from '@/shared/components/media/domain-image';
import { PersonAvatar } from '@/shared/components/media/person-avatar';
import { goalLabel } from '@/features/routines-v2/labels';
import { goalGradients, onMedia, ratingStar } from '@/shared/theme/metric-colors';

function planLine(card: Pick<RoutineCardData, 'diasPorSemana' | 'duracionSemanas'>): string {
  return [
    `${card.diasPorSemana} ${card.diasPorSemana === 1 ? 'día' : 'días'} por semana`,
    card.duracionSemanas ? `${card.duracionSemanas} semanas` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Estrellas y descargas; «Nueva» si aún no hay ninguna de las dos. */
function SocialProof({ valoracion, copias }: Readonly<Pick<RoutineCardData, 'valoracion' | 'copias'>>) {
  const rating = ratingValue(valoracion);
  return (
    <span className="t-footnote inline-flex shrink-0 items-center gap-1 tabular-nums">
      {rating ? (
        <>
          <Star aria-hidden className="size-3 fill-current" style={{ color: ratingStar }} />
          <span className="font-semibold">{rating}</span>
        </>
      ) : null}
      {copias > 0 ? (
        <span className="text-[var(--text-muted)]">{rating ? `· ${downloadsLabel(copias)}` : downloadsLabel(copias)}</span>
      ) : null}
      {!rating && copias === 0 ? <span className="text-[var(--text-muted)]">Nueva</span> : null}
    </span>
  );
}

/**
 * Tarjeta del catálogo, la misma que `routine-card.tsx` del móvil: portada a
 * sangre (foto de un ejercicio o el degradado del objetivo) con el chip del
 * objetivo, el título encima de un velo que se funde con la tarjeta y, debajo,
 * quién la hizo y la prueba social.
 */
export function RoutineCard({
  routine,
  showVisibility = false,
}: Readonly<{ routine: RoutineCardData; showVisibility?: boolean }>) {
  const showsCommunity = routine.visibilidad === 'PUBLIC' || routine.esOficial;
  const who = routine.esOficial ? 'Equipo REPP' : routine.esMia ? 'Tú' : authorLabel(routine);
  const [from, to] = goalGradients[routine.objetivo ?? 'DEFAULT'];
  const goal = goalLabel(routine.objetivo);

  return (
    <Link
      className="tap group block overflow-hidden rounded-[var(--radius-2xl)] border border-[var(--border-subtle)] bg-[var(--surface-low)] shadow-[var(--shadow-lg)] transition-transform duration-[var(--dur-2)] ease-[var(--ease-out)] active:scale-[0.975] motion-reduce:active:scale-100"
      data-testid={`routine-card-${routine.id}`}
      href={`/routines/${routine.id}`}
    >
      <div className="relative aspect-[3/2] overflow-hidden" style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
        {routine.portadaUrl ? (
          <DomainImage alt="" className="size-full object-cover" src={routine.portadaUrl} />
        ) : (
          <Dumbbell aria-hidden className="absolute -bottom-7 -right-9 size-56 opacity-[0.08]" style={{ color: onMedia.text }} />
        )}
        <span
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, transparent 25%, color-mix(in srgb, var(--surface-low) 72%, transparent) 65%, var(--surface-low) 100%)',
          }}
        />
        {goal ? (
          <span
            className="t-caption absolute left-4 top-4 rounded-full px-2.5 py-1 font-semibold backdrop-blur-sm"
            style={{ background: onMedia.chip, color: onMedia.text }}
          >
            {goal}
          </span>
        ) : null}
        <div className="absolute inset-x-5 bottom-2 grid gap-1">
          <h2 className="line-clamp-2 font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em]">{routine.nombre}</h2>
          <p className="t-subhead truncate tabular-nums text-[var(--text-muted)]">{planLine(routine)}</p>
        </div>
      </div>
      <div className="flex min-h-11 items-center gap-2 px-5 pb-4 pt-1">
        <PersonAvatar name={routine.esOficial ? 'REPP' : routine.autor.nombre} photoUrl={routine.autor.fotoUrl ?? null} size="sm" />
        <span className="t-subhead min-w-0 flex-1 truncate font-semibold text-[var(--text-muted)]">{who}</span>
        {showsCommunity ? (
          <SocialProof copias={routine.copias} valoracion={routine.valoracion} />
        ) : (
          <span className="t-footnote text-[var(--text-muted)]">
            {showVisibility && routine.visibilidad === 'PUBLIC' ? 'Pública' : 'Solo tú la ves'}
          </span>
        )}
      </div>
    </Link>
  );
}
