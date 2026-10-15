# H8.S3.M3 — Reintento de subida idempotente (2026-10-10)

El cliente web y móvil envía `requestId` por multipart y conserva la misma selección de archivo/audiencia al reintentar. El backend guarda la clave acotada al autor junto con SHA-256 de los bytes y una restricción única. Repetir clave y contenido devuelve la story existente sin volver a cargar el objeto; reutilizarla con otro archivo responde 409. Una clave nueva o la misma clave de otro autor crea una story independiente.

## Verificación

- PostgreSQL 16 temporal aislado en `127.0.0.1:55432/gymsheet_social_qa`; `yarn migration:up` aplicó `202610100004-story-upload-idempotency`.
- `yarn test:e2e --runTestsByPath test/social/historias.e2e-spec.ts -t 'H8.S3.M3' --runInBand` — PASS 1/1; revisa retry, audiencia persistida, conflicto por contenido distinto, clave nueva y alcance por owner.
- Backend: `yarn type-check`, ESLint focal y `git diff --check` PASS.
- Web: type-check, ESLint focal y pruebas del servicio de stories + lifecycle, 5/5 PASS. Móvil: type-check, ESLint focal y pruebas AppState de lifecycle 3/3 PASS.

La acción “Reintentar subida” conserva el intento durante la sesión actual. No hubo PAIR ni prueba de corte de red en dispositivo; la idempotencia se verificó repitiendo la petición HTTP en PostgreSQL local.
