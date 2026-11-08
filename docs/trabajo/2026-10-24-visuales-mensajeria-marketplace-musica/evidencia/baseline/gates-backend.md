# H0.S1.M2 — Gates de partida del backend (GymSheetBackend)

- Fecha: 2026-10-24 · Repo: `/home/user/GymSheetBackend` · Rama: `claude/brave-pasteur-t5425i` · Node v22.22.0 · yarn 1.22.22
- Alcance: solo medir. No se editó ningún archivo versionado del backend (`git status --short` vacío al terminar; `.env` está en `.gitignore`).
- Peldaño: `RUNS` para lint / type-check / arranque; `TESTED` para unitarias; e2e **FAIL** (ver clasificación). Nada de esto sube a `VERIFIED` (no se ejercitó ningún flujo de usuario).

## Resumen

| Gate | Comando | Exit | Resultado |
|---|---|---|---|
| Migraciones | `yarn migration:up` | 0 | 117 migraciones aplicadas (`app_meta.schema_migrations` = 117) sobre baseline `docs/db/schema.sql` |
| Salud API | `GET /api/v1/health/live` · `/ready` | — | 200 · 200 (`database: ready`, `migrations: up-to-date`, `redis: not-configured`) |
| Lint | `yarn lint` | 0 | limpio (44,9 s) |
| Type-check | `yarn type-check` | 0 | limpio (21,3 s) |
| Unitarias, 1.ª corrida (BD migrada **sin** seed) | `yarn test` | **1** | 167/168 suites, 1509/1526 tests; 17 fallos en `muscles.service.integration.spec.ts` (ENVIRONMENT/DATA) |
| Unitarias, 2.ª corrida (tras seed + enrich) | `yarn test` | 0 | 168/168 suites, 1526/1526 tests (46,8 s) |
| E2E (BD `gym_sheet_e2e` migrada + seed + enrich, `DEFAULT_TENANT_ID` vacío) | `yarn test:e2e` | **1** | 42 pass / 9 fail / 1 skip de 52 suites; 350 pass / 47 fail / 1 skip de 398 tests (247 s) |
| E2E suites con guarda `gymsheet_social_qa:55432` (clúster aparte) | `jest --config test/jest-e2e.json` (reels, entrenar-juntos, moderación-avisos, historias-migration) | 1 | 3 de 4 suites PASS; 1 fallo (TEST_BUG, abajo) |

**Importante: «health» no está en `/health/live` sino bajo el prefijo global: `/api/v1/health/live` y `/api/v1/health/ready`** (`API_PREFIX=api/v1`; `/health/live` sin prefijo devuelve 404). CLAUDE.md del backend lo documenta sin prefijo.

## Entorno levantado

