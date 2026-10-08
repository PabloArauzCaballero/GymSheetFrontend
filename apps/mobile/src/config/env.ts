import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Public runtime configuration. Only EXPO_PUBLIC_* values are safe to embed in
 * the bundle — no secrets. The backend remains the authorization authority.
 */
type Environment = 'development' | 'staging' | 'production';

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}.`);
  }
  return value;
}

const LOOPBACK = /^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/;

/**
 * El host desde el que Metro sirve el bundle, tal como lo ve este dispositivo
 * (p. ej. `192.168.0.192` en `192.168.0.192:8081`). Sólo existe en desarrollo, y
 * sólo vale si es una IP: con `--tunnel` es un dominio de Expo que reenvía a
 * Metro, no al backend.
 */
function metroHostIp(): string | null {
  if (!__DEV__) return null;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ? host : null;
}

/**
 * `localhost` significa cosas distintas en cada dispositivo.
 *
 * Un iPhone o Android físico con Expo Go, o el emulador de Android, tienen su
 * propio `localhost`: apuntar ahí es el error más común al levantar el entorno,
 * y se manifiesta como un fallo de red en el acceso — que parece un defecto de
 * la aplicación. Pero el dispositivo **ya** alcanza al Mac: acaba de descargar
 * el bundle de Metro desde su IP de LAN. Así que en desarrollo se reutiliza esa
 * misma IP para el backend, y el `.env` puede quedarse en `localhost` para
 * todos: simulador, emulador y cualquier teléfono en la misma Wi-Fi, a la vez y
 * contra el mismo Metro, sin editar nada al cambiar de red o de dispositivo.
 *
 * Sin IP de Metro (build de release, o `--tunnel`), el emulador de Android
 * sigue necesitando la traducción a `10.0.2.2`, que es como ve al anfitrión.
 *
 * Sólo se toca `localhost`/`127.0.0.1`: una IP de LAN o un host público llegan
 * intactos, porque ésos ya son alcanzables tal cual.
 */
function forDevice(url: string): string {
  if (!LOOPBACK.test(url)) return url;
  const lanHost = metroHostIp();
  if (lanHost) return url.replace(LOOPBACK, `$1${lanHost}`);
  if (Platform.OS === 'android') return url.replace(LOOPBACK, '$110.0.2.2');
  return url;
}

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.['apiUrl'] as string | undefined);

const configuredApiUrl = required('EXPO_PUBLIC_API_URL', apiUrl);
const deviceApiUrl = forDevice(configuredApiUrl);

/**
 * Si la dirección del backend se reescribió para este dispositivo, el backend
 * local sigue sin saberlo: las URL absolutas que devuelve —fotos de perfil,
 * stories— salen con su `MEDIA_STORAGE_PUBLIC_BASE_URL`, que en local es
 * `localhost`. El cliente API aplica este mismo cambio a sus respuestas para
 * que esas imágenes carguen también en un teléfono. `null` fuera de ese caso.
 */
export const loopbackRewrite: { readonly from: readonly string[]; readonly to: string } | null =
  deviceApiUrl === configuredApiUrl
    ? null
    : (() => {
        const { port, protocol } = new URL(configuredApiUrl);
        const suffix = port ? `:${port}` : '';
        return {
          from: [`${protocol}//localhost${suffix}`, `${protocol}//127.0.0.1${suffix}`],
          to: new URL(deviceApiUrl).origin,
        };
      })();

export const env = {
  apiUrl: deviceApiUrl,
  environment: (process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development') as Environment,
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? null,
  /**
   * Gimnasio al que pertenece esta compilación.
   *
   * En móvil la marca se fija al compilar y no por petición: cada gimnasio
   * publica su propia aplicación, con su nombre y su icono en la tienda. Un id
   * desconocido cae en la identidad de referencia en vez de romper el arranque,
   * porque quedarse sin interfaz es peor que mostrar la marca genérica.
   */
  tenantId:
    process.env.EXPO_PUBLIC_TENANT ??
    (Constants.expoConfig?.extra?.['tenantId'] as string | undefined) ??
    null,
};
