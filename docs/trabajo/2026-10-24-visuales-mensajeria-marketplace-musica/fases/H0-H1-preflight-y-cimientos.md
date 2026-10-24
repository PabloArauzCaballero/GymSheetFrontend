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
| H0.S1.M1 | Verificar skills y plugins obligatorios del `CLAUDE.md` (`apple-premium-ui`, `ui-ux-pro-max`, `repp-diseno`, `web-design-guidelines`, plugins `fullstack-dev-skills`, `frontend-design`, `feature-dev`, `code-review`, `context7`). **Hoy `fullstack-dev-skills` no aparece habilitado en la sesión** (`ListPlugins` vacío) → pedir a Pablo instalarlo antes de la primera microtarea de UI, como exige el `CLAUDE.md` | lista con ✓/✗ | `evidencia/baseline/plugins.md` | HECHO — las 7 skills de diseño del `CLAUDE.md` existen en `.claude/skills/`; `fullstack-dev-skills` 0.4.20 estaba declarado pero ausente del contenedor en la nube, se instaló con `claude plugin marketplace add jeffallan/claude-skills` + `claude plugin install fullstack-dev-skills@fullstack-dev-skills` (scope user, enabled) y la sesión ya lista sus skills (`react-native-expert`, `nestjs-expert`, `postgres-pro`, `playwright-expert`, `security-reviewer`…). Para que persista en sesiones nuevas hay que añadir esos dos comandos al script de instalación del entorno (decisión de Pablo). |
| H0.S1.M2 | Backend real: `GymSheetBackend` en `:3005` con Postgres `:5433` y migraciones al día (`yarn migration:up`); `/health/ready` 200 | `curl /health/ready` → 200 | salida en `baseline.md` | HECHO — Postgres 16 local :5433 (Docker sin daemon) y API :3005 arriba; `migration:up` 117 migraciones exit 0; `/api/v1/health/live` y `/ready` 200 (el prefijo `/api/v1` es global: `/health/live` a secas da 404, y el `CLAUDE.md` del backend lo documenta sin prefijo); `lint` y `type-check` 0; `yarn test` 1526/1526 tras `db:seed:all:development` y `db:enrich:exercises` (sin seed fallan 17 en `muscles.service.integration.spec.ts`: ENVIRONMENT/DATA); **`yarn test:e2e` en rojo previo: 9 suites de 52, 47 tests de 397**. Evidencia: [gates-backend.md](../evidencia/baseline/gates-backend.md) |
| H0.S1.M3 | Móvil: `yarn install --frozen-lockfile`, `yarn workspace @gymsheet/mobile type-check`, `lint` (anotar el conteo de `check-theme`), `test` | tres exit codes anotados | `baseline.md` | HECHO — medido, no arreglado: type-check exit 2 (1 error previo en `contrast.test.ts:102`), `expo lint` 0, `check-theme` 0 violaciones, `test` 231/231, `test:theme` 16/16, vitest chat 30/30. Script `lint` BLOQUEADO por entorno (`.bin` ausente). Evidencia: [gates-frontend.md](../evidencia/baseline/gates-frontend.md) |
| H0.S1.M4 | Web: `yarn turbo run source-check type-check lint test --filter=!@gymsheet/mobile` (sirve de guardia de los `packages/*` que se tocan) | exit 0 o fallos preexistentes listados | `baseline.md` | HECHO — medido, no arreglado: install OK al 5.º intento (carrera de symlinks, ENVIRONMENT), source-check/type-check/lint 0 en 12 paquetes, build web 0, tests 1009 OK y **1 rojo previo** en `training-invitations-client.test.tsx` (TEST_BUG: NBSP de ICU 77.1 en el texto esperado). Evidencia: [gates-web-paquetes.md](../evidencia/baseline/gates-web-paquetes.md) |
| H0.S1.M5 | **Hallazgo de H0.S1.M2:** las cuentas `*.qa.test` que cita el plan previo no las crea ningún seed. Existen `admin@qa.test` (ADMIN, la fijó el `.env` local) y 9 mocks `@gymsheet.local` (`coach/athlete/new/active/…`). Para reproducir `admin.a@qa.test` y `super@qa.test`: `SEED_ADMIN_EMAIL`/`SEED_SYSTEM_ADMIN_EMAIL` en `.env` + `yarn db:seed:base`; `socio.a@qa.test` se crea con `POST /api/v1/auth/register`. `db:seed:showcase` hoy falla (ver riesgos). Datos sintéticos: dos cuentas de gimnasios distintos con match, 5 conversaciones (una con media, una de sistema), 25 playlists (10 propias, 15 de comunidad), 1 vendedor completo + 1 mínimo con planes y datos de pago; **declarados sintéticos** en `DATOS_DE_PRUEBA.md` | ambas cuentas inician sesión | `DATOS_DE_PRUEBA.md` | TODO |

