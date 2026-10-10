'use client';

import { useQuery } from '@tanstack/react-query';
import { copyNumberFromName, savedCopyLabel } from '@gymsheet/hooks';
import type { Routine } from '@gymsheet/types';
import { catalogService } from '@/features/routines-v2/services';
import { routineV2Keys } from '@/features/routines-v2/keys';

export type SavedCopy = { id: string; label: string };

/**
 * La copia más reciente («· vN») que quien mira ya guardó de esta rutina ajena
 * (C2): se busca en «Mías» por el nombre del original. `null` si no tiene ninguna.
 */
export function useSavedCopy(routine: Pick<Routine, 'id' | 'nombre' | 'esMia'>): SavedCopy | null {
  const prefix = `${routine.nombre} · v`;
  const mine = useQuery({
    queryKey: [...routineV2Keys.all, 'saved-copy', routine.id],
    queryFn: () => catalogService.list({ scope: 'mine', q: routine.nombre, limit: 50 }),
    enabled: !routine.esMia,
  });
  if (routine.esMia) return null;
  let best: { id: string; n: number } | null = null;
  for (const card of mine.data?.items ?? []) {
    if (!card.nombre.startsWith(prefix)) continue;
    const n = copyNumberFromName(card.nombre);
    if (n !== null && (best === null || n > best.n)) best = { id: card.id, n };
  }
  return best ? { id: best.id, label: savedCopyLabel(best.n) } : null;
}
