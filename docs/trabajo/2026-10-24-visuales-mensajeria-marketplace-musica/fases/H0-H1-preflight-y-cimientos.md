# H0 — Preflight y baseline visual de toda la app · H1 — Cimientos visuales compartidos

## H0 — Preflight y baseline

**Resultado observable:** antes de tocar una pantalla existe una carpeta con la captura de **cada**
pantalla de la app móvil en 375 y 430 pt, una lista anti-slop con hallazgos por pantalla, los
números de partida de los gates (lint, check-theme, type-check, tests, Maestro) y un entorno real
(backend + Postgres + simulador) que arranca.
**Kill-test:** que alguien pregunte «¿cómo se veía antes?» y no haya captura.
**CA:** Dado el repo en `claude/brave-pasteur-t5425i`, cuando se corre el preflight, entonces
quedan en `evidencia/baseline/` las capturas, `baseline.md` con las salidas literales y ningún
gate en estado desconocido.
**DoD:** `baseline.md` con comando + salida + exit code de cada gate; ≥ 40 capturas; inventario
anti-slop con ≥ 1 línea por pantalla.
**Estado:** TODO

### H0.S1 — Herramientas y entorno

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H0.S1.M1 | Verificar skills y plugins obligatorios del `CLAUDE.md` (`apple-premium-ui`, `ui-ux-pro-max`, `repp-diseno`, `web-design-guidelines`, plugins `fullstack-dev-skills`, `frontend-design`, `feature-dev`, `code-review`, `context7`). **Hoy `fullstack-dev-skills` no aparece habilitado en la sesión** (`ListPlugins` vacío) → pedir a Pablo instalarlo antes de la primera microtarea de UI, como exige el `CLAUDE.md` | lista con ✓/✗ | `evidencia/baseline/plugins.md` | TODO |
| H0.S1.M2 | Backend real: `GymSheetBackend` en `:3005` con Postgres `:5433` y migraciones al día (`yarn migration:up`); `/health/ready` 200 | `curl /health/ready` → 200 | salida en `baseline.md` | TODO |
| H0.S1.M3 | Móvil: `yarn install --frozen-lockfile`, `yarn workspace @gymsheet/mobile type-check`, `lint` (anotar el conteo de `check-theme`), `test` | tres exit codes anotados | `baseline.md` | TODO |
| H0.S1.M4 | Web: `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile` (sirve de guardia de los `packages/*` que se tocan) | exit 0 o fallos preexistentes listados | `baseline.md` | TODO |
| H0.S1.M5 | Datos sintéticos: dos cuentas de gimnasios distintos con match, 5 conversaciones (una con media, una de sistema), 25 playlists (10 propias, 15 de comunidad), 1 vendedor completo + 1 mínimo con planes y datos de pago; **declarados sintéticos** en `DATOS_DE_PRUEBA.md` | ambas cuentas inician sesión | `DATOS_DE_PRUEBA.md` | TODO |

### H0.S2 — Baseline visual de toda la app

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H0.S2.M1 | Maestro `00-baseline-capturas.yaml`: recorre las 4 pestañas y las ~45 rutas de `app/(app)` capturando en iPhone SE y 15 Pro Max (`takeScreenshot` por pantalla) | ≥ 40 capturas × 2 anchos | `evidencia/baseline/*.png` | BLOQUEADO — el contenedor en la nube no tiene simulador iOS/Android ni Maestro. Qué se intentó: auditoría de viabilidad de Expo web ([viabilidad-capturas.md](../evidencia/baseline/viabilidad-capturas.md)): hoy no arranca (falta `react-native-web`, `expo-secure-store` sin implementación web). Qué lo destraba: correr el flujo en el Mac de Pablo con simulador, o aceptar una línea base provisional en Expo web (spike en login, 0,5–1 día; capturas rotuladas «web, aproximación»). Depende de: Pablo. El flujo `.maestro/00-baseline-capturas.yaml` se puede redactar sin ejecutarlo. |
| H0.S2.M2 | Inventario anti-slop (`repp-diseno` §9 + `apple-premium-ui` «Avoid») por pantalla: volt en exceso, tarjetas planas repetidas, texto < 12, copy hueco, estados faltantes, hex sueltos (`check-theme` por archivo) | tabla pantalla × hallazgo × severidad | `evidencia/baseline/anti-slop.md` | TODO |
| H0.S2.M3 | Priorizar: las tres áreas pedidas primero; del resto, solo lo BLOQUEANTE entra a H1; lo demás queda listado como deuda con dueño | tabla de prioridad | `anti-slop.md` §Prioridad | TODO |

---

## H1 — Cimientos visuales compartidos (el «toda la app»)

