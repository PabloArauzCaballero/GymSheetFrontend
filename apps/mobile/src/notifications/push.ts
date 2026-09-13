import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
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
    shouldShowAlert: true,
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

export async function registerForPushNotifications(): Promise<void> {
  // Un emulador/simulador sin Google Play Services no tiene forma de recibir push
  // real; pedir el token igual solo produce un error de "no physical device".
  if (!Device.isDevice) return;

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
