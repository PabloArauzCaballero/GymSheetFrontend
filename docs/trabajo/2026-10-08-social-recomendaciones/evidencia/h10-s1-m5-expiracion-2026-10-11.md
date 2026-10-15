# H10.S1.M5 — expirar invitación al comenzar

Fecha: 2026-10-11. Resultado: **PASS en PostgreSQL QA local**.

Al aceptar una invitación pendiente cuya revisión vigente tiene `starts_at <= clock_timestamp()`, el backend cambia el estado a `EXPIRED` dentro de la transacción y registra el comando con resultado `EXPIRED`. Después de confirmar la transacción, el endpoint devuelve 409. Así el rechazo queda persistido; reintentar la misma clave devuelve 409 sin duplicar el comando. Una clave distinta también recibe 409 y no crea un encuentro ni evento de chat.

La migración `202610110006-training-invite-expiration` amplía el CHECK de resultados de comandos para admitir `EXPIRED` y protege el rollback si existen comandos de expiración.

## Verificación

- E2E focal `H10.S1.M5`: PASS 1/1; replay y clave nueva reciben 409, el estado `EXPIRED` y un solo comando quedan persistidos, los campos de aceptación siguen nulos y meeting/event permanecen en cero.
- Regresión de invitaciones `H10.S1` (M3–M5): PASS 3/3 en PostgreSQL QA.
- Backend type-check, ESLint focal y Prettier de archivos nuevos: PASS.
- Limpieza SQL independiente: `h10_m5_users=0`, `orphan_training_invites=0`, `h10_temp_databases=0`; la migración figura registrada (`app_meta.schema_migrations=1`).

No hay job que expire proactivamente invitaciones sin una solicitud de aceptación; este caso persiste la expiración al intentar responder. La expiración automática visible en una bandeja requiere un proceso de materialización aparte.
