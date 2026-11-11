# Autenticación multiplataforma

## Problema

La web usa una cookie **HttpOnly** emitida por el BFF (el JWT nunca llega a JS). Una app
móvil no puede depender de cookies de navegador ni de middleware de Next: necesita
**SecureStore**, refresh token, recuperación de sesión y manejo de expiración.

## Estrategia: un contrato, dos adaptadores

`@gymsheet/auth` define el contrato `AuthStorage` que cada plataforma implementa:

```ts
export interface AuthStorage {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  saveTokens(accessToken: string, refreshToken: string): Promise<void>;
  clearTokens(): Promise<void>;
}
```

| Plataforma | Implementación | Notas |
|---|---|---|
| Web | `cookieAuthStorage` (no-op) | El BFF gestiona la cookie HttpOnly; JS nunca ve el token |
| Móvil | `secureStoreAuthStorage` | Expo SecureStore (Keychain / Keystore). Prohibido AsyncStorage/Web Storage |

`@gymsheet/api-client` recibe el token vía `TokenProvider` (abstracción), de modo que el
cliente nunca toca el almacenamiento directamente.

## Flujo móvil (implementado en `apps/mobile`)

- `src/state/auth-store.ts` (Zustand): `hydrate()`, `login()`, `logout()`.
- `hydrate()` al arrancar: si hay access token → `GET /auth/me` para recuperar la sesión;
  si falla, limpia tokens y marca `unauthenticated` (recuperación de sesión + expiración).
- `login()` → `POST /auth/login` → guarda `{accessToken, refreshToken}` en SecureStore y la
  última cuenta conocida (`principalCache`) para poder abrir sin señal.
- `logout()` → `POST /auth/logout` con el `refreshToken` (revoca la sesión en el servidor,
  best-effort) + limpieza local siempre.

### Sesión larga con renovación automática (11/11/2026)

- El access token dura 15 min; el refresh token es de un solo uso y el backend lo rota en
  cada `POST /auth/refresh`. La sesión vence tras **90 días sin uso** (ventana deslizante).
- `createSessionRefresher` (`@gymsheet/auth`) hace **un solo canje a la vez**: reusar un
  refresh token revoca la sesión en el servidor, así que el 401 y la renovación al volver a
  la app comparten el mismo canje.
- `@gymsheet/api-client` (`refreshSession`): ante un 401 renueva y reintenta una vez. Solo un
  rechazo del servidor (400/401/403) cierra la sesión; sin señal o con 5xx se conserva.
- `startSessionKeepAlive` renueva 2 min antes de que venza el access token y al volver a
  primer plano.
- `hydrate()` sin señal entra con la última cuenta conocida en vez de mandar al login.

### Desbloqueo con Face ID / huella

- `expo-local-authentication` (versión del SDK 53). iPhone: Face ID (o Touch ID); Android:
  huella. Solo biometría, sin código del teléfono como alternativa (`disableDeviceFallback`).
- Se activa en Ajustes → Seguridad (exige pasar la biometría una vez).
- Bloquea al abrir con la sesión guardada y al volver tras 2 min en segundo plano; nunca
  justo después de escribir la contraseña. «Usar otra cuenta» cierra la sesión.
- Guardas de ruta en `app/(auth)/_layout.tsx` y `app/(app)/_layout.tsx`. `app/index.tsx`
  muestra un loader durante la hidratación para **no** exponer rutas privadas antes de validar.
- `onUnauthorized` del cliente limpia tokens ante un 401; el store redirige a `/login`.

## Requisitos del backend (NestJS)

Para habilitar clientes móviles sin debilitar el flujo web:

1. Endpoints de emisión por bearer: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
2. ~~**Refresh token rotativo** + `POST /auth/refresh`~~ — **hecho** (backend SEC-02,
   11/11/2026): access 15 min, sesión 90 días sin uso, reuso → sesión revocada.
3. Revocación de sesión remota (logout multi-dispositivo). `POST /auth/logout` ya revoca la
   sesión del dispositivo; falta «cerrar en todos».
4. Roles/permisos idénticos a la web (backend = autoridad; el cliente solo hace gating de UI
   con `@gymsheet/domain`).
5. Nunca confiar en validaciones del cliente.

## Criterios de aceptación

- Login/logout funcionales; sesión persistente al reiniciar; refresh operativo.
- Token vencido redirige correctamente; los 401 no provocan bucles infinitos.
- Roles y permisos coinciden con la web; tokens solo en SecureStore.