### H0.S2 — Baseline visual de toda la app

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H0.S2.M1 | Maestro `00-baseline-capturas.yaml`: recorre las 4 pestañas y las ~45 rutas de `app/(app)` capturando en iPhone SE y 15 Pro Max (`takeScreenshot` por pantalla) | ≥ 40 capturas × 2 anchos | `evidencia/baseline/*.png` | BLOQUEADO — el contenedor en la nube no tiene simulador iOS/Android ni Maestro. Qué se intentó: auditoría de viabilidad de Expo web ([viabilidad-capturas.md](../evidencia/baseline/viabilidad-capturas.md)): hoy no arranca (falta `react-native-web`, `expo-secure-store` sin implementación web). Qué lo destraba: correr el flujo en el Mac de Pablo con simulador, o aceptar una línea base provisional en Expo web (spike en login, 0,5–1 día; capturas rotuladas «web, aproximación»). Depende de: Pablo. El flujo `.maestro/00-baseline-capturas.yaml` se puede redactar sin ejecutarlo. |
| H0.S2.M2 | Inventario anti-slop (`repp-diseno` §9 + `apple-premium-ui` «Avoid») por pantalla: volt en exceso, tarjetas planas repetidas, texto < 12, copy hueco, estados faltantes, hex sueltos (`check-theme` por archivo) | tabla pantalla × hallazgo × severidad | `evidencia/baseline/anti-slop.md` | HECHO (por lectura de código, sin capturas: ver H0.S2.M1) — 95 hallazgos fuera de chat/marketplace/música: 18 BLOQUEANTE, 36 MAYOR, 41 MENOR. Evidencia: [anti-slop.md](../evidencia/baseline/anti-slop.md) |
| H0.S2.M3 | Priorizar: las tres áreas pedidas primero; del resto, solo lo BLOQUEANTE entra a H1; lo demás queda listado como deuda con dueño | tabla de prioridad | `anti-slop.md` §Prioridad | HECHO — §3 de [anti-slop.md](../evidencia/baseline/anti-slop.md): los BLOQUEANTES de estado, accesibilidad y acento entran a H1 (M7–M9 abajo); el resto queda como deuda con dueño propuesto |

---

### Hechos que el baseline cambió en el plan

