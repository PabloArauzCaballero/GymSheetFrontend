'use client';

import { CARD_RARITY_LABEL, chainLevelLabel, type BadgeChainGroup } from '@gymsheet/domain';
import { ChevronRight } from 'lucide-react';
import type { ProgressionBadge } from '@/shared/api/schemas';
import { Dialog, DialogContent } from '@/shared/components/ui/dialog';
import { isVeiled, MaterialCard, materialAccent } from './material-card';
import { BadgeTile } from './progression-badge-tile';
import { withAlpha } from './progression-colors';
import { ProgressTrack } from './progression-track';

export type BadgeChain = BadgeChainGroup<ProgressionBadge>;

/**
 * Una cadena de insignias del mismo criterio como una sola ficha: la carta de
 * la última conseguida, «Nivel 2 de 4» y la siguiente meta con su barra. Así
 * setenta y nueve fichas iguales se quedan en unas treinta y cinco que se leen.
 *
 * Una cadena de un solo paso es una insignia de siempre: se pinta con
 * `BadgeTile` y se comporta igual que antes.
 */
export function BadgeChainTile({
  chain,
  onOpenChain,
  onCelebrate,
}: Readonly<{
  chain: BadgeChain;
  onOpenChain: (chain: BadgeChain) => void;
  onCelebrate: (badge: ProgressionBadge) => void;
}>) {
  if (chain.steps.length === 1) {
    return <BadgeTile badge={chain.steps[0] as ProgressionBadge} onCelebrate={onCelebrate} />;
  }

  const shown = chain.current;
  const next = chain.next;
  const level = chainLevelLabel(chain) ?? '';
  const nextVeiled = next ? isVeiled(next) : false;
  const started = chain.earnedCount > 0;
  const isNew = chain.steps.some((step) => step.isNew);
  const accent = materialAccent(shown.rarity);
  const title = started || !isVeiled(shown) ? shown.name : 'Insignia secreta';

  return (
    <button
      aria-haspopup="dialog"
      aria-label={`${title}. ${level}.${next ? ` Siguiente: ${nextVeiled ? 'secreta' : next.name}.` : ' Completa.'} Ver los pasos`}
      className="hover-lift pressable grid content-start gap-3 rounded-2xl border bg-[var(--surface-low)] p-5 text-left"
      onClick={() => onOpenChain(chain)}
      style={{ borderColor: started ? withAlpha(accent, 0.4) : 'var(--border-subtle)' }}
      type="button"
    >
      <div className="flex items-center gap-3">
        {/* Las cartas de la cadena, apiladas: se ve que hay más de una. */}
        <span aria-hidden className="relative h-[50px] w-[44px] shrink-0">
          <MaterialCard
            className="absolute left-2 top-0 rotate-[8deg]"
            icon={(next ?? shown).icon}
            rarity={(next ?? shown).rarity}
            size={32}
            state={next ? (nextVeiled ? 'veiled' : 'pending') : 'earned'}
          />
          <MaterialCard
            className="absolute left-0 top-1"
            icon={shown.icon}
            rarity={shown.rarity}
            size={32}
            state={started ? 'earned' : isVeiled(shown) ? 'veiled' : 'pending'}
          />
        </span>
        <div className="grid min-w-0 flex-1 gap-0.5">
          <span
            className={`truncate text-sm font-semibold ${started ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}
          >
            {title}
          </span>
          <span className="text-xs font-semibold tabular-nums text-[var(--text-muted)]">
            {chain.complete ? `${level} · completa` : level}
          </span>
        </div>
        {isNew ? (
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-[var(--text)]"
            style={{ backgroundColor: withAlpha(accent, 0.22) }}
          >
            NUEVA
          </span>
        ) : null}
        <ChevronRight aria-hidden className="size-4 shrink-0 text-[var(--text-muted)]" />
      </div>

      {next ? (
        <div className="grid gap-1.5">
          <p className="line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
            {nextVeiled
              ? 'Siguiente: se revela al conseguirla.'
              : `Siguiente: ${next.name} · ${next.description}`}
          </p>
          {next.progress !== null ? (
            <div className="flex items-center gap-3">
              <ProgressTrack
                color={materialAccent(next.rarity)}
                height={4}
                label={`Avance de ${next.name}`}
                ratio={next.progress}
              />
              {next.progressLabel ? (
                <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">
                  {next.progressLabel}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs leading-5 text-[var(--text-muted)]">
          {shown.flavorText ?? shown.description}
        </p>
      )}
    </button>
  );
}

/** Los pasos de una cadena: los conseguidos se pueden volver a abrir como carta. */
export function ChainDialog({
  chain,
  onClose,
  onCelebrate,
}: Readonly<{
  chain: BadgeChain | null;
  onClose: () => void;
  onCelebrate: (badge: ProgressionBadge) => void;
}>) {
  const first = chain?.steps[0];
  const title = chain && first ? (chain.earnedCount > 0 ? chain.current.name : first.name) : '';
  const rarities = chain
    ? [...new Set(chain.steps.map((step) => CARD_RARITY_LABEL[step.rarity]))].join(' → ')
    : '';
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open={chain !== null}>
      {chain ? (
        <DialogContent description={`${chainLevelLabel(chain) ?? ''} · ${rarities}`} title={title}>
          <ol className="grid gap-3">
            {chain.steps.map((step) => (
              <li key={step.code}>
                <BadgeTile
                  badge={step}
                  onCelebrate={(badge) => {
                    // La carta sustituye a la hoja: dos diálogos a la vez se pisan el foco.
                    onClose();
                    onCelebrate(badge);
                  }}
                />
              </li>
            ))}
          </ol>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
