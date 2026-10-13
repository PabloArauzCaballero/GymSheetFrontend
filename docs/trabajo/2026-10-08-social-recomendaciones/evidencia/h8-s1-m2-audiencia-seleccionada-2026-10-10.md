# H8.S1.M2 — Audiencia seleccionada y media autorizada (2026-10-10)

## Resultado

PASS en API sobre PostgreSQL 16 temporal y aislado (`127.0.0.1:55432/gymsheet_social_qa`). A publica una story con audiencia `SELECTED_CONNECTIONS` y elige B. B, conexión aceptada, la recibe en el feed y descarga sus bytes por la ruta autenticada. C también es conexión aceptada, pero no seleccionada: no recibe la story en el feed, obtiene 404 al intentar registrar una vista y al solicitar media, y el adaptador no descarga bytes para esa petición. El DTO entrega `/me/stories/:id/media`, no la URL pública del storage. La misma E2E conserva la aserción H8.S1.M4: solo A consulta viewers y un tercero obtiene 404.

El feed, la vista y la descarga de media comparten la política de audience y verifican conexión aceptada vigente, expiración, moderación y bloqueos. El cliente web pasa media privada por el BFF autenticado; el móvil adjunta el bearer a las fuentes de imagen y vídeo y pausa el avance hasta resolver la sesión.

## Comandos ejecutados

La primera ejecución encontró que la base temporal todavía no tenía la migración nueva (`column "audience_mode" ... does not exist`). Se aplicó solo a esa base local:

```text
env DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH corepack yarn migration:up
```

Salida: `migration.completed`, `migrationId: 202610100001-stories-selected-audience`.

```text
env DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:$PATH corepack yarn test:e2e --runTestsByPath test/social/historias.e2e-spec.ts -t 'H8.S1.M2' --runInBand
```

Salida final: `PASS test/social/historias.e2e-spec.ts`; 1/1.

```text
PATH=/opt/homebrew/opt/node@22/bin:$PATH corepack yarn jest src/modules/stories/stories.service.spec.ts src/modules/stories/story-audience.policy.spec.ts --runInBand
PATH=/opt/homebrew/opt/node@22/bin:$PATH corepack yarn type-check
PATH=/opt/homebrew/opt/node@22/bin:$PATH corepack yarn workspace @gymsheet/mobile type-check
PATH=/opt/homebrew/opt/node@22/bin:$PATH corepack yarn workspace @gymsheet/web test --run src/shared/components/media/domain-image.test.tsx src/shared/server/backend-route-policy.test.ts
```

Resultados: 30/30 unitarias; backend type-check PASS; mobile type-check PASS; web 72/72 PASS (69 policy + 3 media proxy).

## Alcance pendiente

Esta evidencia cierra la regla API de H8.S1.M2, no la aceptación visual/nativa. La interfaz para elegir contactos y publicar con la audiencia seleccionada, y su recorrido PAIR, siguen pendientes en H8.S3.M1. Las pruebas usan storage sustituido por un proveedor local de prueba; no validan MinIO/CDN real ni dispositivos.
