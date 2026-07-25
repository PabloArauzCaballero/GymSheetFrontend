# Integración externa

No existe una integración identificada como WorkoutKata en el código o configuración.
La fuente implementada es `hasaneyldrm/exercises-dataset` y está aislada en client,
schemas Zod, service y repository. Descarga una instantánea HTTPS desde host permitido,
valida tamaño/tipo/estructura, normaliza, persiste por lotes y conserva external ID,
checksum, fuente y fecha de sincronización. Es idempotente y sirve desde PostgreSQL.

La importación está desactivada por defecto. La multimedia requiere confirmación explícita
de licencia. Endpoint: `POST /api/v1/admin/exercises/import/exercises-dataset`.
