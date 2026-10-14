# H9.S1.M3 — Reintento idempotente de upload de reels

Fecha de ejecución: 2026-10-11. Entorno: backend local, PostgreSQL QA en `127.0.0.1:55432`, base `gymsheet_social_qa`. No se hicieron commits.

## Alcance implementado

El endpoint multipart `POST /api/v1/me/reels` acepta opcionalmente `requestId` UUID. Para ese flujo, el backend persiste una fila por propietario y request, guarda SHA-256 del contenido y lleva estado/intentos (`PROCESSING`, `FAILED`, `READY`). Si la escritura de media termina pero la petición falla antes de guardar el resultado, el reintento con el mismo `requestId` y contenido completa la misma fila con la clave idempotente de almacenamiento. Reutilizar el mismo `requestId` con contenido distinto responde 409. Un replay de una fila `READY` devuelve el reel existente sin volver a llamar al storage.

La migración aditiva es `202610110001-reel-upload-idempotency`; se registró en `databaseMigrations` y se aplicó a la base QA. Los paths de backend tocados son:

- `GymSheetBackend/src/database/migrations/202610110001-reel-upload-idempotency.ts`
- `GymSheetBackend/src/database/migrations/index.ts`
- `GymSheetBackend/src/modules/reels/reel.model.ts`
- `GymSheetBackend/src/modules/reels/reels.repository.ts`
- `GymSheetBackend/src/modules/reels/reels.service.ts`
- `GymSheetBackend/src/modules/reels/reels.controller.ts`
- `GymSheetBackend/test/social/reels.e2e-spec.ts`

## Comandos y resultados

Migración aplicada al QA local:

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test corepack yarn migration:up
```

Resultado: exit 0; `202610110001-reel-upload-idempotency` inició y completó. El primer intento en sandbox falló con `connect EPERM 127.0.0.1:55432`; el comando se repitió con acceso al PostgreSQL QA local y pasó.

E2E dirigido M3:

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test corepack yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts --runInBand --testNamePattern='H9.S1.M3'
```

Resultado: PASS, 1 test. El caso simula un fallo ambiguo después de escribir el objeto, reintenta con la misma petición, verifica una sola fila `READY`, clave de objeto estable, contador de intentos, replay sin una llamada adicional al storage y 409 ante bytes distintos.

E2E completo de reels:

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test corepack yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts --runInBand
```

Resultado: PASS, 4/4 tests (H9.S1.M1/M2/M4, H9.S1.M3, H9.S4.M1 y H9.S4.M2).

Gates focales:

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn type-check
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn eslint src/modules/reels/reels.controller.ts src/modules/reels/reel.model.ts src/modules/reels/reels.repository.ts src/modules/reels/reels.service.ts src/database/migrations/202610110001-reel-upload-idempotency.ts src/database/migrations/index.ts test/social/reels.e2e-spec.ts
```

Resultado: ambos PASS.

Revisión independiente detectó que el `down` podía borrar claves/intentos persistidos. Se añadió una guarda transaccional: el rollback ahora aborta mientras exista un `processing_request_id` o una fila `PROCESSING`. El E2E dirigido se volvió a ejecutar después del cambio:

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test corepack yarn test:e2e --runTestsByPath test/social/reels.e2e-spec.ts --runInBand --testNamePattern='H9.S1.M3'
```

Resultado: PASS, 1 test; además del retry, el rollback rechazado conserva la fila `READY` y su `processing_request_id`. La suite completa no se repitió después de este guard; se había ejecutado 4/4 antes de añadir la guarda.

## Verificación de limpieza

Después del E2E se consultó la base QA con:

```sh
env PGPASSWORD=qa psql -h 127.0.0.1 -p 55432 -U postgres -d gymsheet_social_qa -Atc "SELECT 'synthetic_accounts=' || count(*) FROM public.usuarios WHERE email LIKE 'reels-%@example.test'; SELECT 'synthetic_reels=' || count(*) FROM social.reels r JOIN public.usuarios u ON u.id = r.user_id WHERE u.email LIKE 'reels-%@example.test'; SELECT 'orphan_reels=' || count(*) FROM social.reels r LEFT JOIN public.usuarios u ON u.id = r.user_id WHERE u.id IS NULL; SELECT 'h9_temp_databases=' || count(*) FROM pg_database WHERE datname LIKE 'h9_%';"
```

Resultado:

```text
synthetic_accounts=0
synthetic_reels=0
orphan_reels=0
h9_temp_databases=0
```

## Límite de evidencia

El test usa un storage stub en memoria para simular la escritura confirmada seguida de un fallo de petición. Acredita persistencia e idempotencia del reintento de upload en el backend. No existe todavía un worker de reels ni una transcodificación; el archivo se guarda sin generar una salida transformada. Por ello, esta evidencia no declara satisfecho el criterio completo de H9.S1.M3, cuyo escenario menciona un worker que falla después de generar el archivo. No se modificaron `PROGRESO.md`, `TRAZABILIDAD.md` ni `REPORTE.md`.
