import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { deviceTokenService } from '@/api/services';

/**
 * Notificaciones push reales (Android primero; iOS necesita además un perfil
 * de aprovisionamiento con la capacidad Push habilitada, pendiente).
 *
 * El flujo: pedir permiso -> pedir el token de Expo (que internamente registra
 * el dispositivo contra FCM/APNs con las credenciales de EAS) -> mandárselo al
 * backend. Nunca lanza: un fallo aquí no debe tumbar el arranque de la app ni
 * bloquear el login, solo significa que ese dispositivo no recibirá push.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function resolveProjectId(): Promise<string | undefined> {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId
  );
}

/**
 * Expo Go no puede recibir push remotas (Android lo quitó en SDK 53 y desde SDK
 * 55 pedir el token **lanza**). Allí la app se prueba sin push; las builds de
 * EAS —TestFlight incluida— sí las registran.
 */
function pushUnavailable(): boolean {
  return !Device.isDevice || isRunningInExpoGo();
}

export async function registerForPushNotifications(): Promise<void> {
  // Un emulador/simulador sin Google Play Services no tiene forma de recibir push
  // real; pedir el token igual solo produce un error de "no physical device".
  if (pushUnavailable()) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  try {
    const projectId = await resolveProjectId();
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await deviceTokenService.register({
      expoPushToken,
      platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    });
  } catch {
    // Sin conexión, backend caído, o el proyecto de EAS no tiene credenciales de
    // push configuradas todavía: la app sigue funcionando sin push, no es un
    // error que deba interrumpir al usuario.
  }
}

/**
 * Baja del dispositivo al cerrar sesión.
 *
 * Hay que llamarla ANTES de borrar los tokens de la sesión: el endpoint exige
 * el bearer, y sin él la baja se pierde en silencio. Sin esto, un teléfono que
 * cierra sesión y en el que nadie más entra sigue sonando con los avisos de la
 * cuenta anterior — el alta en el siguiente inicio de sesión traslada el token,
 * pero solo cuando ese siguiente inicio ocurre.
 */
export async function unregisterPushNotifications(): Promise<void> {
  if (pushUnavailable()) return;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return;
    const projectId = await resolveProjectId();
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    await deviceTokenService.unregister(expoPushToken);
  } catch {
    // Igual que el alta: cerrar sesión nunca puede fallar por esto.
  }
}
