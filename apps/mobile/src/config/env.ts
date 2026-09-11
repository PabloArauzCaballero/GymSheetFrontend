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

/**
 * `localhost` significa cosas distintas en cada emulador.
 *
 * El simulador de iOS comparte la red del Mac, así que `localhost` es el Mac y
 * funciona tal cual. El emulador de Android **no**: corre en una máquina
 * virtual con su propia pila de red, donde `localhost` es el propio emulador y
 * el anfitrión se ve en la dirección reservada `10.0.2.2`. Apuntar ahí un
 * `localhost` es el error más común al levantar el entorno, y se manifiesta
 * como un fallo de red en el acceso — que parece un defecto de la aplicación.
 *
 * El `.env.example` dedicaba un párrafo a explicar cuál poner en cada caso, lo
 * que obliga a editar el fichero —y a reiniciar Metro— cada vez que se cambia
 * de plataforma, y hace imposible tener las dos abiertas contra el mismo Metro,
 * que es justo lo que se hace al comprobar paridad. La traducción es mecánica y
 * siempre la misma, así que la hace el código.
 *
 * Sólo se toca `localhost`/`127.0.0.1`: una IP de LAN o un host de staging
 * llegan intactos, porque ésos ya son alcanzables desde el emulador.
 */
function forEmulator(url: string): string {
  if (Platform.OS !== 'android') return url;
  return url.replace(/^(https?:\/\/)(localhost|127\.0\.0\.1)(?=[:/]|$)/, '$110.0.2.2');
}

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.['apiUrl'] as string | undefined);

export const env = {
  apiUrl: forEmulator(required('EXPO_PUBLIC_API_URL', apiUrl)),
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
