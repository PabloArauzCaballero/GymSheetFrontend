import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { apiClient } from '@/api/client';
import { env } from '@/config/env';
import { secureStoreTokenProvider } from '@/storage/secure-store';
import { cachedExportPath, deleteCachedExport } from '@/storage/cached-export';
import { accountExportStatusSchema } from '@gymsheet/schemas';

async function download(downloadPath: string, target: string) {
  const token = await secureStoreTokenProvider.getAccessToken();
  if (!token) throw new Error('Tu sesión expiró. Inicia sesión otra vez.');
  return FileSystem.downloadAsync(`${env.apiUrl}${downloadPath}`, target, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
}

/**
 * Downloads the account copy (authenticated, so never a plain link) into the
 * cache and hands it to the platform share sheet: Files, Drive, mail. The
 * cached copy is overwritten by the next download and deleted at logout and
 * account closure (`deleteCachedExport`); deleting it right after the sheet resolves
 * could pull the file from under the receiving app on Android.
 * `false` when this device cannot share files.
 */
export async function shareAccountExport(exportId: string, downloadPath: string): Promise<boolean> {
  const target = cachedExportPath();
  if (!target || !(await Sharing.isAvailableAsync())) return false;
  let result = await download(downloadPath, target);
  if (result.status === 401) {
    // Through the shared client once: it renews the session (or ends it).
    await apiClient.request(`/me/export/${encodeURIComponent(exportId)}`, accountExportStatusSchema, { method: 'GET' });
    result = await download(downloadPath, target);
  }
  if (result.status !== 200) {
    await deleteCachedExport();
    throw new Error('No pudimos descargar tu copia. Inténtalo de nuevo.');
  }
  await Sharing.shareAsync(result.uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Guardar mis datos' });
  return true;
}

export { deleteCachedExport };