**Resultado observable:** la app entera se ve más calma y premium sin que cambie ningún flujo:
una rampa tipográfica, superficies con 2-3 niveles de realce en vez de bordes, un solo acento por
pantalla, estados completos y cero literales de color; y las primitivas que los tres hitos
grandes necesitan existen **una sola vez** en `src/components`.
**Referencia:** `apple-premium-ui` (menos elementos, más fuertes; una acción dominante por región;
espaciado grande; radios contenidos; profundidad escasa), `repp-diseno` §C5 (rampa 34/22/17/15/12,
escala 2-4-8-12-16-20-24-32-40, `borderCurve: 'continuous'`), `web-design-guidelines` como
auditoría final.
**Kill-test:** `check-theme` con un número > 0, o dos botones volt en la misma pantalla.
**CA:** Dado cualquier flujo de Maestro existente (01-15), cuando se corre tras H1, entonces pasa
igual; y dado el inventario de H0, cuando se revisa, entonces los hallazgos BLOQUEANTES están en
cero.
**DoD:** Maestro 01-15 verde; `check-theme` 0; `contrast.test.ts` ampliado verde; capturas
antes/después de 8 pantallas representativas; doble revisión.
**Estado:** TODO

### H1.S1 — Tokens y guardas

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H1.S1.M1 | `theme/type.ts`: rampa objetivo `display 34 · title 22 · body 17 · callout 15 · caption 12` mapeada sobre las variantes de `Text` (sin romper `fontSizes.*` existentes: alias) | `Text variant="title"` mide 22 | `test:theme` verde + captura | TODO |
| H1.S1.M2 | `theme/spacing.ts`: confirmar escala 2…48 y añadir `spacing.xxl 40` si falta; `shadow.ts`: `elevation.raised/overlay/sheet` (3 niveles) con `shadowColor` por token | 3 niveles documentados | lint | TODO |
| H1.S1.M3 | `scripts/check-theme.mjs`: nueva regla que prohíbe `fontSizes.micro` fuera de `src/theme` y `fontWeight` literal; ejecutarlo y anotar el total | regla falla en fixture de prueba | `node scripts/check-theme.mjs` | TODO |
| H1.S1.M4 | Purgar la deuda de hex/rgba fuera de `src/theme` que H0 contó (la skill dice 49 hex + 58 rgba): cada uno → token con contraste comentado | `check-theme` = 0 | lint | TODO |
| H1.S1.M5 | `contrast.test.ts`: pares nuevos (texto sobre `musicHero`, línea de estado del chat, precio sobre tarjeta) por inquilino | AA ≥ 4,5:1 | `test:theme` verde | TODO |

### H1.S2 — Primitivas compartidas

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H1.S2.M1 | `SearchField` genérico (`label`, `placeholder`, `testID`, `autoFocus`, `onSubmit`) movido a `src/components/search-field.tsx`; `routine-catalog/search-field.tsx` reexporta | usos actuales sin cambio (tests verdes) | vitest catálogo | TODO |
| H1.S2.M2 | `src/components/icon-button.tsx` como único `IconButton` (44/48, `haptic`, `badge?`); borrar el local de `comunidad-mensajes.tsx` | grep `function IconButton` = 1 | grep | TODO |
| H1.S2.M3 | `src/components/page-controls.tsx` («Página X de Y», ‹ ›, números, 44 pt, a11y) | test con 1, 5 y 12 páginas | test verde | TODO |
| H1.S2.M4 | `src/components/view-toggle.tsx` (grid/lista) con persistencia por clave | test verde | test | TODO |
| H1.S2.M5 | `src/components/price.tsx` con `Intl` y `tabularNums` | test verde | test | TODO |
| H1.S2.M6 | `MediaImage` gana `fallbackIcon` por tipo (producto, playlist, tienda) y `aspectRatio` | sin imagen muestra marcador propio | captura | TODO |
| H1.S2.M7 | `src/components/segmented-tabs-card.tsx`: tarjeta única con pestañas (regla de fichas del cliente) usada por vendedor (H3) y, después, por fichas futuras | tres pestañas accesibles (`tablist`) | test verde | TODO |

### H1.S3 — Pasada «calma» sobre superficies comunes

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H1.S3.M1 | `ScreenHeader`: título `display` con tracking −3 %, subtítulo `callout` muted, una acción; acción secundaria pasa a ⋯ | 8 pantallas capturadas antes/después | capturas | TODO |
| H1.S3.M2 | `Card`: `surfaceRaised` + `elevation.raised` en vez de borde `borderSubtle`; `borderCurve: 'continuous'` | captura | capturas | TODO |
| H1.S3.M3 | Barra de pestañas: iconos `lg`, etiqueta `caption`, badge numérico único (reutilizado por Mensajes) | captura | captura | TODO |
| H1.S3.M4 | Auditoría de «una acción volt por pantalla» en Inicio, Rutinas, Comunidad, Perfil: los demás a `ghost`/texto | tabla pantalla → acción primaria | `evidencia/h1-acento.md` | TODO |
| H1.S3.M5 | Estados faltantes BLOQUEANTES del inventario (p. ej. podio de Comunidad devolviendo `null` en error) | cada uno con `EmptyState`/`ErrorState` | capturas | TODO |
| H1.S3.M6 | Movimiento: `useReducedMotion` en todo bucle o entrada que H0 encontró sin él; `EnterUp` solo en la primera pantalla | grep de `withRepeat` sin guarda = 0 | grep + captura | TODO |
