# H8.S3.M4 — Eliminar story mientras se mira (2026-10-10)

Web y móvil actualizan el feed cada 5 segundos mientras el visor está abierto, sin consultar en segundo plano. Al cambiar el feed, mantienen el story activo si sigue presente; si se eliminó, web cierra y móvil avanza a otra story vigente de la misma persona o cierra el visor. La eliminación del autor no deja una pantalla/modal vacío.

## Verificación

- PostgreSQL 16 temporal aislado en `127.0.0.1:55432/gymsheet_social_qa`.
- E2E dirigida `yarn test:e2e --runTestsByPath test/social/historias.e2e-spec.ts -t 'H8.S3.M4' --runInBand` — PASS, 1/1. El viewer lee feed/view/media; después de borrar, el feed no contiene la story, view/media responden 404 y SQL confirma borrado de story, audiencia y views.
- Web: pruebas focales de stories/lifecycle/reconciliación 7/7; type-check y ESLint focal PASS.
- Móvil: pruebas de lifecycle y reconciliación 6/6; type-check y ESLint focal PASS.
- Backend: type-check, ESLint E2E focal y `git diff --check` PASS.

Sin emulador ni PAIR; falta comprobar el refresco del visor entre dos sesiones/dispositivos reales.
