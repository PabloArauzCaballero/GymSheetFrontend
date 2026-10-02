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

## ADR-008 — `@gymsheet/hooks` solo contiene el contrato de query-keys

**Contexto**: se quería compartir hooks de TanStack Query entre web y móvil, pero la app
móvil está `nohoist` (ADR-006). Un hook que importe React/react-query desde este paquete
(hoisteado) usaría una instancia distinta a la del bundle móvil → "invalid hook call".
**Decisión**: `@gymsheet/hooks` exporta **solo** `queryKeys` (contrato de claves de caché,
sin React), garantizando que ambas apps leen/invalidan las mismas entradas. Los hooks
acoplados a React viven por app hasta deduplicar React/react-query en Metro
(`resolver.extraNodeModules`).
**Estado**: implementado; `queryKeys` movido al paquete, web lo consume vía shim.

## ADR-009 — React unificado a 19.2.0 en todo el monorepo

**Contexto**: web usa React 19.2.0 (Next 16) y Expo SDK 53 fija React 19.0.0. Con Yarn 1
el hoisting mezcló ambas versiones (React duplicado + `react-dom` emparejado con la versión
equivocada) → renders vacíos en los tests de web.
**Decisión**: `resolutions: { react: 19.2.0, react-dom: 19.2.0 }` en la raíz; el móvil declara
19.2.0. Una sola instancia de React hoistea limpiamente y web queda verificado.
**Consecuencia**: el runtime nativo del móvil (RN 0.79 espera 19.0.0) debe validarse en
dispositivo; si Expo lo requiere, fijar la versión exacta del SDK vía `resolutions` por app.
Además, `@testing-library/jest-dom` se `nohoist`ea en web para co-ubicarse con `vitest`, y
`vitest.config.ts` castea el plugin de React a `PluginOption` por la posible duplicación de
`vite` (misma versión, copias físicas distintas).
**Estado**: implementado y verificado (21 tests, type-check, lint y build de web en verde).

## ADR-010 — Expo SDK 57 para que Expo Go de las tiendas abra el proyecto

**Contexto**: la Expo Go de App Store / Play Store sólo ejecuta el SDK más reciente
(57 en octubre de 2026; `api.expo.dev/v2/versions/latest → expoGoSdkVersion`). Con SDK 53
el proyecto no abría en ningún iPhone físico: en iOS no se puede instalar una Expo Go vieja.
**Decisión**: subir a SDK 57 (RN 0.86.3, React 19.2.3, Reanimated 4.5 + worklets, expo-router
57). Cambios de código: `expo-file-system/legacy` en la exportación, tipos de navegación desde
`expo-router` (ya no depende de React Navigation), `fullscreenOptions` en `VideoView`,
`SharedValue` importado de Reanimated, `ColorValue` en los iconos de pestañas. Config:
fuera `newArchEnabled`, `splash` (pasa al plugin `expo-splash-screen`) y `edgeToEdgeEnabled`;
fuera el plugin `with-fmt-consteval-fix` (RN 0.86 trae fmt 12, arreglado) y el plugin de
Sentry duplicado; el preset de Babel ya añade el plugin de worklets.
Expo Go no admite push remotas: `registerForPushNotifications` se salta allí
(`isRunningInExpoGo()`). En desarrollo, un `EXPO_PUBLIC_API_URL` en `localhost` se reescribe
a la IP de LAN con la que el dispositivo alcanzó Metro, también en las URL de medios que
devuelve el backend, para que cualquier teléfono en la misma Wi-Fi funcione sin editar `.env`.
**Consecuencia**: iOS mínimo 16.4, Xcode ≥ 26.4 para builds locales; `ios/` y `android/`
locales hay que regenerarlos (`npx expo prebuild --clean`). `expo-doctor` deja dos avisos
asumidos: `disableHierarchicalLookup` (necesario con Yarn 1 + nohoist para no cargar el React
de la web) y copias de React bajo `@radix-ui` (sólo web).
**Estado**: implementado; type-check, lint, `expo export` iOS+Android y arranque en Expo Go
SDK 57 (simulador iPhone 17 Pro, iOS 26.5) verificados.

## Decisiones pendientes

- Deduplicar React/react-query en Metro para poder compartir hooks acoplados a UI.
- Estrategia offline (ver `roadmap.md`): empezar por nivel básico/intermedio.
- Endpoints específicos móvil si hay overfetching de vistas pensadas para tablas web.
