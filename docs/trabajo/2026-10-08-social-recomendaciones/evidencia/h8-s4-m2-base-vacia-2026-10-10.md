# H8.S4.M2 — Migraciones desde base vacía (2026-10-10)

La prueba focal creó una base PostgreSQL aleatoria desde `template0`, aplicó el registro completo de migraciones y comparó los IDs persistidos con `databaseMigrations`. Después insertó un propietario y una persona destinataria, una story `SELECTED_CONNECTIONS` con `requestId` y hash SHA-256, y su fila de audiencia; la consulta final confirmó todos los valores.

## Verificación

- `corepack yarn test:e2e --runTestsByPath test/social/historias-migration.e2e-spec.ts -t 'H8.S4.M2' --runInBand` — PASS, 1/1.
- `corepack yarn type-check` — PASS.
- ESLint focal de `test/social/historias-migration.e2e-spec.ts` — PASS.
- `git diff --check` — PASS.
- Consulta de `pg_database` después del caso — no quedaron bases `h8_s4_m2_*`.

El test exige `DB_HOST` local y `DB_NAME=gymsheet_social_qa`; crea y elimina una base de nombre aleatorio y restaura `env.DB_NAME` en `finally`. No altera la base QA ni usa cuentas reales. Esto valida migraciones y fixture de base de datos, no la aceptación PAIR del hito.
