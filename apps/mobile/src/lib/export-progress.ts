import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { env } from '@/config/env';
import { secureStoreTokenProvider } from '@/storage/secure-store';

/**
 * Downloads the workout-history export and hands it to the user as a file.
 *
 * The export endpoint is authenticated, so this cannot be a plain link: the
 * bearer token has to travel in a header, which rules out handing the URL to
 * the browser. It is fetched into the app's cache first and only then written
 * wherever the user chooses.
 *
 * On Android the destination comes from the Storage Access Framework — the
 * system folder picker. That matters: writing silently into the app's private
 * sandbox would report success while leaving the file somewhere the user can
 * never reach, which is indistinguishable from the feature not working.
 */
export type ExportResult =
  | { readonly status: 'saved'; readonly location: string }
  | { readonly status: 'cancelled' }
  | { readonly status: 'unsupported' };

const FILE_NAME = 'gymsheet-avance.csv';

export async function exportWorkoutHistoryCsv(): Promise<ExportResult> {
  const token = await secureStoreTokenProvider.getAccessToken();
  if (!token) throw new Error('Tu sesión expiró. Inicia sesión otra vez.');

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) return { status: 'unsupported' };

  const temporaryUri = `${cacheDirectory}${FILE_NAME}`;
  const download = await FileSystem.downloadAsync(
    `${env.apiUrl}/export/workout-history/csv`,
    temporaryUri,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (download.status !== 200) {
    throw new Error(`El servidor respondió ${download.status} al generar el CSV.`);
  }

  const contents = await FileSystem.readAsStringAsync(download.uri);

  if (Platform.OS !== 'android') {
    // iOS has no folder picker of this kind; the cached file is the result and
    // the caller surfaces its path rather than claiming it was "saved".
    return { status: 'saved', location: download.uri };
  }

  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return { status: 'cancelled' };

  const target = await FileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    FILE_NAME,
    'text/csv',
  );
  await FileSystem.writeAsStringAsync(target, contents);
  return { status: 'saved', location: FILE_NAME };
}
