# H10.S1.M3 — aceptación parcial

Fecha: 2026-10-11. Alcance: transición de aceptación de una invitación, autorización del destinatario, revisión esperada, idempotencia concurrente y protección del historial en PostgreSQL. No cierra H10.S1.M3 porque todavía no hay creación transaccional de encuentro ni evento de chat.

## Verificación

Base permitida por el guard del E2E: PostgreSQL local `127.0.0.1:55432/gymsheet_social_qa`.

```sh
env PATH=/opt/homebrew/opt/node@22/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin \
  DB_HOST=127.0.0.1 DB_PORT=55432 DB_NAME=gymsheet_social_qa \
  DB_USER=postgres DB_PASSWORD=qa NODE_ENV=test \
  corepack yarn test:e2e --runTestsByPath test/social/entrenar-juntos.e2e-spec.ts \
  -t 'H10.S1.M3' --runInBand
```

Resultado observado: **PASS 1/1**. La prueba deniega actor distinto del destinatario y revisión obsoleta; dos solicitudes concurrentes con el mismo `clientRequestId` devuelven la misma aceptación y dejan una respuesta, un comando y una revisión. UPDATE/DELETE directos sobre revisiones fallan; constraints/FK rechazan estado o revisión de respuesta incoherentes. La eliminación de la invitación limpia revisiones y comandos relacionados.

Comprobaciones adicionales: backend `yarn type-check` PASS; ESLint focal PASS; registro de migraciones 4/4 PASS; `git diff --check` PASS. La migración 003 se revirtió y reaplicó en QA cuando ya no existían invitaciones/comandos/respuestas. Cleanup posterior: usuarios, invitaciones, comandos y tenants H10 en cero.

## Límite funcional

La implementación guarda el estado `ACCEPTED` y su comando idempotente. No crea un encuentro con dos participantes ni publica un evento de chat, así que la condición completa del plan sigue abierta. No se probó agenda, UI ni PAIR.
