import * as FileSystem from "expo-file-system/legacy";
import {
  dehydrate,
  hydrate,
  type DehydratedState,
  type QueryClient,
} from "@tanstack/react-query";

/**
 * Caché en disco del catálogo de ejercicios.
 *
 * Sin esto cada arranque en frío vuelve a pedir el catálogo y la ficha parte de
 * un esqueleto. Solo se guardan las consultas del catálogo (ejercicios, zonas,
 * músculos): son públicas y casi no cambian. Lo propio de la persona (perfil,
 * rutinas, sesiones) nunca toca el disco. Al arrancar se rehidrata y la pantalla
 * pinta al instante; TanStack las revalida en segundo plano porque llegan
 * «viejas» (stale-while-revalidate).
 */
const FILE = `${FileSystem.cacheDirectory ?? ""}gymsheet-catalog-cache-v1.json`;
const BUSTER = "catalog-v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const WRITE_DELAY_MS = 2_000;
/** Primer elemento de la clave de las consultas que se guardan. */
const PERSISTED_ROOTS: ReadonlySet<string> = new Set([
  "exercise",
  "exercises",
  "muscle",
  "muscles",
]);

/** Dentro de `exercises`: lo que depende de la persona (búsquedas con ☆, recientes) no se guarda. */
const PERSONAL_SUBKEYS: ReadonlySet<string> = new Set(["search", "shortcuts"]);

function isPersistable(queryKey: readonly unknown[]): boolean {
  return (
    PERSISTED_ROOTS.has(String(queryKey[0])) &&
    !PERSONAL_SUBKEYS.has(String(queryKey[1]))
  );
}

type Snapshot = { buster: string; savedAt: number; state: DehydratedState };

/** Que el catálogo sobreviva a la recolección de basura el tiempo que vive en disco. */
export function configureCatalogCache(client: QueryClient): void {
  for (const root of PERSISTED_ROOTS)
    client.setQueryDefaults([root], { gcTime: MAX_AGE_MS });
}

export async function restoreCatalogCache(client: QueryClient): Promise<void> {
  try {
    const raw = await FileSystem.readAsStringAsync(FILE);
    const snapshot = JSON.parse(raw) as Snapshot;
    if (
      snapshot.buster !== BUSTER ||
      Date.now() - snapshot.savedAt > MAX_AGE_MS
    ) {
      await clearCatalogCache();
      return;
    }
    hydrate(client, snapshot.state);
  } catch {
    // Sin archivo o ilegible: se parte de cero, que es lo de siempre.
  }
}

export async function clearCatalogCache(): Promise<void> {
  try {
    await FileSystem.deleteAsync(FILE, { idempotent: true });
  } catch {
    // Nada que borrar.
  }
}

/** Guarda la caché del catálogo en disco, como mucho una vez cada 2 s. Devuelve la baja. */
export function persistCatalogCache(client: QueryClient): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const write = () => {
    timer = null;
    const state = dehydrate(client, {
      shouldDehydrateQuery: (query) =>
        query.state.status === "success" && isPersistable(query.queryKey),
    });
    if (state.queries.length === 0) return;
    const snapshot: Snapshot = { buster: BUSTER, savedAt: Date.now(), state };
    void FileSystem.writeAsStringAsync(FILE, JSON.stringify(snapshot)).catch(
      () => undefined,
    );
  };
  const unsubscribe = client.getQueryCache().subscribe((event) => {
    if (event.type !== "updated" || event.action.type !== "success") return;
    if (!isPersistable(event.query.queryKey)) return;
    if (timer === null) timer = setTimeout(write, WRITE_DELAY_MS);
  });
  return () => {
    unsubscribe();
    if (timer !== null) clearTimeout(timer);
  };
}
