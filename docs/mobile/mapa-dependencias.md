# Mapa de dependencias (Fase 0)

## Grafo de paquetes compartidos

```text
@gymsheet/types            (sin deps runtime)
      ▲        ▲        ▲
      │        │        │
@gymsheet/schemas   @gymsheet/domain   @gymsheet/auth
  (zod)                (—)                 (—)
      ▲
      │
@gymsheet/api-client  (zod, @gymsheet/schemas)

@gymsheet/design-tokens    (sin deps)
@gymsheet/observability    (sin deps)
```

Reglas de dependencia (verificadas):

- `packages/*` **nunca** importan desde `apps/*`.
- Sin ciclos: `api-client → schemas → types`; `domain → types`; `auth → types`.
- `apps/web` y `apps/mobile` dependen de los paquetes, no al revés.

## Consumo por aplicación

```text
apps/web  ──┬─ @gymsheet/types        (vía shims re-export en @/shared/api/contracts)
            ├─ @gymsheet/schemas      (vía @/shared/api/schemas)
            ├─ @gymsheet/api-client   (ApiError vía @/shared/api/api-error; cliente BFF propio)
            ├─ @gymsheet/domain       (vía @/shared/lib/numbers y date)
            ├─ @gymsheet/auth
            ├─ @gymsheet/design-tokens
            └─ @gymsheet/observability

apps/mobile ┬─ @gymsheet/types
            ├─ @gymsheet/schemas      (loginSchema, contratos)
            ├─ @gymsheet/api-client   (createApiClient + TokenProvider bearer)
            ├─ @gymsheet/domain       (permisos, formateadores)
            ├─ @gymsheet/auth         (AuthStorage → SecureStore)
            ├─ @gymsheet/design-tokens (tema)
            └─ @gymsheet/observability
```

## Estrategia de shims (web sin regresiones)

Los archivos originales de `apps/web` se conservan como **barriles de re-export** que
apuntan a los paquetes. Así los 32+ importadores (`@/shared/api/contracts`,
`@/shared/api/schemas`, `@/shared/api/api-error`, `@/shared/lib/{numbers,date}`) siguen
funcionando sin cambios y la fuente de verdad vive en `packages/*`.

## Dependencias del navegador a reemplazar en móvil

| Web | Móvil |
|---|---|
| Cookie HttpOnly (BFF) | Bearer token en Expo SecureStore |
| `document.createElement('a')` (descargas) | `expo-file-system` + `expo-sharing` |
| `URL.createObjectURL` | `expo-file-system` |
| `<input type="file">` | `expo-document-picker` / `expo-image-picker` |
| `window` timers | timers de React Native (iguales) |
| Navegación por URL/sidebar | Expo Router (tabs + stacks) + deep links |

## Resolución en tooling

- **Next.js**: `transpilePackages: ['@gymsheet/*']` transpila el TS de los paquetes.
- **Vitest**: alias `@gymsheet/*` → `packages/*/src/index.ts` para transformar el source.
- **Metro (Expo)**: `watchFolders` = raíz del monorepo + `nodeModulesPaths` para resolver
  los symlinks de workspace; `disableHierarchicalLookup` evita React/RN duplicados.
