// API clásica (descargas con cabeceras + Storage Access Framework). Desde SDK 54
// vive en `expo-file-system/legacy`; la API nueva no trae SAF todavía.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { apiClient } from '@/api/client';
import { env } from '@/config/env';
import { secureStoreTokenProvider } from '@/storage/secure-store';
import {
  requestRoutineProgressFile,
  type RoutineProgressExportFilters,
} from './routine-progress-request';

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

type ExportFormat = 'csv' | 'pdf';

const FORMATS = {
  csv: {
    path: '/export/workout-history/csv',
    fileName: 'repp-avance.csv',
    mimeType: 'text/csv',
  },
  pdf: {
    path: '/export/workout-history/pdf',
    fileName: 'repp-avance.pdf',
    mimeType: 'application/pdf',
  },
} as const;

export async function exportWorkoutHistory(format: ExportFormat): Promise<ExportResult> {
  const spec = FORMATS[format];
  const token = await secureStoreTokenProvider.getAccessToken();
  if (!token) throw new Error('Tu sesión expiró. Inicia sesión otra vez.');

  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) return { status: 'unsupported' };

  const temporaryUri = `${cacheDirectory}${spec.fileName}`;
  const download = await FileSystem.downloadAsync(
    `${env.apiUrl}${spec.path}`,
    temporaryUri,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  if (download.status !== 200) {
    throw new Error(`El servidor respondió ${download.status} al generar el archivo.`);
  }

  // El PDF es binario: leerlo como UTF-8 lo corrompe, asi que se transporta en
  // base64 y se escribe con la misma codificacion.
  const encoding =
    format === 'pdf' ? FileSystem.EncodingType.Base64 : FileSystem.EncodingType.UTF8;
  const contents = await FileSystem.readAsStringAsync(download.uri, { encoding });

  // The share sheet first, on both platforms. It is the native way to get a
  // file out of an app on iOS *and* on Android — mail it, send it to the coach,
  // drop it in Drive — and it needs no storage permission at all. The folder
  // picker below stays as the Android fallback for someone who specifically
  // wants the file on disk, and is what keeps iOS from needing its own branch.
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(download.uri, {
      mimeType: spec.mimeType,
      dialogTitle: 'Compartir tu avance',
      UTI: format === 'pdf' ? 'com.adobe.pdf' : 'public.comma-separated-values-text',
    });
    return { status: 'saved', location: spec.fileName };
  }

  if (Platform.OS !== 'android') {
    // No share sheet and no folder picker: the cached path is the honest
    // answer rather than claiming a save that did not happen.
    return { status: 'saved', location: download.uri };
  }

  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return { status: 'cancelled' };

  const target = await FileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    spec.fileName,
    spec.mimeType,
  );
  await FileSystem.writeAsStringAsync(target, contents, { encoding });
  return { status: 'saved', location: spec.fileName };
}

export type { RoutineProgressExportFilters } from './routine-progress-request';

export type RoutineProgressExportResult =
  | { readonly status: 'saved'; readonly fileName: string; readonly recordsCount: number }
  | { readonly status: 'cancelled' }
  | { readonly status: 'unsupported' };

const SAFE_EXPORT_FILE_NAME = /^[\w.-]+\.(xlsx|csv|pdf)$/;

function fallbackExtension(mimeType: string): 'pdf' | 'csv' | 'xlsx' {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('csv')) return 'csv';
  return 'xlsx';
}

/**
 * Descarga y exporta el progreso completo del sistema de rutinas
 * con filtros seleccionados y auditoría en backend.
 */
export async function exportRoutineProgress(
  filters: RoutineProgressExportFilters,
): Promise<RoutineProgressExportResult> {
  const cacheDirectory = FileSystem.cacheDirectory;
  if (!cacheDirectory) return { status: 'unsupported' };

  // Errors arrive as ApiError with the server's own message (e.g. «filtra por
  // rutina o por fechas» when the export is too large), which the wizard shows.
  const data = await requestRoutineProgressFile(apiClient, filters);

  // Never trust a server-provided name as a path: keep it only if it is a
  // plain file name with a known extension (same rule as the web download).
  const fileName = SAFE_EXPORT_FILE_NAME.test(data.fileName)
    ? data.fileName
    : `repp-progreso-rutinas.${fallbackExtension(data.mimeType)}`;
  const temporaryUri = `${cacheDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(temporaryUri, data.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(temporaryUri, {
      mimeType: data.mimeType,
      dialogTitle: 'Descargar progreso de rutinas',
      UTI:
        filters.format === 'pdf'
          ? 'com.adobe.pdf'
          : filters.format === 'csv'
            ? 'public.comma-separated-values-text'
            : 'org.openxmlformats.spreadsheetml.sheet',
    });
    return { status: 'saved', fileName, recordsCount: data.recordsCount };
  }

  if (Platform.OS !== 'android') {
    return { status: 'saved', fileName, recordsCount: data.recordsCount };
  }

  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) return { status: 'cancelled' };

  const target = await FileSystem.StorageAccessFramework.createFileAsync(
    permission.directoryUri,
    fileName,
    data.mimeType,
  );
  await FileSystem.writeAsStringAsync(target, data.base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return { status: 'saved', fileName, recordsCount: data.recordsCount };
}