- **Docker no sirve**: `docker info` → `failed to connect to the docker API at unix:///var/run/docker.sock` (sin daemon). Se usaron binarios locales de PostgreSQL 16.
- **PostgreSQL 16**: `/usr/lib/postgresql/16/bin`, datos en `/var/lib/postgresql/gymsheet-pg16` (el directorio de scratchpad no es traversable por el usuario `postgres`), puerto **5433**, `127.0.0.1`, socket en `/tmp`, log `/var/lib/postgresql/gymsheet-pg16/server.log`. postmaster PID **6453**. Rol `gym_sheet_writer` (SUPERUSER, igual que `POSTGRES_USER` en compose) y BD `gym_sheet`. Superusuario de clúster: `postgres`.
- **Orden de creación** (réplica de compose: `schema.sql` se aplica al crear la BD vacía, luego `migrate`): `psql -f docs/db/schema.sql` → `yarn migration:up` → seeds.
- **`.env`** (ignorado por git; copiado de `.env.example`; secretos aleatorios generados localmente, no se imprimen aquí): `PORT=3005`, `DB_PORT=5433`, `DB_NAME=gym_sheet`, `DB_USER=gym_sheet_writer`, `RATE_LIMIT_MAX=1000`, `AUTH_RATE_LIMIT_MAX=100`, `MEDIA_STORAGE_PUBLIC_BASE_URL=http://localhost:3005/media`, `SEED_ADMIN_EMAIL=admin@qa.test`, `SEED_ADMIN_PASSWORD`/`SEED_MOCK_PASSWORD`/`JWT_*`/`DB_PASSWORD` aleatorios. Se dejó `DEFAULT_TENANT_ID=topfitness` (valor de `.env.example`).
- **API**: `yarn start` (= `nest start`, compila a `dist/` y corre `node dist/main`), lanzada con `setsid nohup yarn start > /tmp/claude-0/api.log`. PIDs: `nest start` 6656 (sh 6655), proceso de la API **6903** (sh 6902). Puerto **3005**. Log: `/tmp/claude-0/api.log`. Redis no configurado (rate limit por proceso). Los workers (access, reminders, notifications…) **no** están arrancados.
- BD extra en el mismo clúster :5433: `gym_sheet_e2e` (migrada + seed + enrich, usada por `yarn test:e2e` para no contaminar `gym_sheet` con usuarios sintéticos de las suites). Se borraron `gym_sheet_e2e_clean`.
- Clúster auxiliar `/var/lib/postgresql/gymsheet-pg16-socialqa` en el puerto 55432 (BD `gymsheet_social_qa`): **detenido** al terminar. Reinicio: `su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/gymsheet-pg16-socialqa -o '-p 55432 -c listen_addresses=127.0.0.1 -c unix_socket_directories=/tmp/pgsq' -l /var/lib/postgresql/gymsheet-pg16-socialqa/server.log -w start"`.
- `gym_sheet` (la que usa la API) quedó con: schema.sql + 117 migraciones + `yarn db:seed:all:development` (×2) + `yarn db:enrich:exercises`. **No** se corrió `db:seed:showcase`.
- Cómo reparar/parar: `kill 6903 6656` (API); `su postgres -c "/usr/lib/postgresql/16/bin/pg_ctl -D /var/lib/postgresql/gymsheet-pg16 -m fast stop"` (Postgres).

## Gates (salida literal recortada)

### 1. `yarn migration:up` → exit 0
```text
(últimas líneas; 943 líneas de log en total; 117 eventos migration.completed)
{ event: 'migration.started',   migrationId: '202610220001-workout-exercise-swaps' }
{ event: 'migration.completed', migrationId: '202610220001-workout-exercise-swaps' }
Done in 9.37s.
SELECT count(*) FROM app_meta.schema_migrations  ->  117
```

### 2. Salud
```text
$ curl -s -w ' HTTP %{http_code}' localhost:3005/api/v1/health/live
{"ok":true,"data":{"status":"ok","timestamp":"2026-10-24T16:19:01.899Z"}} HTTP 200
$ curl -s -w ' HTTP %{http_code}' localhost:3005/api/v1/health/ready
{"ok":true,"data":{"status":"ok","timestamp":"...","dependencies":{"database":"ready","migrations":"up-to-date","redis":"not-configured"}}} HTTP 200
$ curl localhost:3005/health/live   -> 404 Cannot GET /health/live   (sin prefijo)
```
Login real contra la API: `POST /api/v1/auth/login` con `admin@qa.test` → HTTP 201, `user.rol = ADMIN`, devuelve accessToken/refreshToken (valores no impresos).

### 3. `yarn lint` → exit 0
```text
$ eslint .
Done in 44.88s.
```

### 4. `yarn type-check` → exit 0
```text
$ tsc --noEmit
Done in 21.28s.
```

### 5. `yarn test` (unitarias)
1.ª corrida, BD migrada sin seed → **exit 1**:
35:FAIL src/modules/exercises/muscles/muscles.service.integration.spec.ts
849:FAIL modules/exercises/muscles/muscles.service.integration.spec.ts
1089:Test Suites: 1 failed, 167 passed, 168 total
1090:Tests:       17 failed, 1509 passed, 1526 total
1092:Time:        68.56 s
```
  ● MusclesService.getMuscle (SQL real) › returns the Spanish name, the Latin name and the group of a muscle

    No hay PostgreSQL migrado y enriquecido en localhost:5433/gym_sheet (training.exercise_muscles está vacía: falta `yarn db:enrich:exercises`). Levanta la base, `yarn migration:up`, `yarn db:seed:all:development` y `yarn db:enrich:exercises`, o sáltalas deliberadamente con SKIP_DB_INTEGRATION_TESTS=1.

```
Clasificación: **ENVIRONMENT/DATA** (prerrequisito documentado por la propia spec: `yarn db:seed:all:development` + `yarn db:enrich:exercises`; la spec falla a propósito con instrucciones en vez de pasar en silencio). Evidencia: tras ejecutar ambos comandos, la 2.ª corrida pasa.

