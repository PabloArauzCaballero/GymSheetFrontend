# Registro de decisiones (ADR)

## ADR-001 — Monorepo con Yarn Workspaces + Turborepo

**Contexto**: incorporar app móvil reutilizando lógica sin regresiones en la web.
**Decisión**: monorepo `apps/*` + `packages/*`, Yarn 1 Workspaces, Turborepo para tareas.
**Estado**: implementado y verificado (web compila desde `apps/web`).

## ADR-002 — Compartir lógica, no UI

**Decisión**: extraer tipos, schemas, cliente API, dominio, auth, tokens y observabilidad a
`packages/*`. La UI se reimplementa nativa en móvil (React Native), no se fuerza reutilización
visual.
**Consecuencia**: experiencia móvil realmente nativa; una sola fuente de verdad para lógica.

## ADR-003 — Shims de re-export en la web

**Contexto**: 32+ archivos importan `@/shared/api/*` y `@/shared/lib/*`.
**Decisión**: mover la fuente a `packages/*` y dejar los archivos web como barriles de
re-export (`export * from '@gymsheet/...'`).
**Consecuencia**: cero churn de imports y cero regresiones; build de web intacto.

## ADR-004 — Cliente API transport-agnóstico

**Decisión**: `createApiClient({ baseUrl, tokenProvider })` en `@gymsheet/api-client`. Web
conserva su cliente BFF (cookie HttpOnly); móvil usa bearer sobre SecureStore.
**Motivo**: el contrato del backend (`{ ok, data }` + problem+json) es idéntico; solo cambia
el transporte y el almacenamiento del token.

## ADR-005 — Tokens en SecureStore, nunca en Web Storage

**Decisión**: contrato `AuthStorage`; móvil = Expo SecureStore; web = cookie HttpOnly (no-op
en JS). Prohibido AsyncStorage/localStorage para tokens.

## ADR-006 — `nohoist` para React Native

**Contexto**: web usa React 19.2; Expo SDK 53 fija React 19.0 y RN pin exacto.
**Decisión**: `nohoist` de `@gymsheet/mobile/**` para aislar sus dependencias nativas y evitar
instancias duplicadas de React/React Native.

## ADR-007 — Expo SDK 53 + Expo Router

**Decisión**: Expo (managed) con Expo Router (file-based), TanStack Query, Zustand,
react-hook-form + Zod, Sentry. Alinea stack con la web y permite EAS Build/Update.

## Decisiones pendientes

- `@gymsheet/hooks`: extraer hooks de TanStack Query compartidos (hoy en `services/` web).
- Estrategia offline (ver `roadmap.md`): empezar por nivel básico/intermedio.
- Endpoints específicos móvil si hay overfetching de vistas pensadas para tablas web.
