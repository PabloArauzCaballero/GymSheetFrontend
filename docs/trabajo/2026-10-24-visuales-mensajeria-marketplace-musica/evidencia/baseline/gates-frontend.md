# Línea base de gates del frontend móvil (H0.S1.M3)

- Fecha: 2026-10-24 · Rama `claude/brave-pasteur-t5425i` @ `7c69a38` · Node v22.22.0 · yarn 1.22.22
- Árbol de trabajo limpio antes y después (`git status --short` vacío). No se editó ningún archivo del repo.
- Peldaño de evidencia: medición (sin cambios de código). Veredictos por gate abajo.

## Resumen

| Gate | Comando | Exit | Veredicto |
|---|---|---|---|
| Instalación | `yarn install --frozen-lockfile` | 0 (tras 2 reintentos por carrera de symlinks) | PASS |
| type-check móvil | `yarn workspace @gymsheet/mobile type-check` | **2** | **FAIL** (1 error TS2345 en `src/theme/contrast.test.ts:102`) |
| lint móvil (script `yarn workspace ... lint`) | `yarn workspace @gymsheet/mobile lint` | **127** | **BLOCKED** (`expo: not found`, ENVIRONMENT) |
| expo lint (invocación directa) | `node node_modules/expo/bin/cli lint` | 0 | PASS (0 problemas) |
| check-theme | `node scripts/check-theme.mjs` | 0 | PASS, **0 violaciones** |
| test móvil | `yarn workspace @gymsheet/mobile test` | 0 | PASS, 231/231 |
| test:theme | `yarn workspace @gymsheet/mobile test:theme` | 0 | PASS, 16/16 |
| vitest chat | `node ../../node_modules/vitest/vitest.mjs run --config src/features/chat/vitest.config.mts` | 0 | PASS, 30/30 (4 archivos) |
| H0.S1.M4 (turbo web/paquetes) | — | — | ejecutado por agente remoto, ver `gates-web-paquetes.md` |

Número exacto de violaciones de check-theme: **0** (hex 0, rgba 0, font-size 0, alpha-concat 0; sin archivos que listar).

## Fallos y bloqueos preexistentes (clasificados, regla 80.4)

1. **type-check, TS2345 en `apps/mobile/src/theme/contrast.test.ts:102`** — `fileURLToPath(new URL(...))`: el tipo global `URL` (TS 6.0.3 con `lib` de expo/tsconfig.base) no es asignable al `URL` de `@types/node` 22.20.1 (`searchParams.entries()` devuelve `IterableIterator` en vez de `URLSearchParamsIterator`). Es el único error. Clasificación: **TEST_BUG** (error de tipos en un archivo de prueba, presente en HEAD con lockfile congelado; el runtime de ese test pasa: `test:theme` 16/16). Evidencia: reproducible con árbol limpio; `apps/mobile/node_modules/typescript` = 6.0.3, `@types/node` = 22.20.1. No se corrigió (fuera de alcance de esta medición).
2. **`yarn workspace @gymsheet/mobile lint` → `/bin/sh: 1: expo: not found`** — `apps/mobile/node_modules/.bin/` no existe tras la instalación (el paquete `expo` sí está en `apps/mobile/node_modules/expo` con su `bin/cli`). Clasificación: **ENVIRONMENT** (enlaces `.bin` de dependencias locales del workspace no creados por esta instalación; coherente con la carrera de symlinks documentada en `.yarnrc`). Se midió el mismo gate invocando `expo lint` y `check-theme` por separado (filas siguientes). El script `lint` encadenado (`expo lint && node scripts/check-theme.mjs`) no se pudo ejecutar tal cual.
3. **Instalación**: 1.º intento exit 1 (`ENOENT ... react-native-screens ... .yarn-tarball.tgz` / "trouble with your network connection"), 2.º exit 1 (`ENOENT lstat packages/api-client/node_modules`), 3.º exit 1 (`ENOENT lstat packages/anatomy/node_modules/typescript`), 4.º exit 0. Clasificación: **ENVIRONMENT** (red con `network-concurrency 1` + carrera de symlinks conocida). Sin intervención sobre TLS.

