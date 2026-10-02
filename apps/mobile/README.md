# @gymsheet/mobile

Expo (React Native) client for GymSheet — iOS & Android. Consumes the shared
`@gymsheet/*` workspace packages (types, schemas, api-client, auth, domain,
design-tokens, observability) so business logic stays single-sourced with the web app.

**Expo SDK 57** (React Native 0.86, React 19.2.3) — la versión que ejecuta la Expo Go
actual de App Store y Play Store. Ver ADR-010 en `docs/mobile/registro-de-decisiones.md`.

## Requisitos

- Node 22 (`export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`; Node 24 rompe Yarn aquí).
- Yarn 1. Las dependencias del móvil van en `nohoist`, así que se instala desde la raíz:

```bash
yarn install
```

Si falla con `ENOENT … lstat '.../packages/<x>/node_modules/...'`, es la carrera conocida de
symlinks de Yarn 1: repetir `yarn install` y termina bien.

## Probar con Expo Go (iPhone y Android)

1. Instala **Expo Go** desde App Store o Play Store en el teléfono.
2. Levanta el backend (`GymSheetBackend`: `docker compose up -d postgres`, `yarn start:dev`).
   Escucha en `0.0.0.0:3011`, así que el teléfono lo alcanza por la Wi-Fi.
3. `cp .env.example .env` (deja `EXPO_PUBLIC_API_URL` en `localhost`).
4. Arranca Metro en modo Expo Go:

```bash
yarn workspace @gymsheet/mobile go
```

5. Escanea el QR: con la cámara en iPhone, desde Expo Go en Android.

El teléfono tiene que estar **en la misma Wi-Fi que el Mac**. No hay que poner ninguna IP: la
app reutiliza la IP con la que llegó a Metro para hablar con el backend y para cargar las
fotos. Simulador de iOS y emulador de Android funcionan igual (`i` / `a` en la terminal de
Metro).

Si la red bloquea conexiones entre dispositivos (wifi de empresa o de invitados), usa
`yarn workspace @gymsheet/mobile go:tunnel` y pon en `.env` la URL **pública** del backend:
el túnel sólo lleva a Metro, no a la API.

Qué no funciona en Expo Go (por diseño de Expo, no es un fallo): las notificaciones push
remotas (la app se salta el registro allí) y los config plugins nativos de `app.json`. Para
eso están los builds de EAS (abajo).

## Builds de EAS para testers (sin TestFlight)

El perfil `preview` genera builds instalables por enlace, para testers en cualquier país.
Apunta al backend de test en Contabo: `https://repp.api.test.arauzsoftware.com/api/v1`.

```bash
npm i -g eas-cli
```

```bash
eas login
```

iPhone: registrar una vez cada iPhone de tester (el comando da un enlace/QR que el tester
abre en su teléfono). Requiere la cuenta de Apple Developer de pago; máx. 100 iPhones/año.

```bash
eas device:create
```

```bash
eas build --profile preview --platform all
```

Al terminar, EAS da un enlace de instalación por plataforma: Android instala el APK directo;
iPhone sólo en los equipos registrados (un tester nuevo → registrar y recompilar). El
proyecto EAS es `@pablo28809/gymsheet` (`app.json → owner`).

Dos guardas de este perfil:

- `scripts/check-api-url.mjs` **aborta el build** si `EXPO_PUBLIC_API_URL` no responde en
  `/api/v1/health/live`, porque esa dirección queda grabada en el binario.
- El almacén de medios de test se publica por http (`http://gym-media.161.97.85.216.sslip.io`).
  `CLEARTEXT_DOMAINS` en `eas.json` hace que `plugins/with-cleartext-domains.js` permita http
  **sólo** para ese dominio (ATS en iOS, `network_security_config` en Android). Sin esa
  variable las fotos y vídeos no cargarían en el build, aunque en Expo Go sí. No ponerla en el
  perfil `development`: en Android anularía el permiso de debug para hablar con Metro.

`production` (tiendas / TestFlight) sigue apuntando al Funnel de Tailscale
`gymsheet-backend.taila8f993.ts.net`, hoy caído por el cupo de dispositivos de la tailnet.

## Build nativo local

`ios/` y `android/` son salida de `expo prebuild` (están en `.gitignore`). Tras cambiar de SDK
o de `app.json`, regenerarlos antes de `yarn ios` / `yarn android`:

```bash
npx expo prebuild --clean
```

iOS requiere Xcode ≥ 26.4 y como mínimo iOS 16.4.

## Architecture

- `app/` — Expo Router file-based routes. `(auth)` = public group, `(app)` =
  protected group (tab navigator). Guards live in each group's `_layout.tsx`.
- `src/state/auth-store.ts` — Zustand session store; tokens persisted in SecureStore.
- `src/storage/secure-store.ts` — implements the shared `AuthStorage` + `TokenProvider`.
- `src/api/client.ts` — `createApiClient` instance (bearer transport to the backend).
- `src/config/env.ts` — public runtime config and the dev-only `localhost` → LAN rewrite.
- `src/theme` — re-exports `@gymsheet/design-tokens`.

The backend must expose a bearer-token auth flow for mobile (`/auth/login`,
`/auth/me`, `/auth/logout`, refresh). See `docs/mobile/autenticacion.md`.
