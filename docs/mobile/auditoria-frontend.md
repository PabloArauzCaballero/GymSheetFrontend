# Auditoría del frontend (Fase 0)

Auditoría técnica del frontend GymSheet previa a la incorporación de la app móvil.
Base: 164 archivos TypeScript, Next.js 16 (App Router), React 19, Tailwind 4, Yarn 1.

## Arquitectura actual

Arquitectura por features con una capa `shared` transversal:

- `src/app/` — App Router. Grupos `(auth)` y `(portal)`, rutas BFF en `src/app/api/*`.
- `src/features/*` — dominios: `auth, admin, dashboard, exercises, workouts, membership,
  notifications, onboarding, profile, access`. Cada uno con `components/` y `services/`.
- `src/shared/*` — `api` (cliente, contratos, schemas, query-keys), `components` (ui,
  layout, feedback, media), `server` (código server-only), `config`, `hooks`, `lib`, `auth`.

## Sistema de autenticación

- El navegador **solo** consume rutas BFF `/api/*`. El JWT vive en cookie **HttpOnly**
  (`gymsheet_session`, 8 h) — nunca es visible para JavaScript.
- El backend NestJS hermano es la autoridad de autorización.
- Código server-only en `src/shared/server/*`: `session.ts`, `auth-cookie.ts`, `csrf.ts`,
  `backend.ts`, `backend-route-policy.ts`, `media-proxy.ts`.
- **No** se usa Web Storage para sesión (regla verificada por `scripts/source-check.mjs`).

## Estado, datos y validación

- Estado servidor: **TanStack Query** (`@/shared/api/query-keys.ts` centraliza las keys).
- Formularios: **react-hook-form** + **Zod** (`@hookform/resolvers`).
- Contratos tipados en `shared/api/contracts/*` y validación Zod en
  `shared/api/schema-definitions/*` (respuestas validadas contra el contrato).
- Cliente HTTP navegador: `shared/api/api-client.ts` → `fetch('/api/backend' + path)`
  con envelope `{ ok, data }`, timeouts y `ApiError` clasificado por status.

## Dependencias del navegador (uso real)

Búsqueda de `window/document/localStorage/navigator/FileReader/Blob/URL.createObjectURL`:
**12 ocurrencias en 5 archivos**, todas legítimas y aisladas:

| Archivo | Uso |
|---|---|
| `shared/api/api-client.ts` | `window.setTimeout`, `document.createElement('a')` (descargas), `URL.createObjectURL` |
| `shared/components/ui/input.tsx` | `HTMLInputElement` (tipos) |
| `shared/hooks/use-debounced-value.ts` | `window` timers |
| `features/membership/.../membership-experience.tsx` | DOM de navegador |
| `features/workouts/.../rest-timer.tsx` | timers de navegador |

**No** hay uso de `localStorage`/`sessionStorage` para datos de sesión.

## Servicios externos

- Backend NestJS (`BACKEND_API_URL`) vía BFF.
- Proxy de medios (`shared/server/media-proxy.ts`, ruta `/api/media`).
- Variables de entorno server: `BACKEND_API_URL`, `APP_URL`, `BACKEND_REQUEST_TIMEOUT_MS`.

## Calidad

- TypeScript estricto (`strict`, `noUncheckedIndexedAccess`).
- `scripts/source-check.mjs`: prohíbe `fetch` fuera de la capa autorizada, Web Storage,
  `as any`/`@ts-ignore` y archivos ≥ 300 líneas.
- Tests: Vitest (unit/component) + Playwright (E2E, requiere backend + PostgreSQL).
- **Hallazgo pre-existente**: dos componentes superan 300 líneas
  (`exercise-form.tsx` 310, `onboarding-flow.tsx` 326). No bloquea la migración; se
  recomienda dividirlos en su propio PR.

## Conclusión

El código de negocio está limpiamente separado de la UI y del navegador. Los contratos,
schemas y utilidades de dominio son **puros** y se han extraído a `packages/*` como fuente
única de verdad. La UI (HTML/DOM/Tailwind) permanece exclusiva de web; la app móvil
implementa su propia UI nativa reutilizando la lógica compartida.
