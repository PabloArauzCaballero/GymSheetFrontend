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
};
