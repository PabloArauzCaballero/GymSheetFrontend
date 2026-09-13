import { useEffect } from 'react';
import { useAuthStore } from '@/state/auth-store';
import { registerForPushNotifications } from './push';

/**
 * Sin UI. Pide permiso de notificaciones y registra el token de Expo en cuanto
 * hay sesión — no antes, porque el endpoint de registro requiere el bearer
 * token, y no tiene sentido pedirle permiso al usuario antes de que exista una
 * cuenta a la que asociar el dispositivo.
 */
export function PushRegistration() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void registerForPushNotifications();
  }, [status]);

  return null;
}
