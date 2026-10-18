'use client';

import { CARD_TIERS, PRIZE_STATUS_LABEL, prizeDateLabel, sortPrizes } from '@gymsheet/domain';
import { Sparkles } from 'lucide-react';
import type { Prize } from '@/shared/api/schemas';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { MaterialCard } from './material-card';
import { PrizeCode } from './prize-code';
import { withAlpha } from './progression-colors';

const GOLD = CARD_TIERS.LEGENDARIA.frame[1];

/**
 * «Mis premios»: los cupones reales del gimnasio, como tickets.
 *
 * El código va grande porque es lo que se enseña en recepción. Los disponibles
 * primero; los canjeados y caducados se quedan como recuerdo, apagados. Sin
 * premios la sección no existe: no se promete nada que el gimnasio no dé.
 */
export function PrizesCard({
  prizes,
  onOpen,
}: Readonly<{ prizes: readonly Prize[]; onOpen: (prize: Prize) => void }>) {
  if (prizes.length === 0) return null;
  const sorted = sortPrizes(prizes);
  const available = sorted.filter((prize) => prize.status === 'DISPONIBLE').length;
  return (
    <Card data-tutorial-id="progression:prizes">
      <CardHeader
        description="Enseña el código en recepción para canjearlo."
        title={available > 0 ? `Mis premios · ${available} por usar` : 'Mis premios'}
      />
      <CardContent className="grid gap-3 lg:grid-cols-2">
        {sorted.map((prize) => (
          <PrizeTicket key={prize.id} onOpen={onOpen} prize={prize} />
        ))}
      </CardContent>
    </Card>
  );
}

/** Ticket: talón con el icono, perforación y el cuerpo con el código. */
export function PrizeTicket({
  prize,
  onOpen,
}: Readonly<{ prize: Prize; onOpen?: (prize: Prize) => void }>) {
  const live = prize.status === 'DISPONIBLE';
  return (
    <article
      aria-label={`Premio: ${prize.title}`}
      className="flex overflow-hidden rounded-2xl border bg-[var(--surface-low)]"
      style={{ borderColor: live ? withAlpha(GOLD, 0.45) : 'var(--border-subtle)' }}
    >
      <div
        className="grid w-16 shrink-0 place-items-center sm:w-20"
        style={{ backgroundColor: live ? withAlpha(GOLD, 0.12) : 'var(--surface-high)' }}
      >
        <MaterialCard
          icon={prize.icon}
          rarity="LEGENDARIA"
          shape="glyph"
          size={40}
          state={live ? 'earned' : 'pending'}
        />
      </div>
      {/* La perforación es lo que hace leer «ticket». */}
      <div
        aria-hidden
        className="w-0 border-l-[1.5px] border-dashed"
        style={{ borderColor: live ? withAlpha(GOLD, 0.6) : 'var(--border)' }}
      />
      <div className="grid min-w-0 flex-1 gap-1.5 p-4">
        <div className="flex items-start gap-3">
          <h3
            className={`min-w-0 flex-1 text-base font-semibold leading-6 ${live ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
          >
            {prize.title}
          </h3>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{
              backgroundColor: live ? withAlpha(GOLD, 0.24) : 'var(--surface-high)',
              color: live ? 'var(--text)' : 'var(--text-muted)',
            }}
          >
            {prize.isNew && live ? 'Nuevo' : PRIZE_STATUS_LABEL[prize.status]}
          </span>
        </div>
        <PrizeCode code={prize.code} muted={!live} />
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          {[prizeDateLabel(prize), `Por ${prize.source.name}`].join(' · ')}
        </p>
        {live && prize.instructions ? (
          <p className="text-sm leading-5 text-[var(--text-muted)]">{prize.instructions}</p>
        ) : null}
        {live && onOpen ? (
          <button
            className="inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-[8px] text-xs font-semibold text-[var(--accent-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)]"
            onClick={() => onOpen(prize)}
            type="button"
          >
            <Sparkles aria-hidden className="size-3.5" />
            Ver su carta
          </button>
        ) : null}
      </div>
    </article>
  );
}
