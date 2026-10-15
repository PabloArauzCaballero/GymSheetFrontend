# H11.S2.M1 — Idempotencia de encolado de notificaciones

Fecha: 2026-10-11

Se añadió una prueba focal para el camino compartido `NotificationService.enqueueDirectMessage`. La suite verifica que el primer evento guarda el aviso y escribe un único trabajo `notifications.delivery` con la misma clave de idempotencia; un reintento que colisiona con la restricción única devuelve `false`. También se cubre el camino de auto-accept cuando el actor envía solicitud inversa: se confirma que el productor usa al solicitante original como destinatario, establece una clave estable `connection.accepted:<id>:<requester>` y recibe la misma transacción que aceptó la conexión.

Comandos ejecutados en `GymSheetBackend`:

- `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn test --runInBand src/modules/notifications/notification.service.idempotency.spec.ts src/modules/social/social.service.spec.ts` — PASS, 39/39 (3 notificaciones + 36 SocialService).
- `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn eslint src/modules/social/social.service.spec.ts` — PASS.
- `env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin corepack yarn prettier --check src/modules/social/social.service.spec.ts` — PASS.
- `PATH=/opt/homebrew/opt/node@22/bin:$PATH corepack yarn type-check` — PASS.

Esta evidencia unitaria complementa el [E2E de aceptación y entrega por worker](h11-s2-m1-notification-idempotency-e2e-2026-10-11.md). La prueba E2E cubre `PATCH` real; la ruta de auto-accept se confirma aquí a nivel de servicio. No cubre dedupe entre procesos ni transporte push físico; H11.S2.M1 sigue EN CURSO.
