# H11.S2.M2 — suprimir avisos tras revocar la conexión

**Estado:** HECHO en API/worker; PostgreSQL E2E PASS.

La aceptación encola el aviso `CONNECTION_ACCEPTED`. Si cualquiera bloquea o revoca la conexión antes de que el worker la procese, el worker vuelve a consultar el estado de esa relación, cambia el mensaje a `SUPPRESSED`, no invoca el adaptador de entrega y completa el trabajo del outbox. La migración `202610130003-notification-suppression` amplía el constraint, y el enum compartido expone `SUPPRESSED`.

## Verificación

- `AUTH_RATE_LIMIT_MAX=100 DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts --runInBand` → **PASS 2/2** para H11.S2.M1 y H11.S2.M2. La prueba M2 comprueba bloqueo posterior al enqueue, estado `SUPPRESSED`, outbox `COMPLETED`, cero intentos de entrega y cero conexiones aceptadas.
- La suite verifica su propia conexión con `SELECT current_database()` contra el nombre desechable de la corrida. El módulo Nest se importa después de configurar ese nombre para evitar capturar la DB base al cargar el módulo.
- `yarn test --runTestsByPath src/database/migrations/migrations.registry.spec.ts` → **PASS 4/4**.
- Type-check Backend y Frontend y ESLint focal → **PASS**.
- La base temporal se eliminó al terminar; la comprobación de QA local encontró cero cuentas H11 de fixture, mensajes sin dueño y jobs `connection.accepted` pendientes.

H11.S2.M1 permanece EN CURSO por deduplicación entre procesos y prueba física de push. No se envió push externo.
