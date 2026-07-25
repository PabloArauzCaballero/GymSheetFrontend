# Arquitectura del monorepo

```text
GymSheetFrontend/
├── apps/
│   ├── web/      Next.js 16 (App Router) — sin cambios funcionales
│   └── mobile/   Expo (React Native) — iOS & Android
├── packages/
│   ├── types/           Contratos y enums (fuente única de verdad)
│   ├── schemas/         Validación Zod + schemas de formularios
│   ├── api-client/      ApiError + cliente HTTP transport-agnóstico + TokenProvider
│   ├── domain/          Formateadores + políticas de permisos
│   ├── auth/            AuthStorage, SessionState, guards
│   ├── design-tokens/   Colores, spacing, radios, tipografía
│   ├── observability/   Logger, analítica, redacción de datos sensibles
│   └── tsconfig/        Configuraciones TS base/library/next/expo
├── package.json         Yarn Workspaces + scripts turbo
├── turbo.json           Pipeline de tareas (build/lint/test/type-check)
└── tsconfig.base.json   Config TypeScript raíz
```

## Principios

1. **Compartir lógica, no UI.** Tipos, validaciones, cliente API, dominio, auth y tokens se
   comparten; cada plataforma implementa su propia interfaz (DOM/Tailwind vs. React Native).
2. **Fuente única de verdad.** La lógica vive en `packages/*`. La web la consume mediante
   barriles de re-export para evitar churn de imports y regresiones.
3. **Backend único.** NestJS sigue siendo la autoridad de autorización para ambas apps.
4. **Sin dependencias de `apps` en `packages`.** Grafo acíclico (ver `mapa-dependencias.md`).

## Transporte de API por plataforma

`@gymsheet/api-client` expone `createApiClient({ baseUrl, tokenProvider, onUnauthorized })`
que honra el contrato del backend (envelope `{ ok, data }` + problem+json) de forma idéntica:

- **Web**: mantiene su cliente BFF (`fetch('/api/backend' + path)`, cookie HttpOnly,
  `same-origin`). El token nunca llega a JavaScript.
- **Móvil**: `createApiClient` con `baseUrl` = backend directo y `TokenProvider` sobre
  SecureStore (Authorization: Bearer). `onUnauthorized` limpia tokens y fuerza re-login.

## Tooling

- **Turborepo** orquesta `build`, `lint`, `test`, `type-check`, `source-check` con caché.
- **TypeScript** estricto en todo el monorepo (`tsconfig.base.json`).
- **ESLint**: config raíz (typescript-eslint) para `packages/*`; `apps/web` conserva la
  config de Next; `apps/mobile` usa `expo lint`.

## Estado de validación

- `apps/web`: `type-check`, `test` (21 ✅), `build` ✅ — sin regresiones tras la migración.
- `packages/*`: `type-check` ✅ y `lint` ✅.
- `apps/mobile`: requiere toolchain nativo (Xcode/Android SDK) para compilar; validación
  de tipos en CI (`mobile-validate`) y builds vía EAS (`.github/workflows/mobile-release.yml`).
