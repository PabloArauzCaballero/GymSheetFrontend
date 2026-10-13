import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { sessionPrincipalSchema } from '@gymsheet/schemas';
import { z } from 'zod';
import { apiClient } from '@/api/client';
import { env } from '@/config/env';
import { secureStoreTokenProvider } from '@/storage/secure-store';
import { calendarUid } from './calendar-ics-contract';

const uuidSchema = z.string().uuid();
const maxIcsLength = 128 * 1024;

async function fetchCalendar(inviteId: string, token: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(`${env.apiUrl}/me/training-invitations/${inviteId}/calendar.ics`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'text/calendar' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

/** Downloads only the server-authored event; the UID is never generated locally. */
export async function shareTrainingInvitationCalendar(inviteId: string): Promise<string> {
  const id = uuidSchema.parse(inviteId);
  let token = await secureStoreTokenProvider.getAccessToken();
  if (!token) throw new Error('Tu sesión expiró. Inicia sesión otra vez.');

  let response = await fetchCalendar(id, token);
  if (response.status === 401) {
    // Route through the shared client: it serializes refresh-token rotation and
    // applies the usual session-lost behavior if renewal fails.
    await apiClient.request('/auth/me', sessionPrincipalSchema, { method: 'GET' });
    token = await secureStoreTokenProvider.getAccessToken();
    if (!token) throw new Error('Tu sesión expiró. Inicia sesión otra vez.');
    response = await fetchCalendar(id, token);
  }
  if (!response.ok) {
    throw new Error(`No se pudo obtener el evento (HTTP ${response.status}).`);
  }
  if (!(response.headers.get('content-type') ?? '').toLowerCase().includes('text/calendar')) {
    throw new Error('El servidor no devolvió un archivo de calendario.');
  }
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > maxIcsLength) throw new Error('El evento de calendario es demasiado grande.');
  const ics = await response.text();
  if (ics.length > maxIcsLength) throw new Error('El evento de calendario es demasiado grande.');
  const uid = calendarUid(ics);

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('Este dispositivo no permite compartir el archivo de calendario.');
  }
  if (!FileSystem.cacheDirectory) {
    throw new Error('No se pudo preparar el archivo de calendario.');
  }
  // The same invite overwrites the same cache file. An external calendar may
  // use the server's stable UID to update an event, but import is user-driven.
  const uri = `${FileSystem.cacheDirectory}gymsheet-encuentro-${id}.ics`;
  await FileSystem.writeAsStringAsync(uri, ics, { encoding: FileSystem.EncodingType.UTF8 });
  try {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/calendar',
      UTI: 'com.apple.ical.ics',
      dialogTitle: 'Compartir evento de entrenamiento',
    });
  } finally {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
  return uid;
}