2.ª corrida, tras seed + enrich → **exit 0**:
```text
Test Suites: 168 passed, 168 total
Tests:       1526 passed, 1526 total
Snapshots:   0 total
Time:        46.781 s, estimated 68 s
```

### 6. `yarn test:e2e`
Preparación (BD `gym_sheet_e2e`, `DB_NAME` y `DEFAULT_TENANT_ID=` exportados): schema.sql → `migration:up` → `db:seed:all:development` → `db:enrich:exercises`, los cuatro con exit 0. Un `.env` con `DEFAULT_TENANT_ID=topfitness` (valor de `.env.example`) rompe `progression-prizes` (ver abajo), por eso la corrida final lo vacía.

Resultado final (corrida 3) → **exit 1**:
```text
Test Suites: 9 failed, 1 skipped, 42 passed, 51 of 52 total
Tests:       47 failed, 1 skipped, 350 passed, 398 total
Time:        247.472 s
FAIL test/community-moderation.e2e-spec.ts
FAIL test/routines-recommended.e2e-spec.ts
FAIL test/social-map-places.e2e-spec.ts
FAIL test/social/chat-initial-publication.e2e-spec.ts
FAIL test/social/entrenar-juntos.e2e-spec.ts
FAIL test/social/historias-migration.e2e-spec.ts
FAIL test/social/moderacion-avisos.e2e-spec.ts
FAIL test/social/reels.e2e-spec.ts
FAIL test/workout-free-and-swap.e2e-spec.ts
```

Corridas previas (para contexto, misma BD recreada): corrida 1 (seed, `DEFAULT_TENANT_ID=topfitness`) = 10 suites fallidas / 48 tests (la décima era `progression-prizes`); corrida 2 (BD **sin** seed, tenant vacío) = 17 suites fallidas / 111 tests. Conclusión: el conjunto e2e exige BD sembrada **y** `DEFAULT_TENANT_ID` vacío, y aun así `workout-free-and-swap` solo pasa **sin** seed (los datos que necesita una suite chocan con los que necesita otra).

#### Clasificación de fallos e2e (corrida 3, más aislamientos posteriores)

