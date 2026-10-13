# H8.S2.M3 — Referencia de story no disponible (2026-10-10)

El historial proyecta cada referencia como `{ storyId, available }`. El backend determina `available` en una consulta batch por página; una story oculta, expirada o purgada se entrega como no disponible. Web y móvil conservan el texto del mensaje y muestran “Historia no disponible”, sin volver a consultar la story ni cargar su media.

## Verificación

- PostgreSQL 16 temporal aislado en `127.0.0.1:55432/gymsheet_social_qa`; migraciones hasta `202610100003` aplicadas.
- `yarn test:e2e --runTestsByPath test/social/historias.e2e-spec.ts -t 'H8.S2.M3' --runInBand` — PASS, 1/1. Comprueba referencias vigentes, ocultas, expiradas y purgadas; texto preservado y `mediaUrl` nulo.
- Frontend web: pruebas de presentación focales 6/6; móvil: pruebas del estado de referencia 2/2; type-check web/móvil y schema PASS.
- ESLint focal web/móvil y `git diff --check` en frontend/backend — PASS.

No hubo PAIR ni recepción en dos dispositivos. H8.S2.M4 y H8.S3.M1 PAIR siguen pendientes.
