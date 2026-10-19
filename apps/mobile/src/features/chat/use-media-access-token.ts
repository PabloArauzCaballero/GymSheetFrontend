import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { accountService } from '@/api/services';
import { isTokenExpiring } from '@/lib/jwt-expiry';
import { secureStoreTokenProvider } from '@/storage/secure-store';

const CHECK_EVERY_MS = 60_000;
const FORCED_REFRESH_COOLDOWN_MS = 30_000;

/**
 * El token con el que se piden fotos, audios y videos del chat.
 *
 * Antes se leía una vez al abrir el chat, pero el token de acceso dura 15 min:
 * con el chat abierto un rato (o al volver de segundo plano) AVPlayer y la
 * imagen pedían con un token vencido, el servidor respondía 401 y la burbuja
 * decía «Este audio ya no está disponible». Ahora se vuelve a leer cada minuto
 * y al volver a la app, y si está por caducar se hace una petición autenticada
 * cualquiera para que el cliente renueve la sesión (una sola renovación
 * compartida) antes de usarlo.
 */
export function useMediaAccessToken() {
  const [token, setToken] = useState<string | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const lastForcedRef = useRef(0);

  const refresh = useCallback((force = false): Promise<void> => {
    if (inFlightRef.current) return inFlightRef.current;
    const now = Date.now();
    if (force && now - lastForcedRef.current < FORCED_REFRESH_COOLDOWN_MS) return Promise.resolve();
    if (force) lastForcedRef.current = now;
    const run = (async () => {
      let current = await secureStoreTokenProvider.getAccessToken();
      if (force || isTokenExpiring(current, Date.now())) {
        try {
          await accountService.getMe();
        } catch {
          // Sin red, el token guardado es lo mejor que hay.
        }
        current = await secureStoreTokenProvider.getAccessToken();
      }
      setToken((previous) => (previous === current ? previous : current));
    })().finally(() => {
      inFlightRef.current = null;
    });
    inFlightRef.current = run;
    return run;
  }, []);

  useEffect(() => {
    void refresh();
    const every = setInterval(() => void refresh(), CHECK_EVERY_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      clearInterval(every);
      subscription.remove();
    };
  }, [refresh]);

  /** Un medio no cargó: casi siempre el token venció entre dos comprobaciones. */
  const onMediaError = useCallback(() => void refresh(true), [refresh]);

  return { token, onMediaError };
}
