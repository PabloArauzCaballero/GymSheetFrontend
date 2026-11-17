import * as FileSystem from 'expo-file-system/legacy';

/** Where the data export is downloaded before the share sheet takes it. */
export const CACHED_EXPORT_FILE = 'repp-mis-datos.json';

export function cachedExportPath(): string | null {
  return FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}${CACHED_EXPORT_FILE}` : null;
}

/** Best effort: the copy left in the cache by the last download (logout and account closure). */
export async function deleteCachedExport(): Promise<void> {
  const path = cachedExportPath();
  if (!path) return;
  await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => undefined);
}
