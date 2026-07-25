# GymSheet (monorepo)

Monorepo Yarn Workspaces + Turborepo. Dos apps que comparten lógica vía `packages/*`:

- `apps/web` — Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind. El
  navegador consume únicamente rutas BFF `/api/*`; el JWT permanece en cookie HttpOnly y el
  backend NestJS hermano es la autoridad de autorización.
- `apps/mobile` — Expo (React Native), iOS & Android. Token bearer en Expo SecureStore.
- `packages/*` — `types, schemas, api-client, domain, auth, design-tokens, observability,
  tsconfig`. Fuente única de verdad de la lógica; **no** importan desde `apps/*`.

## Validación

- Núcleo (verificado): `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile`
  y `yarn workspace @gymsheet/web build`.
- Móvil requiere toolchain nativo; `yarn workspace @gymsheet/mobile type-check` valida tipos.
- Usa Yarn 1. TypeScript estricto en todo el monorepo.

## Reglas

- No mezclar mocks con runtime.
- No almacenar tokens en Web Storage (web) ni en AsyncStorage sin cifrar (móvil): usar cookie
  HttpOnly (web) / SecureStore (móvil).
- No afirmar E2E sin backend y PostgreSQL activos.
- La lógica compartida (contratos, schemas, cliente API, dominio, auth) vive en `packages/*`;
  la web la consume mediante barriles de re-export en `@/shared/*` para evitar regresiones.