Aviso no fatal en vitest del chat: stderr de React `<button> cannot contain a nested <button>` (1 aparición, en `chat-thread.test.tsx > ubicación > la burbuja dice el nombre del lugar elegido`). No hace fallar el test; queda como hallazgo de base (posible HTML inválido en la burbuja de ubicación, solo en el sustituto DOM de RN).

## Salidas literales (recortadas)

### Instalación
```text
$ yarn install --frozen-lockfile        # intento 4
dedupe-react: se podaron 3 copias duplicadas:
  - node_modules/@radix-ui/react-slot/node_modules/react (19.2.3 → 19.2.0)
  - node_modules/@tanstack/react-query/node_modules/react (19.2.3 → 19.2.0)
  - node_modules/react-hook-form/node_modules/react (19.2.3 → 19.2.0)
Done in 15.07s.
EXIT=0
```

### type-check
```text
$ yarn workspace @gymsheet/mobile type-check
$ tsc --noEmit
src/theme/contrast.test.ts(102,45): error TS2345: Argument of type 'URL' is not assignable to parameter of type 'string | URL'.
  Type 'URL' is not assignable to type 'import("url").URL'.
    The types returned by 'searchParams.entries()' are incompatible between these types.
      Type 'IterableIterator<[string, string]>' is missing the following properties from type 'URLSearchParamsIterator<[string, string]>': map, filter, take, drop, and 9 more.
error Command failed with exit code 2.
EXIT=2
```

### lint (script del workspace)
```text
$ yarn workspace @gymsheet/mobile lint
$ expo lint && node scripts/check-theme.mjs
/bin/sh: 1: expo: not found
error Command failed with exit code 127.
EXIT=127
```

### expo lint (invocación directa, desde apps/mobile)
```text
$ node node_modules/expo/bin/cli lint
$ /home/user/GymSheetFrontend/node_modules/.bin/eslint .../apps/mobile/src .../apps/mobile/app --fix=false --cache=true --cache-location=.../apps/mobile/.expo/cache/eslint/
Done in 13.68s.
EXIT=0
```
(El caché `.expo/` está ignorado por git; `git status` sigue limpio.)

### check-theme
```text
$ node scripts/check-theme.mjs
check-theme: OK (0 colores, rgba, fontSize literales ni alfas concatenadas fuera de src/theme)
EXIT=0
```
Reglas del script: hex, rgba, font-size, alpha-concat sobre `app/` y `src/` fuera de `src/theme/`. Desglose: 0 / 0 / 0 / 0. Top archivos: ninguno.

### test (node:test)
```text
$ yarn workspace @gymsheet/mobile test
# tests 231
# suites 3
# pass 231
# fail 0
# cancelled 0
# skipped 0
# todo 0
EXIT=0
```

### test:theme
```text
# tests 16
# pass 16
# fail 0
EXIT=0
```

### Vitest del chat
```text
$ cd apps/mobile && node ../../node_modules/vitest/vitest.mjs run --config src/features/chat/vitest.config.mts
 ✓ src/features/chat/__tests__/use-voice-note.test.tsx (6 tests)
 ✓ src/features/chat/__tests__/chat-thread.test.tsx (17 tests)
 ✓ src/features/chat/__tests__/chat-composer.test.tsx (4 tests)
 Test Files  4 passed (4)
      Tests  30 passed (30)
EXIT=0
```

## H0.S1.M4

Ejecutado por agente remoto, ver `gates-web-paquetes.md`.

## No cubierto

- H0.S1.M4 (`yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile`): no ejecutado aquí por cambio de alcance.
- El script `lint` del workspace móvil no corrió de forma encadenada (BLOQUEADO por `.bin` ausente); sus dos mitades se midieron por separado.
- No se corrió `yarn workspace @gymsheet/web build`, ni ninguna prueba E2E/Playwright, ni verificación en dispositivo/simulador.
- Los 30 tests del chat usan React Native sustituido por DOM (jsdom); no prueban render nativo.
- `check-theme` no inspecciona archivos `*.test.ts(x)` ni `src/theme/` por diseño del script; 0 violaciones no implica ausencia de colores literales en esos lugares.
- Sin capturas visuales (no aplica a esta medición).
