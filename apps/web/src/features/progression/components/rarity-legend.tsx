import {
  CARD_RARITY_HINT,
  CARD_RARITY_LABEL,
  CARD_TIERS,
  SECRET_BADGES_HINT,
  type CardRarity,
} from '@gymsheet/domain';
import { ChevronDown, Info } from 'lucide-react';

const ORDER: readonly CardRarity[] = ['COMUN', 'RARA', 'EPICA', 'LEGENDARIA'];

/**
 * «¿Qué significa la rareza?», plegado por defecto.
 *
 * Un `<details>` nativo: teclado, lector de pantalla y estado abierto/cerrado
 * los pone el navegador sin una línea de JavaScript. Gemelo de
 * `apps/mobile/src/components/rarity-legend.tsx`.
 */
export function RarityLegend() {
  return (
    <details className="group rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--surface-low)]">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-semibold text-[var(--accent-ink)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-ink)] [&::-webkit-details-marker]:hidden">
        <Info aria-hidden className="size-4" />
        ¿Qué significa la rareza?
        <ChevronDown
          aria-hidden
          className="size-4 transition-transform duration-[var(--dur-1)] group-open:rotate-180 motion-reduce:transition-none"
        />
      </summary>
      <ul className="grid gap-2 px-4 pb-4">
        {ORDER.map((rarity) => (
          <li className="flex items-start gap-3 text-xs leading-5 text-[var(--text-muted)]" key={rarity}>
            <span
              aria-hidden
              className="mt-1.5 size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CARD_TIERS[rarity].frame[1] }}
            />
            <span>
              <strong className="font-semibold text-[var(--text)]">{CARD_RARITY_LABEL[rarity]}.</strong>{' '}
              {CARD_RARITY_HINT[rarity]}
            </span>
          </li>
        ))}
        <li className="text-xs leading-5 text-[var(--text-muted)]">{SECRET_BADGES_HINT}</li>
      </ul>
    </details>
  );
}
