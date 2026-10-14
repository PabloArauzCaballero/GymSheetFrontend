# H8.S2.M4 — Rechazo de reacción tras desconexión (2026-10-10)

El backend vuelve a validar visibilidad y conexión al recibir la reacción. La E2E carga el feed mientras la conexión está aceptada, elimina esa conexión antes del POST, y comprueba que la petición devuelve 404 sin crear chat ni mensaje.

## Verificación

- PostgreSQL 16 temporal aislado en `127.0.0.1:55432/gymsheet_social_qa`.
- `yarn test:e2e --runTestsByPath test/social/historias.e2e-spec.ts -t 'H8.S2.M4' --runInBand` — PASS, 1/1; además conserva las aserciones de H8.S1.M2/M4 y H8.S2.M1–M3 en el mismo caso E2E.
- SQL verifica cero conversaciones y mensajes entre las dos cuentas luego del 404.

La acción de reacción todavía se ofrece solo por API, no desde la UI web/móvil. PAIR queda pendiente para H8.S3.M1.