| Suite | Tests fallidos | Clase | Evidencia |
|---|---|---|---|
| `routines-recommended` | 6/6 (`beforeAll` falla) | **PRODUCT_BUG** | Log de Postgres: `new row for relation "perfiles_antropometricos" violates check constraint "ck_perfiles_objetivo"`, fila con `objetivo = RENDIMIENTO_DEPORTIVO`. El enum de código tiene `SPORT_PERFORMANCE = "RENDIMIENTO_DEPORTIVO"` (`src/common/enums/domain.enums.ts:30`) y la migración `202610060001-routine-workout-flow.ts:11` lo añadió a `training.routines.ck_routine_goal`, pero ninguna migración amplía `ck_perfiles_objetivo`, que viene solo de `docs/db/schema.sql:73` y admite 6 valores (sin RENDIMIENTO_DEPORTIVO). Falla el onboarding del seeder showcase (`routines-showcase.seed.ts:309` → `onboarding.service.ts:126`); es esperable que el onboarding real con ese objetivo también devuelva error. No se arregló. |
| `social-map-places` | 3 | **DATA** (2) + **TEST_BUG/stale** (1) | Tests 1-2 buscan «La Paz» y gimnasios OSM importados: el flujo de importación (`scripts/qa/extract-osm-social-places.py`, requiere snapshot Geofabrik/red) no se ejecutó → resultado `[]`. Test 3 espera 400 para un área de 0,8°×2° pero `src/modules/social/social-map.policy.ts:110` fija `MAX_GYM_QUERY_DEGREES = 3` → 200. |
| `community-moderation` | 3 | Causa raíz **no determinada** (PRODUCT_BUG o TEST_BUG) | Reproducible en aislamiento y con BD sembrada o no. (a) la bandeja de la autora no contiene `CONTENT_HIDDEN` tras ocultar la rutina; (b) denunciar la propia rutina privada devuelve 404 (se espera 409); (c) denunciar un ejercicio ya oculto devuelve 201 (se espera 404). No se diagnosticó más (alcance: solo medir). |
| `social/chat-initial-publication` | 1 (`H7.S2.M3`) | Probable **TEST_BUG** (hipótesis, sin confirmar) | El push se emite con `body: "Tienes un mensaje nuevo."` y la spec espera el texto del mensaje. Es coherente con la regla de privacidad de H11 («oculta el texto privado del push salvo opt-in», `moderacion-avisos` pasa), que la spec H7 no refleja. |
| `workout-free-and-swap` | 2 | **DATA** | Pasa con BD sin seed y falla con seed (`propuestos` esperado 0, recibido 6): la suite asume catálogo vacío de pecho/brazos; el seed carga 1.324 ejercicios. |
| `social/entrenar-juntos` (en clúster 55432) | 1 (`H10.S2.M1/M3/M4/M5`) | **TEST_BUG** / deriva de contrato | La spec espera `ejercicios[].rutinaEjercicioId` (`entrenar-juntos.e2e-spec.ts:1542`); la cadena `rutinaEjercicioId` no existe en `src/`. No se determinó si falta el campo o la aserción es vieja. |
| `social/entrenar-juntos` (7 tests), `social/reels` (resto), `social/moderacion-avisos`, `social/historias-migration` | — en `gym_sheet_e2e` | **ENVIRONMENT** | Las suites abortan por guarda: `runs only against the isolated local gymsheet_social_qa database` (`DB_NAME`, `DB_HOST=127.0.0.1`, `DB_PORT=55432`). En un clúster 55432 con esa BD (migrada + seed + enrich): `reels` PASS, `moderacion-avisos` PASS, `historias-migration` PASS, `entrenar-juntos` 1 fallo (fila anterior). Nota: `reels.H9.S4.M1` exige `DB_HOST` exactamente `127.0.0.1` (el `.env.example` trae `localhost`). |
| `progression-prizes` | 1 (solo con `.env` por defecto) | **ENVIRONMENT** | Espera `tenantId: "default"`, recibe `"topfitness"` por `DEFAULT_TENANT_ID=topfitness` del `.env.example`; con `DEFAULT_TENANT_ID=` pasa. |

Comando exacto de las suites guardadas: `DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DEFAULT_TENANT_ID= npx jest --config ./test/jest-e2e.json --runInBand test/social/reels test/social/entrenar-juntos test/social/moderacion-avisos test/social/historias-migration`.
(Nota: `test/social/entrenar-juntos-migrations.e2e.ts` no coincide con el `testRegex` `.e2e-spec.ts$`; es un helper que `entrenar-juntos.e2e-spec.ts` importa, por eso aparece en la corrida con `yarn test:e2e` como tests H10.S4.M1/M2.)

Logs completos (no versionados): `/tmp/claude-0/g/{lint,tc,test,test-run1-unseeded,e2e,e2e2,e2e3,sq,sq2}*.log`.

## Cuentas de prueba / QA — procedimiento real

**Las cuentas `*.qa.test` del plan (`super@qa.test`, `admin.a@qa.test`, `socio.a@qa.test`) no las crea ningún seed ni script del repo backend** (búsqueda de `qa.test` en backend: sin coincidencias salvo mi propio `.env`). Solo aparecen citadas en `GymSheetFrontend/docs/refactor-profesional/trabajo/{ESTADO,HALLAZGOS,FLUJO_VERTICAL,ENTREGA,ADMIN_GIMNASIO}.md` como usadas en una sesión previa, sin procedimiento de creación documentado. Lo que sí existe (oficial, idempotente, `src/database/seeders/seed.ts` + `README.md` de seeders):

