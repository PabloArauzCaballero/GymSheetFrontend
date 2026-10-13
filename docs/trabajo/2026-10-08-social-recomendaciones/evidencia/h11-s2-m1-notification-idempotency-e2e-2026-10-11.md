# H11.S2.M1 — Aceptación de conexión, deduplicación y entrega por worker

Fecha: 2026-10-11

La prueba PostgreSQL usa una base vacía temporal `h11_s2_m1_<uuid>` creada únicamente después de comprobar que la configuración apunta a `gymsheet_social_qa` en `127.0.0.1:55432`. Registra dos cuentas, crea una solicitud real mediante `POST /me/connections` y la acepta con `PATCH /me/connections/:id`. El productor conectado a `SocialService` encola aviso, evento de dominio y trabajo outbox dentro de la transacción de aceptación. El auto-accept de solicitud inversa utiliza el mismo productor.

Primero se inyecta un fallo al escribir outbox: el PATCH responde 500 y la DB conserva la conexión en `PENDING`, con cero mensajes y cero trabajos. Al repetir la aceptación normalmente, queda una sola conexión aceptada, mensaje y trabajo. Repetir la misma clave devuelve `false`. El worker real deja el aviso `IN_APP` en `SENT`, un intento de entrega, job `COMPLETED` y `attempt_count=1`. El test elimina la base temporal y comprueba que ya no figura en `pg_database`.

El canal es `IN_APP`; la cuenta nueva no registra dispositivos. Así se prueba el worker sin enviar push real. La ruta de auto-accept por solicitud inversa usa el productor compartido y su test unitario ahora verifica la llamada al notifier con la transacción; el E2E del endpoint valida la aceptación directa (`PATCH`). No ejecuta dos procesos concurrentes ni acredita recepción física de push.

Comandos ejecutados en `GymSheetBackend`:

- `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test corepack yarn test:e2e --runTestsByPath test/social/moderacion-avisos.e2e-spec.ts -t 'H11.S2.M1' --runInBand` — PASS, 1/1; migraciones completas aplicadas a la base temporal, worker y cleanup verificados.
- `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn test --runInBand src/modules/notifications/notification.service.idempotency.spec.ts src/modules/social/social.service.spec.ts` — PASS, 39/39: 3 de notificaciones y 36 de SocialService.
- La aserción del auto-accept por solicitud inversa confirma destinatario, canal `IN_APP`, clave estable y transacción; quedó dentro de SocialService.
- `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn type-check` — PASS.
- `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn eslint test/social/moderacion-avisos.e2e-spec.ts` — PASS.
- `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn prettier --check test/social/moderacion-avisos.e2e-spec.ts` — PASS.

H11.S2.M1 queda implementado parcialmente: la aceptación real, la escritura atómica del outbox, el rollback y la entrega idempotente por worker están cubiertos. Dedupe entre procesos y push real requieren evidencia adicional; la fila se mantiene EN CURSO.
