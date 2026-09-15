import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ProgressionLevel } from '@gymsheet/schemas';

/* -------------------------------------------------------------------------- */
/* Detección de subida de nivel                                                */
/* -------------------------------------------------------------------------- */

/**
 * `gymsheet.progression.level.v1.<userId>` — el último rango visto.
 *
 * Por usuario, porque dos cuentas en el mismo teléfono no comparten senda, y
 * versionado, porque si algún día el formato cambia hay que poder ignorar lo
 * guardado sin celebrar ocho ascensos de golpe.
 */
const LEVEL_SEEN_PREFIX = 'gymsheet.progression.level.v1.';

interface SeenLevel {
  code: string;
  sortOrder: number;
}

/** Sin `any`: lo leído del almacén es `unknown` hasta que se demuestre lo contrario. */
function parseSeenLevel(raw: string): SeenLevel | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as Partial<Record<keyof SeenLevel, unknown>>;
    if (typeof candidate.code !== 'string' || typeof candidate.sortOrder !== 'number') return null;
    return { code: candidate.code, sortOrder: candidate.sortOrder };
  } catch {
    return null;
  }
}

/**
 * Detecta la subida de rango **en el cliente**, y conviene saber por qué.
 *
 * El contrato `progressionSchema` trae `unlockedNow` para las insignias: el
 * servidor sabe cuáles acabas de conseguir y el cliente las confirma con
 * `acknowledge`. Para los niveles no hay nada equivalente. `level` describe
 * dónde estás, no que acabes de llegar, así que desde la respuesta es
 * imposible distinguir «has subido a Intermedio ahora mismo» de «llevas tres
 * meses en Intermedio».
 *
 * Se resuelve aquí y no en el backend a propósito: hay un conflicto de ramas
 * abierto sobre ese contrato y ampliarlo ahora lo empeora. Así que se guarda en
 * SecureStore el último `code` visto por esa cuenta y se compara.
 *
 * **Lo que esto no puede hacer, y que el servidor sí haría:**
 *
 * - Reinstalar la aplicación o cambiar de teléfono borra el recuerdo, y el
 *   primer arranque no celebra nada (ver abajo). Un ascenso puede perderse.
 * - Sólo se entera el dispositivo que estaba abierto: si subes de rango y abres
 *   la senda en la tableta, el móvil no lo celebrará nunca.
 * - No sabe **cuándo** ocurrió, así que no puede decir «ayer subiste».
 *
 * Lo correcto en el servidor sería un `levelUnlockedNow: progressionLevelSchema
 * .nullable()` en `progressionSchema`, poblado igual que `unlockedNow` desde la
 * tabla de ascensos, y que la llamada `acknowledge` ya existente lo consuma.
 * Son dos campos y ninguna tabla nueva; sólo no es este el momento de tocarlo.
 *
 * **La primera vez no se celebra.** Se anota el rango actual y se calla. Alguien
 * que lleva medio año en la aplicación e instala esta versión no ha ascendido
 * hoy, y abrirle una celebración a pantalla completa por un rango que ya tenía
 * convertiría la función en una mentira desde el primer día.
 */
export function useLevelUpCelebration(
  level: ProgressionLevel | null,
  userId: string | null,
): { pendingLevel: ProgressionLevel | null; dismissLevelUp: () => void } {
  const [pendingLevel, setPendingLevel] = useState<ProgressionLevel | null>(null);

  // La consulta devuelve un objeto nuevo en cada refetch; lo que identifica un
  // rango es su código y su orden. El objeto se lee de la referencia para no
  // releer el Llavero cada vez que react-query refresca en segundo plano.
  const levelRef = useRef(level);
  levelRef.current = level;

  const code = level?.code ?? null;
  const sortOrder = level?.sortOrder ?? null;

  useEffect(() => {
    const current = levelRef.current;
    if (!current || code === null || sortOrder === null || !userId) return;

    let cancelled = false;
    const key = `${LEVEL_SEEN_PREFIX}${userId}`;

    void (async () => {
      try {
        const raw = await SecureStore.getItemAsync(key);
        // Se anota **antes** de decidir: si la persona cierra la aplicación con
        // la celebración en pantalla, ya la ha visto, y repetirla mañana la
        // convertiría en ruido. Es el mismo criterio que `acknowledge` usa para
        // las insignias.
        await SecureStore.setItemAsync(key, JSON.stringify({ code, sortOrder }));
        if (cancelled || raw === null) return;

        const seen = parseSeenLevel(raw);
        if (!seen || seen.code === code) return;
        // Sólo hacia arriba. Un rango distinto y **más bajo** no es un ascenso:
        // es que el gimnasio ha reordenado su catálogo, y celebrar un descenso
        // sería peor que no celebrar nada.
        if (sortOrder > seen.sortOrder) setPendingLevel(current);
      } catch {
        // El Llavero puede fallar (dispositivo bloqueado al arrancar). No
        // celebrar es el fallo seguro: lo contrario es celebrar en bucle.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code, sortOrder, userId]);

  const dismissLevelUp = useCallback(() => setPendingLevel(null), []);

  return { pendingLevel, dismissLevelUp };
}

/**
 * Anota un rango como ya celebrado fuera de la senda, p. ej. en el resumen de
 * sesión. Sin esto, la senda compararía con el rango anterior guardado y
 * volvería a abrir la misma carta de ascenso.
 */
export async function markLevelSeen(userId: string, level: ProgressionLevel): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      `${LEVEL_SEEN_PREFIX}${userId}`,
      JSON.stringify({ code: level.code, sortOrder: level.sortOrder }),
    );
  } catch {
    // Llavero no disponible: en el peor caso la senda repite la carta una vez.
  }
}