- **`routinesV2` está apagada en producción** (`eas.json` la enciende solo en `testflight` y `apk-test`): sin `EXPO_PUBLIC_ROUTINES_V2=true` Música **no tiene entrada** (está en el ⋯ de Rutinas). Las capturas y los flujos Maestro de música deben correrse con ella encendida; H4.S3.M10 decide la entrada definitiva.
- **Cuatro rutas sin ningún enlace interno** (`reels`, `descubrir`, `routines/explore`, `routines/report/[id]`): Maestro no las alcanza tocando; hay que abrirlas por URL. `descubrir.tsx` (1088 líneas) duplica la baraja de Comunidad. Decisión de borrar o enlazar: de Pablo (deuda).
- `colors.background` como tinta sobre volt en 11 archivos (4,33:1 calculado frente a 5,10:1 con `accentContrast()`): se corrige al tocar cada archivo (H1.S1.M5 añade el par de contraste).

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
**Kill-test:** `check-theme` con un número > 0 (hoy es 0), un `fontSizes.micro` nuevo, o dos botones volt en la misma pantalla.
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
| H1.S1.M4 | **Corregida tras medir (H0.S1.M3):** `check-theme` ya está en 0 (hex 0, rgba 0, font-size 0, alpha-concat 0), así que no hay deuda de hex que purgar. Lo que `check-theme` **no** cubre y sí hay que contar y reducir en las pantallas tocadas: usos de `fontSizes.micro` (10 pt), `fontWeight` literal y números de layout sueltos | conteo antes/después por archivo tocado; ninguna pantalla nueva con `micro` ni `fontWeight` literal | `grep -rn "fontSizes.micro\|fontWeight: '" <archivos>` → 0 en lo nuevo | TODO |
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
| H1.S2.M8 | Un único «chip seleccionado» neutro (realce + ✓, nunca relleno volt) en `components/wizard/choice-chip.tsx`, y sustituir los 7 chips caseros (`reels`, `onboarding`, `registrar-peso`, `profile-edit`, `new-routine-screen`, `cardio-modality-card`, `progression/rest-days`) | ninguna de esas pantallas tiene un chip seleccionado en volt (cierra el kill-test «dos rellenos volt» en Reels, Registrar peso, Onboarding, Mis datos, Rutina nueva, Cardio y Senda) | capturas antes/después + grep de `backgroundColor: colors.volt` en esos archivos | TODO |
| H1.S2.M9 | `DiscoveryPreferencesEditor` (se reusa en Comunidad y Mapa): `FilterChip` + `Checkbox` en lugar de `☑`/`□`, etiquetar los 3 `TextInput`, explicar el botón deshabilitado (AS-45) | lector de pantalla anuncia rol y estado de cada casilla | prueba manual VoiceOver registrada en `evidencia/a11y-h1.md` | TODO |

### H1.S3 — Pasada «calma» sobre superficies comunes

| ID | Microtarea | CA | DoD | Estado |
|---|---|---|---|---|
| H1.S3.M1 | `ScreenHeader`: título `display` con tracking −3 %, subtítulo `callout` muted, una acción; acción secundaria pasa a ⋯ | 8 pantallas capturadas antes/después | capturas | TODO |
| H1.S3.M2 | `Card`: `surfaceRaised` + `elevation.raised` en vez de borde `borderSubtle`; `borderCurve: 'continuous'` | captura | capturas | TODO |
| H1.S3.M3 | Barra de pestañas: iconos `lg`, etiqueta `caption`, badge numérico único (reutilizado por Mensajes) | captura | captura | TODO |
| H1.S3.M4 | Auditoría de «una acción volt por pantalla» en Inicio, Rutinas, Comunidad, Perfil: los demás a `ghost`/texto | tabla pantalla → acción primaria | `evidencia/h1-acento.md` | TODO |
| H1.S3.M5 | Estados faltantes BLOQUEANTES del inventario (p. ej. podio de Comunidad devolviendo `null` en error) | cada uno con `EmptyState`/`ErrorState` | capturas | TODO |
| H1.S3.M6 | Movimiento: `useReducedMotion` en todo bucle o entrada que H0 encontró sin él; `EnterUp` solo en la primera pantalla | grep de `withRepeat` sin guarda = 0 | grep + captura | TODO |
| H1.S3.M7 | **Honestidad de Comunidad** (decisión A-H1: cuenta como «resto de la app», no como mensajería): quitar la insignia «verificado» incondicional (`comunidad.tsx:1297-1298`) o condicionarla a un dato real; no pintar «Super Like» mientras ejecute lo mismo que «Me interesa» (`:1524-1530`); quitar el objetivo `'HIPERTROFIA'` inventado del filtro (`:981`) | ningún control ni insignia afirma algo que el dato no respalda | capturas + test de la baraja; regla 00 §2 | TODO |
| H1.S3.M8 | Acento por pantalla: «Conectar» en la cuadrícula de Interacciones pasa a `secondary` (primario solo en la tarjeta ampliada) y «Consultar» de cada plan en Membresía a `ghost` | un solo relleno volt por pantalla en ambas | capturas | TODO |
| H1.S3.M9 | `settings.tsx:104-106`: rama de error en lugar del spinner infinito; `fontSizes.micro` fuera de `top-gym-sheet.tsx` y `download-progress-wizard-modal.tsx` (el token se borra cuando chat y marketplace dejen de usarlo) | Ajustes ofrece reintento; `micro` = 0 usos fuera de chat/marketplace | capturas + grep | TODO |
