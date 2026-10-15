# H8.S4.M1 — Migración de stories conserva filas legacy (2026-10-10)

La E2E comprueba compatibilidad de `202610100004-story-upload-idempotency` usando una transacción en la base local aislada. Recrea la forma anterior de la tabla, inserta una story legada, reaplica la migración y verifica que la fila permanece con defaults seguros. Constraint tests dentro de savepoints rechazan clave/hash incompletos, hash con formato inválido y clave repetida por el mismo owner; todo el trabajo de fixture se revierte.

## Verificación

- Base: `127.0.0.1:55432/gymsheet_social_qa`; guard del E2E impide correr en otro host o base.
- `yarn test:e2e --runTestsByPath test/social/historias-migration.e2e-spec.ts -t 'H8.S4.M1' --runInBand` — PASS 1/1.
- Backend `yarn type-check`, ESLint focal del test/migración y `git diff --check` — PASS.

No hubo `DROP DATABASE` ni se modificó el esquema QA de forma persistente; la transacción revirtió el `down/up` al estado aplicado.
