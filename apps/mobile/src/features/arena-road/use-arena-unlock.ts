import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useState } from 'react';
import { arenaToCelebrate, type Road, type RoadArena } from './road';

const ARENA_SEEN_PREFIX = 'arena-road.seen.';

export type ArenaShow = Readonly<{
  arena: RoadArena;
  /**
   * Primera vez que se abre el camino: la arena no se acaba de desbloquear, se
   * presenta. Decir «desbloqueada» a quien lleva meses en ella sería mentir.
   */
  intro: boolean;
}>;

/**
 * Qué arena enseñar a pantalla completa al abrir el camino.
 *
 * Guarda en el Llavero, por cuenta, el número de la última arena vista. Se
 * anota **antes** de enseñar nada (igual que `useLevelUpCelebration`): si se
 * cierra la aplicación a mitad, ya se vio. Si el Llavero falla, no se enseña:
 * el fallo seguro es no celebrar, no celebrar en bucle.
 *
 * `replay` vuelve a abrir la arena actual a petición (pulsación larga).
 */
export function useArenaUnlock(road: Road | null, userId: string | null) {
  const [show, setShow] = useState<ArenaShow | null>(null);
  const currentOrder = road ? road.currentIndex + 1 : null;

  useEffect(() => {
    if (!road || currentOrder === null || currentOrder < 1 || !userId) return;
    let cancelled = false;
    const key = `${ARENA_SEEN_PREFIX}${userId}`;
    void (async () => {
      try {
        const raw = await SecureStore.getItemAsync(key);
        await SecureStore.setItemAsync(key, String(currentOrder));
        if (cancelled) return;
        const seen = raw === null ? null : Number.parseInt(raw, 10);
        const arena = arenaToCelebrate(road, Number.isFinite(seen) ? seen : null);
        if (arena) setShow({ arena, intro: raw === null });
      } catch {
        // Llavero no disponible: sin celebración.
      }
    })();
    return () => {
      cancelled = true;
    };
    // El camino se recalcula en cada refetch; lo que decide es la arena.
  }, [currentOrder, userId]);

  const replay = useCallback(() => {
    const current = road?.arenas[road.currentIndex];
    if (current) setShow({ arena: current, intro: true });
  }, [road]);

  const dismiss = useCallback(() => setShow(null), []);

  return { show, replay, dismiss };
}
