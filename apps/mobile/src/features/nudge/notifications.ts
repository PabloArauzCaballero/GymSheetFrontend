import * as Notifications from 'expo-notifications';
import type { PlannedNotification } from './nudge';

const PREFIX = 'repi-';

/**
 * Reprograma las notificaciones locales de Repi: borra las anteriores y pone
 * las del plan. No pide permiso (eso lo hace el registro de push al iniciar
 * sesión); sin permiso no programa nada.
 */
export async function scheduleNudges(planned: readonly PlannedNotification[], enabled: boolean): Promise<void> {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      scheduled
        .filter((item) => item.identifier.startsWith(PREFIX))
        .map((item) => Notifications.cancelScheduledNotificationAsync(item.identifier)),
    );
    if (!enabled) return;
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    await Promise.all(
      planned.map((item) =>
        Notifications.scheduleNotificationAsync({
          identifier: item.id,
          content: { title: item.title, body: item.body, data: { url: item.url, source: 'repi' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date },
        }),
      ),
    );
  } catch {
    // Una notificación que no se pudo programar no debe tumbar nada.
  }
}