| Qué | Comando | Cuentas |
|---|---|---|
| Admin de gimnasio | `yarn db:seed:base` con `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` | rol `ADMIN`. **Ya ejecutado**: `admin@qa.test` (elegido por mí en `.env`, no es `admin.a@qa.test`) |
| Admin de plataforma (opcional) | mismo comando con `SEED_SYSTEM_ADMIN_EMAIL` + `SEED_SYSTEM_ADMIN_PASSWORD` (+ `SEED_SYSTEM_ADMIN_FULL_NAME`) | rol `SYSTEM_ADMIN`. No sembrado |
| Cuenta corporativa de chat (opcional) | `SEED_SYSTEM_CORPORATE_EMAIL`/`_PASSWORD` | rol CLIENT. No sembrado |
| Mocks (no producción) | `yarn db:seed:mock` con `SEED_MOCK_PASSWORD` | `coach.mock@gymsheet.local` (COACH), `athlete.mock@`, `inactive.mock@` (INACTIVO), `new.mock@`, `onboarding.mock@`, `active.mock@`, `expiring.mock@`, `expired.mock@`, `pending.mock@` (todas `@gymsheet.local`, CLIENTE). **Ya ejecutado** vía `db:seed:all:development` |
| Todo junto | `yarn db:seed:all:development` | base + mock + catálogo (1.324 ejercicios), permisos, niveles/insignias de progresión. **Ejecutado 2 veces**: 2.ª corrida `created: 0, updated: 0, unchanged: 10, exercisesInserted: 0` (levels/badges/branches se reportan como `updated` en cada corrida, son upserts; no hay duplicados) |
| Enriquecimiento de ejercicios | `yarn db:enrich:exercises` | necesario para `muscles.service.integration.spec.ts`; determinista |
| Demo REPP | `SEED_SHOWCASE_PASSWORD=… yarn db:seed:showcase` | 8 personas `@demo.repp.test`, 20 rutinas oficiales… **No ejecutado**; hoy fallaría por el PRODUCT_BUG de `ck_perfiles_objetivo` (ver `routines-recommended`) |
| Demo comunidad | `SEED_DATABASE_URL=… npx ts-node scripts/seed-demo-community.ts [anchorUserId]` | no ejecutado |
| Marketplace/Directorio | `src/database/seeders/seed-marketplace-test.sql` (SQL manual; no referenciado por ningún script/doc) | no ejecutado |
| Cuenta nueva por API | `POST /api/v1/auth/register` (`acceptedTerms: true`; `tenantId` opcional, con `DEFAULT_TENANT_ID=topfitness` se adscribe a ese gimnasio) | cualquiera |

Para reproducir los nombres del plan, el camino oficial sería fijar en `.env` `SEED_ADMIN_EMAIL=admin.a@qa.test`, `SEED_SYSTEM_ADMIN_EMAIL=super@qa.test` (+ contraseñas) y volver a correr `yarn db:seed:base`; `socio.a@qa.test` (un socio de otro gimnasio) no tiene seed y habría que crearlo por `register` con otro `tenantId` (no verificado que otro tenant exista como gimnasio: el seed crea `tenantsCreated`/`branches` desde `facilities.seed.ts`).

## No cubierto

- No se ejercitó ningún flujo de usuario del frontend ni la web contra esta API; solo health + un login.
- Workers (access, reminders, notifications, stories-purge, programs-week-close, exercises-dataset) no arrancados ni verificados.
- `yarn build` / `start:prod`, `yarn audit:prod`, `test/load` y `format:check` no se ejecutaron (no pedidos).
- Redis no configurado: rate limiting por proceso, sin probar `REDIS_REQUIRED`.
- Docker / `docker-compose.yml` no se pudo usar (sin daemon): la pila compose real no se verificó; el entorno es una réplica con binarios locales.
- E2E: las suites guardadas por `gymsheet_social_qa:55432` se corrieron en un clúster auxiliar y no forman parte de la cifra de `yarn test:e2e`; no se corrió una suite e2e completa dentro de un solo entorno donde todas puedan pasar (hay contradicciones de datos entre suites, arriba).
- Causa raíz no determinada para `community-moderation` (3 tests) y no confirmada para `chat-initial-publication`; ningún fallo se corrigió (instrucción del encargo).
- Datos de QA del plan (`*.qa.test`) no existen en esta BD.
