# @gymsheet/mobile

Expo (React Native) client for GymSheet — iOS & Android. Consumes the shared
`@gymsheet/*` workspace packages (types, schemas, api-client, auth, domain,
design-tokens, observability) so business logic stays single-sourced with the web app.

## Requirements

Native toolchain is required to build/run: Xcode (iOS) and Android Studio + SDK
(Android), Node 20+, Yarn 1, and the EAS CLI (`npm i -g eas-cli`) for cloud builds.

## Install

Mobile dependencies are `nohoist`ed (React Native pins exact React versions), so
install from the repo root:

```bash
yarn install
```

## Run

```bash
cp .env.example .env            # set EXPO_PUBLIC_API_URL
yarn workspace @gymsheet/mobile start      # Metro + dev menu
yarn workspace @gymsheet/mobile ios        # iOS simulator (macOS)
yarn workspace @gymsheet/mobile android    # Android emulator
```

## Architecture

- `app/` — Expo Router file-based routes. `(auth)` = public group, `(app)` =
  protected group (tab navigator). Guards live in each group's `_layout.tsx`.
- `src/state/auth-store.ts` — Zustand session store; tokens persisted in SecureStore.
- `src/storage/secure-store.ts` — implements the shared `AuthStorage` + `TokenProvider`.
- `src/api/client.ts` — `createApiClient` instance (bearer transport to the backend).
- `src/theme` — re-exports `@gymsheet/design-tokens`.

The backend must expose a bearer-token auth flow for mobile (`/auth/login`,
`/auth/me`, `/auth/logout`, refresh). See `docs/mobile/autenticacion.md`.
