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

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.['apiUrl'] as string | undefined);

export const env = {
  apiUrl: required('EXPO_PUBLIC_API_URL', apiUrl),
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
