'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useState, useSyncExternalStore } from 'react';
import { webPushService } from '@/features/notifications/services/web-push-service';
import { notify } from '@/shared/notifications';
import {
  getBrowserPushSnapshot,
  getServerBrowserPushSnapshot,
  refreshBrowserPush,
  subscribeToBrowserPush,
} from './web-push-browser-store';
import { resolveWebPushState } from './web-push-state';
import {
  SERVICE_WORKER_URL,
  applicationServerKeyFrom,
  normalizeSubscription,
} from './web-push-subscription';

const CONFIG_QUERY_KEY = ['notifications', 'web-push-config'] as const;

export function useWebPush() {
  const browser = useSyncExternalStore(
    subscribeToBrowserPush,
    getBrowserPushSnapshot,
    getServerBrowserPushSnapshot,
  );
  const [pending, setPending] = useState(false);

  const config = useQuery({
    queryKey: CONFIG_QUERY_KEY,
    queryFn: webPushService.getConfig,
    enabled: browser?.supported === true,
    staleTime: 5 * 60 * 1000,
  });

  const subscribe = useCallback(async () => {
    const publicKey = config.data?.publicKey;
    if (!publicKey) return;
    setPending(true);
    try {
      // El permiso se pide AQUÍ y en ningún otro sitio: esta función sólo se
      // llama desde el `onClick` del botón, nunca al montar. Pedirlo al cargar
      // gasta la única oportunidad que da el navegador y lo bloquea para siempre.
      const granted = await Notification.requestPermission();
      if (granted !== 'granted') return;
      await registerSubscription(publicKey);
      notify.success('Avisos activados en este navegador.');
    } catch (error) {
      notify.error(
        error instanceof Error ? error : new Error('No se pudieron activar los avisos.'),
      );
    } finally {
      await refreshBrowserPush();
      setPending(false);
    }
  }, [config.data?.publicKey]);

  const unsubscribe = useCallback(async () => {
    setPending(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration(SERVICE_WORKER_URL);
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        // Primero el backend: mientras la fila siga activa seguiría intentando
        // entregar a un destino que ya no escucha.
        await webPushService.unsubscribe(subscription.endpoint);
        await subscription.unsubscribe();
      }
      notify.success('Avisos desactivados en este navegador.');
    } catch (error) {
      notify.error(
        error instanceof Error ? error : new Error('No se pudieron desactivar los avisos.'),
      );
    } finally {
      await refreshBrowserPush();
      setPending(false);
    }
  }, []);

  return {
    state: resolveWebPushState(browser, config.data),
    pending,
    subscribe,
    unsubscribe,
  };
}

async function registerSubscription(publicKey: string) {
  const registration = await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKeyFrom(publicKey),
  });
  const normalized = normalizeSubscription(subscription);
  if (!normalized) {
    await subscription.unsubscribe();
    throw new Error('El navegador devolvió una suscripción incompleta.');
  }
  try {
    await webPushService.subscribe(normalized);
  } catch (error) {
    // Una suscripción viva en el navegador que el servidor no conoce es peor
    // que ninguna: el usuario vería «activado» y no sonaría nunca.
    await subscription.unsubscribe();
    throw error;
  }
}
