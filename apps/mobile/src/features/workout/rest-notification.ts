import * as Notifications from 'expo-notifications';

/** Marca de la notificación local de fin de descanso (el manejador la reconoce). */
export const REST_NOTIFICATION_KIND = 'rest-end';

let askedThisSession = false;

/**
 * Programa el aviso de fin de descanso (C8.3.3): suena o vibra aunque la
 * pantalla esté bloqueada o la app en segundo plano, que es justo cuando el
 * temporizador de la pantalla no se ve. El permiso se pide la primera vez que
 * hace falta, no al abrir la app. Nunca lanza: sin permiso, el descanso sigue
 * funcionando en pantalla con su háptico.
 */
export async function scheduleRestEnd(seconds: number, body: string): Promise<string | null> {
  if (process.env.EXPO_OS === 'web' || seconds < 1) return null;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status === 'undetermined' && !askedThisSession) {
      askedThisSession = true;
      status = (await Notifications.requestPermissionsAsync()).status;
    }
    if (status !== 'granted') return null;
    return await Notifications.scheduleNotificationAsync({
      content: { title: 'Descanso terminado', body, sound: true, data: { kind: REST_NOTIFICATION_KIND } },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
      },
    });
  } catch {
    return null;
  }
}

export function cancelRestEnd(id: string | null): void {
  if (!id || process.env.EXPO_OS === 'web') return;
  void Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined);
}
