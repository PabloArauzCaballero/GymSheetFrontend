'use client';

import { useQuery } from '@tanstack/react-query';
import { copyNumberFromName, savedCopyLabel } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { catalogService } from '@/features/routines-v2/services';
import { routineV2Keys } from '@/features/routines-v2/keys';

export type SavedCopy = { id: string; label: string };

type CopyCard = {
  id: string;
  nombre: string;
  basadaEnRutinaId?: string | null;
  numeroCopia?: number | null;
};

/**
 * La copia más reciente que ya hay entre las tarjetas de «Mías». Se identifica
 * por `basadaEnRutinaId` y su número por `numeroCopia`; solo si la tarjeta no
 * trae esos datos (backend anterior) se lee el sufijo «· vN» del nombre.
 */
export function pickSavedCopy(
  source: Pick<Routine, 'id' | 'nombre'>,
  cards: readonly CopyCard[],
): SavedCopy | null {
  let best: { id: string; n: number } | null = null;
  for (const card of cards) {
    let n: number | null = null;
    if (card.basadaEnRutinaId !== undefined && card.basadaEnRutinaId !== null) {
      if (card.basadaEnRutinaId !== source.id) continue;
      n = card.numeroCopia ?? copyNumberFromName(card.nombre);
    } else if (card.nombre.startsWith(`${source.nombre} · v`)) {
      n = copyNumberFromName(card.nombre);
    }
    if (n !== null && (best === null || n > best.n)) best = { id: card.id, n };
  }
  return best ? { id: best.id, label: savedCopyLabel(best.n) } : null;
}

/** La copia que quien mira ya guardó de esta rutina ajena (C2); `null` si no tiene ninguna. */
export function useSavedCopy(routine: Pick<Routine, 'id' | 'nombre' | 'esMia'>): SavedCopy | null {
  const mine = useQuery({
    queryKey: [...routineV2Keys.all, 'saved-copy', routine.id],
    queryFn: () => catalogService.list({ scope: 'mine', q: routine.nombre, limit: 50 }),
    enabled: !routine.esMia,
  });
  if (routine.esMia) return null;
  return pickSavedCopy(routine, mine.data?.items ?? []);
}
