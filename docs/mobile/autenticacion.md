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
- `login()` → `POST /auth/login` → guarda `{accessToken, refreshToken}` en SecureStore.
- `logout()` → `POST /auth/logout` (best-effort) + limpieza local siempre.
- Guardas de ruta en `app/(auth)/_layout.tsx` y `app/(app)/_layout.tsx`. `app/index.tsx`
  muestra un loader durante la hidratación para **no** exponer rutas privadas antes de validar.
- `onUnauthorized` del cliente limpia tokens ante un 401; el store redirige a `/login`.

## Requisitos del backend (NestJS)

Para habilitar clientes móviles sin debilitar el flujo web:

1. Endpoints de emisión por bearer: `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
2. **Refresh token rotativo** + `POST /auth/refresh`; definir expiración del access token.
3. Revocación de sesión remota (logout multi-dispositivo).
4. Roles/permisos idénticos a la web (backend = autoridad; el cliente solo hace gating de UI
   con `@gymsheet/domain`).
5. Nunca confiar en validaciones del cliente.

## Criterios de aceptación

- Login/logout funcionales; sesión persistente al reiniciar; refresh operativo.
- Token vencido redirige correctamente; los 401 no provocan bucles infinitos.
- Roles y permisos coinciden con la web; tokens solo en SecureStore.
